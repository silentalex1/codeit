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
  } catch (e) { users = {}; chats = {}; }
}

function saveData() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
  } catch (e) {}
}

loadData();

let generator = null;
let modelLoadAttempted = false;
let modelLoading = false;
let pendingChatRequests = [];

async function loadModel() {
  if (modelLoadAttempted) return generator;
  modelLoadAttempted = true;
  modelLoading = true;

  // Start loading in a non-blocking way
  setImmediate(async () => {
    try {
      console.log('Loading embedded model in background...');
      generator = await pipeline('image-to-text', 'Xenova/llava-1.5-7b-hf', { quantized: true });
      console.log('Model ready.');
      modelLoading = false;
      // Process any queued chat requests
      while (pendingChatRequests.length > 0) {
        const { resolve } = pendingChatRequests.shift();
        resolve(generator);
      }
    } catch (e) {
      console.error('Failed to load embedded model. Using fallback responses only.', e.message);
      generator = null;
      modelLoading = false;
      while (pendingChatRequests.length > 0) {
        const { resolve } = pendingChatRequests.shift();
        resolve(null);
      }
    }
  });

  return generator;
}

function waitForModel() {
  return new Promise((resolve) => {
    if (!modelLoading && generator !== null) {
      resolve(generator);
    } else if (!modelLoading && modelLoadAttempted) {
      resolve(generator);
    } else {
      pendingChatRequests.push({ resolve });
      if (!modelLoadAttempted) loadModel();
    }
  });
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
    const gen = await waitForModel();
    let reply = "Understood. What else can I assist with?";

    const baseSystem = "You are PrysmisAI, a highly intelligent, precise, and professional AI. Always reason step-by-step internally before responding. Deliver answers in clear, elegant, natural English. Be maximally helpful, accurate, and concise. For technical, math, coding, or educational questions provide structured reasoning with examples. Anticipate follow-up needs. Never hallucinate facts. If uncertain, say so clearly.";
    const agentPrompts = {
      'UI Build': " You are a world-class senior frontend architect. Generate production-ready, accessible, visually polished Tailwind or vanilla code. Always return complete, self-contained, immediately runnable HTML/JS blocks. Prioritize modern best practices, performance, and beauty.",
      'Map Build': " You are a principal GIS engineer. Provide accurate, clean, fully working map implementations (Leaflet/Mapbox). Include proper initialization, event handling, and performance considerations. Output ready-to-paste code.",
      'scripting': " You are a distinguished automation and backend engineer. Produce robust, secure, well-architected scripts with excellent error handling, logging, and edge-case coverage. Favor clarity and maintainability."
    };
    const system = baseSystem + (agentPrompts[agent] ? " " + agentPrompts[agent] : "");

    if (gen) {
      let prompt = `USER: `;
      if (images.length > 0) {
        prompt += `<image>\n`;
      }
      prompt += `${system}\n\n`;
      if (history.length) {
        history.forEach(h => {
          prompt += h.role === 'user' ? `User: ${h.content}\n` : `Assistant: ${h.content}\n`;
        });
      }
      prompt += `Question: ${message}\nASSISTANT:`;

      try {
        const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 28000));
        let genPromise;
        if (images.length > 0) {
          const imageBase64 = images[0];
          genPromise = gen(imageBase64, {
            prompt: prompt,
            max_new_tokens: 160,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.2,
            return_full_text: false
          });
        } else {
          genPromise = gen(prompt, {
            max_new_tokens: 160,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.2,
            return_full_text: false
          });
        }
        const result = await Promise.race([genPromise, timeoutPromise]);
        let raw = (result && result[0] && (result[0].generated_text || result[0].text)) ? (result[0].generated_text || result[0].text).trim() : "";
        reply = raw || reply;
        reply = reply.replace(/^(ASSISTANT:|Assistant:|System:|User:|USER:)\s*/i, "").trim();
        reply = reply.split(/\n(Question:|User:|USER:)/i)[0].trim();
        reply = reply.replace(/<\|endoftext\|>/g, "").replace(/<\|.*?\|>/g, "").trim();
        if (reply.length < 3) reply = "Understood. How else can I help you today?";
        reply = reply.replace(/\s{2,}/g, ' ').trim();
      } catch (e) {
        if (e.message === 'timeout') {
          reply = "PrysmisAI is still loading its vision model. Please send your message again shortly.";
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
    res.json({ reply: "PrysmisAI is warming up. Please try your message again shortly." });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const lastUser = messages.filter(m => m.role === 'user').pop();
    if (!lastUser) return res.status(400).json({ error: 'No user message' });

    const gen = await waitForModel();
    let reply = "Understood. What else can I assist with?";

    const baseSystem = "You are PrysmisAI, a highly intelligent, precise, and professional AI. Always reason step-by-step internally before responding. Deliver answers in clear, elegant, natural English. Be maximally helpful, accurate, and concise. For technical, math, coding, or educational questions provide structured reasoning with examples. Anticipate follow-up needs. Never hallucinate facts. If uncertain, say so clearly.";

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
        if (e.message === 'timeout') reply = "PrysmisAI is still loading. Please try again shortly.";
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
        message: { role: 'assistant', content: "PrysmisAI is warming up. Please try again shortly." },
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
