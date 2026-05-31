const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('@xenova/transformers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

let users = {};
let chats = {};

function loadData() {
  try {
    if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (fs.existsSync(CHATS_FILE)) chats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
  } catch (e) {}
}

function saveData() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
}

loadData();

let generator = null;
async function loadModel() {
  if (!generator) {
    try {
      console.log('Loading embedded model...');
      generator = await pipeline('text-generation', 'Xenova/distilgpt2', { quantized: true });
      console.log('Model ready.');
    } catch (e) {
      console.error('Failed to load embedded model:', e.message);
      generator = null; // allow fallback
    }
  }
  return generator;
}

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (users[username]) return res.status(400).json({ error: 'Username taken' });
  users[username] = { password, created: Date.now() };
  chats[username] = chats[username] || [];
  saveData();
  res.json({ success: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!users[username] || users[username].password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ success: true, username });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', modelLoaded: !!generator });
});

app.get('/api/chats/:username', (req, res) => {
  const { username } = req.params;
  res.json(chats[username] || []);
});

app.post('/api/chats/:username', (req, res) => {
  const { username } = req.params;
  chats[username] = req.body.chats || [];
  saveData();
  res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], username } = req.body;
    const gen = await loadModel();
    let reply = "Got it. How else can I help?";

    if (gen) {
      let prompt = '';
      if (history.length) {
        history.forEach(h => {
          prompt += h.role === 'user' ? `User: ${h.content}\n` : `Assistant: ${h.content}\n`;
        });
      }
      prompt += `User: ${message}\nAssistant:`;

      try {
        const result = await gen(prompt, {
          max_new_tokens: 180,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
          repetition_penalty: 1.15,
          return_full_text: false
        });
        reply = result[0].generated_text.trim() || reply;
      } catch (e) {
        console.error('Generation failed:', e.message);
      }
    }

    // Save to user history if username provided
    if (username) {
      chats[username] = chats[username] || [];
      chats[username].push({ role: 'user', content: message });
      chats[username].push({ role: 'assistant', content: reply });
      saveData();
    }

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.json({ reply: "Sorry, something went wrong. Please try again." });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  const fastUrl = process.env.FAST_INFERENCE_URL;
  const fastKey = process.env.FAST_INFERENCE_API_KEY;

  if (fastUrl) {
    try {
      const targetUrl = fastUrl.endsWith('/v1/chat/completions') 
        ? fastUrl 
        : `${fastUrl.replace(/\/$/, '')}/v1/chat/completions`;

      const headers = {
        'Content-Type': 'application/json',
        ...(fastKey && { 'Authorization': `Bearer ${fastKey}` })
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body)
      });

      res.status(response.status);

      if (req.body.stream) {
        response.body.pipe(res);
      } else {
        const data = await response.json();
        res.json(data);
      }
      return;
    } catch (err) {
      return res.status(502).json({ error: 'Fast inference backend error' });
    }
  }

  try {
    const { messages = [] } = req.body;
    const lastUser = messages.filter(m => m.role === 'user').pop();
    if (!lastUser) return res.status(400).json({ error: 'No user message' });

    const gen = await loadModel();
    let reply = "Got it. How else can I help?";

    if (gen) {
      let prompt = '';
      messages.forEach(m => {
        prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
      });
      prompt += 'Assistant:';

      try {
        const result = await gen(prompt, {
          max_new_tokens: 256,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.92,
          repetition_penalty: 1.15,
          return_full_text: false
        });
        reply = result[0].generated_text.trim() || reply;
      } catch (e) {
        console.error('Generation failed:', e.message);
      }
    }

    res.json({
      id: 'prysmisai-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'prysmisai-embedded',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: reply },
        finish_reason: 'stop'
      }]
    });
  } catch (err) {
    res.status(500).json({ error: 'Model error' });
  }
});

app.get('/dashboard/platform', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'platform.html'));
});

app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

app.get('/logout', (req, res) => {
  res.redirect('/create');
});

app.get('/chat/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get(/^\/(chat|create|logout)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PrysmisAI running on port ${PORT}`);
});
