const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('@xenova/transformers');

const app = express();
const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (preventing crash):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection (preventing crash):', reason);
});

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
let modelLoadAttempted = false;

async function loadModel() {
  if (modelLoadAttempted) return generator;
  modelLoadAttempted = true;

  try {
    console.log('Loading embedded model...');
    generator = await pipeline('text-generation', 'Xenova/LaMini-GPT-124M', { quantized: true });
    console.log('Model ready.');
  } catch (e) {
    console.error('Failed to load embedded model. Using fallback responses only.', e.message);
    generator = null;
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
    const { message, history = [], username, agent } = req.body;
    const gen = await loadModel();
    let reply = "Understood. What else can I assist with?";

    const baseSystem = "You are PrysmisAI, a precise professional assistant. Always reply in perfect clear English. Be direct, helpful and complete. Never repeat phrases or sentences. For homework or learning topics give structured step-by-step explanations with examples when useful. Stay focused on the question.";
    const agentPrompts = {
      'UI Build': " Expert modern UI developer. Create clean production Tailwind CSS or HTML/JS components and layouts. Prioritize accessibility, responsiveness and visual polish. Provide the complete code ready to use after a short explanation.",
      'Map Build': " Expert in interactive maps and geospatial. Use Leaflet, Mapbox or Google Maps. Deliver accurate working code snippets and integration guidance with clear steps.",
      'scripting': " Senior automation and scripting specialist. Write efficient secure correct scripts in Python, JavaScript, Bash or Lua. Focus on practicality, error handling and clarity."
    };
    const system = baseSystem + (agentPrompts[agent] ? " " + agentPrompts[agent] : "");

    if (gen) {
      let prompt = `System: ${system}\n\n`;
      if (history.length) {
        history.forEach(h => {
          prompt += h.role === 'user' ? `User: ${h.content}\n` : `Assistant: ${h.content}\n`;
        });
      }
      prompt += `User: ${message}\nAssistant:`;

      try {
        const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 22000));
        const genPromise = gen(prompt, {
          max_new_tokens: 140,
          temperature: 0.65,
          do_sample: true,
          top_p: 0.88,
          repetition_penalty: 1.25,
          return_full_text: false
        });
        const result = await Promise.race([genPromise, timeoutPromise]);
        let raw = (result && result[0] && result[0].generated_text) ? result[0].generated_text.trim() : "";
        reply = raw || reply;
        reply = reply.replace(/^(Assistant:|System:|User:)\s*/i, "").trim();
        reply = reply.split(/\n(User:|System:)/i)[0].trim();
        reply = reply.replace(/<\|endoftext\|>/g, "").replace(/<\|.*?\|>/g, "").trim();
        if (reply.length < 3) reply = "Understood. How else can I help you today?";
        const sentences = reply.split(/[.!?]+/).filter(s => s.trim().length > 8);
        if (sentences.length > 1) {
          const last = sentences[sentences.length-1].trim().toLowerCase();
          if (sentences.some((s,i) => i < sentences.length-1 && s.trim().toLowerCase() === last)) {
            reply = sentences.slice(0, -1).join('. ') + '.';
          }
        }
      } catch (e) {
        if (e.message === 'timeout') {
          reply = "The model is still warming up. Please send your message again in a moment.";
        }
      }
    }

    if (username) {
      chats[username] = chats[username] || [];
      chats[username].push({ role: 'user', content: message });
      chats[username].push({ role: 'assistant', content: reply });
      saveData();
    }

    res.json({ reply });
  } catch (err) {
    res.json({ reply: "The model is warming up. Please try your message again shortly." });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const lastUser = messages.filter(m => m.role === 'user').pop();
    if (!lastUser) return res.status(400).json({ error: 'No user message' });

    const gen = await loadModel();
    let reply = "Understood. What else can I assist with?";

    const baseSystem = "You are PrysmisAI, a precise professional assistant. Always reply in perfect clear English. Be direct, helpful and complete. Never repeat phrases or sentences. For homework or learning topics give structured step-by-step explanations with examples when useful. Stay focused on the question.";

    if (gen) {
      let prompt = `System: ${baseSystem}\n\n`;
      messages.forEach(m => {
        prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
      });
      prompt += 'Assistant:';

      try {
        const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 22000));
        const genPromise = gen(prompt, {
          max_new_tokens: 160,
          temperature: 0.65,
          do_sample: true,
          top_p: 0.88,
          repetition_penalty: 1.25,
          return_full_text: false
        });
        const result = await Promise.race([genPromise, timeoutPromise]);
        let raw = (result && result[0] && result[0].generated_text) ? result[0].generated_text.trim() : "";
        reply = raw || reply;
        reply = reply.replace(/^(Assistant:|System:|User:)\s*/i, "").trim();
        reply = reply.split(/\n(User:|System:)/i)[0].trim();
        reply = reply.replace(/<\|endoftext\|>/g, "").replace(/<\|.*?\|>/g, "").trim();
        if (reply.length < 3) reply = "Understood. How else can I help you today?";
      } catch (e) {
        if (e.message === 'timeout') reply = "The model is still warming up. Please try again shortly.";
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
    res.status(200).json({
      id: 'prysmisai-fallback',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'prysmisai-fallback',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: "The model is warming up. Please try again shortly." },
        finish_reason: 'stop'
      }]
    });
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

app.get('/chat/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get(/^\/(chat|create|logout)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/v1/') || req.path === '/health' || req.path.startsWith('/dashboard')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PrysmisAI running on port ${PORT}`);
});
