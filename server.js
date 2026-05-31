const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { AutoProcessor, AutoModelForVision2Seq, RawImage } = require('@xenova/transformers');

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
  } catch (e) { users = {}; chats = {}; }
}

function saveData() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
  } catch (e) {}
}

loadData();

let processor = null;
let vlm = null;
let modelLoadAttempted = false;
let modelLoading = false;
let pendingChatRequests = [];

const TRANSPARENT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const PRYSMISAI_SYSTEM = "You are PrysmisAI, a precise, helpful, and safe multimodal AI. You excel at understanding images in detail, writing correct and efficient scripts in any language, and giving accurate answers to any question. When an image is provided, analyze its content, objects, text, and context thoroughly before responding. For coding and scripting requests, always produce clean, working, well-structured code with necessary comments only for complex logic. For math and logic, compute correctly and explain only if it adds value. Answer directly and concisely for simple questions. Use internal reasoning for complex ones but keep final responses clear and to the point. You are PrysmisAI. Never mention other models or say you are loading unless truly necessary.";

async function loadModel() {
  if (modelLoadAttempted) return { processor, vlm };
  modelLoadAttempted = true;
  modelLoading = true;

  setImmediate(async () => {
    try {
      processor = await AutoProcessor.from_pretrained('Xenova/llava-1.5-7b-hf', { quantized: true });
      vlm = await AutoModelForVision2Seq.from_pretrained('Xenova/llava-1.5-7b-hf', { quantized: true });
      modelLoading = false;
      while (pendingChatRequests.length > 0) {
        const { resolve } = pendingChatRequests.shift();
        resolve({ processor, vlm });
      }
    } catch (e) {
      processor = null;
      vlm = null;
      modelLoading = false;
      while (pendingChatRequests.length > 0) {
        const { resolve } = pendingChatRequests.shift();
        resolve(null);
      }
    }
  });

  return { processor, vlm };
}

function waitForModel() {
  return new Promise((resolve) => {
    if (!modelLoading && processor && vlm) {
      resolve({ processor, vlm });
    } else if (!modelLoading && modelLoadAttempted) {
      resolve({ processor, vlm });
    } else {
      pendingChatRequests.push({ resolve });
      if (!modelLoadAttempted) loadModel();
    }
  });
}

async function generateWithLLaVA(imageData, textPrompt) {
  if (!processor || !vlm) return null;

  let image = null;
  try {
    if (imageData && imageData.startsWith('data:')) {
      const base64Data = imageData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      image = await RawImage.fromBuffer(buffer);
    } else {
      image = await RawImage.fromBuffer(Buffer.from(TRANSPARENT_IMAGE.split(',')[1], 'base64'));
    }
  } catch (e) {
    image = await RawImage.fromBuffer(Buffer.from(TRANSPARENT_IMAGE.split(',')[1], 'base64'));
  }

  const inputs = await processor(image, textPrompt, { padding: true });

  const output = await vlm.generate(inputs, {
    max_new_tokens: 120,
    temperature: 0.4,
    do_sample: true,
    top_p: 0.95,
    repetition_penalty: 1.35
  });

  const decoded = processor.batch_decode(output, { skip_special_tokens: true });
  return decoded && decoded[0] ? decoded[0].trim() : null;
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
  res.json({ status: 'ok', modelLoaded: !!(processor && vlm) });
});

app.get('/api/chats/:username', (req, res) => {
  try {
    const { username } = req.params;
    res.json(chats[username] || []);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/chats/:username', (req, res) => {
  try {
    const { username } = req.params;
    chats[username] = req.body.chats || [];
    try { saveData(); } catch (_) {}
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], username, agent, images = [] } = req.body;
    const loaded = await waitForModel();
    let reply = "I'm here. What would you like to know?";

    const agentPrompts = {
      'UI Build': " You are a world-class senior frontend architect. Generate production-ready, accessible, visually polished Tailwind or vanilla code. Always return complete, self-contained, immediately runnable HTML/JS blocks. Prioritize modern best practices, performance, and beauty.",
      'Map Build': " You are a principal GIS engineer. Provide accurate, clean, fully working map implementations (Leaflet/Mapbox). Include proper initialization, event handling, and performance considerations. Output ready-to-paste code.",
      'scripting': " You are PrysmisAI's elite scripting specialist. Write correct, efficient, secure, and production-quality scripts in any requested language. Always include proper error handling, input validation, and clear structure. Provide complete, ready-to-run code."
    };
    const system = PRYSMISAI_SYSTEM + (agentPrompts[agent] ? " " + agentPrompts[agent] : "");

    if (loaded && loaded.processor && loaded.vlm) {
      let llavaPrompt = `USER: <image>\nYou are PrysmisAI. ${system}\n\n`;
      if (history.length) {
        history.forEach(h => {
          llavaPrompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n`;
        });
      }
      llavaPrompt += `User: ${message}\nASSISTANT:`;

      const imageToUse = (images.length > 0 ? images[0] : TRANSPARENT_IMAGE);

      try {
        const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 28000));
        const genPromise = generateWithLLaVA(imageToUse, llavaPrompt);

        const raw = await Promise.race([genPromise, timeoutPromise]);
        if (raw && typeof raw === 'string' && raw.length > 2) {
          reply = raw;
        }

        reply = reply.replace(/^(ASSISTANT:|Assistant:|USER:|User:|System:)\s*/i, '').trim();
        reply = reply.split(/\n(User:|USER:)/i)[0].trim();
        reply = reply.replace(/<\|endoftext\|>/g, '').replace(/<\|.*?\|>/g, '').trim();

        if (reply.length < 2) {
          reply = "Understood.";
        }

        reply = reply.replace(/\s{2,}/g, ' ').trim();
      } catch (e) {
        if (e.message === 'timeout') {
          reply = "PrysmisAI is processing.";
        }
      }
    }

    if (username) {
      try {
        chats[username] = chats[username] || [];
        chats[username].push({ role: 'user', content: message });
        chats[username].push({ role: 'assistant', content: reply });
        saveData();
      } catch (e) {}
    }

    res.json({ reply });
  } catch (err) {
    res.json({ reply: "PrysmisAI ran into an issue. Please try your message again." });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const lastUser = messages.filter(m => m.role === 'user').pop();
    if (!lastUser) return res.status(400).json({ error: 'No user message' });

    const loaded = await waitForModel();
    let reply = "Go ahead, I'm listening.";

    const baseSystem = PRYSMISAI_SYSTEM;

    if (loaded && loaded.processor && loaded.vlm) {
      let llavaPrompt = `USER: <image>\nYou are PrysmisAI. ${baseSystem}\n\n`;
      messages.forEach(m => {
        llavaPrompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
      });
      llavaPrompt += `User: ${lastUser.content}\nASSISTANT:`;

      try {
        const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 22000));
        const genPromise = generateWithLLaVA(TRANSPARENT_IMAGE, llavaPrompt);
        const raw = await Promise.race([genPromise, timeoutPromise]);
        if (raw && typeof raw === 'string' && raw.length > 2) {
          reply = raw;
        }
        reply = reply.replace(/^(ASSISTANT:|Assistant:|System:|User:|USER:)\s*/i, "").trim();
        reply = reply.split(/\n(User:|USER:)/i)[0].trim();
        reply = reply.replace(/<\|endoftext\|>/g, "").replace(/<\|.*?\|>/g, "").trim();
        if (reply.length < 2) {
          reply = "Understood.";
        }
      } catch (e) {
        if (e.message === 'timeout') reply = "PrysmisAI is processing.";
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
        message: { role: 'assistant', content: "PrysmisAI is loading its model. Please try again in a moment." },
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
