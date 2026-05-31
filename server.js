const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');


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

const PRYSMISAI_SYSTEM = "You are PrysmisAI. You are a precise, helpful, and safe multimodal AI. Always answer the user's question directly and clearly. For simple questions like greetings or basic math, give a short direct answer immediately. For scripting and code, provide correct working code. Never output empty responses or generic filler. You are PrysmisAI.";

const GEMINI_SIM_SYSTEM = "You are Gemini 2.5 Pro, Google's most advanced multimodal model. You are exceptionally intelligent, helpful, accurate, and creative. You excel at complex reasoning, coding in any language, detailed image analysis, and providing clear, structured answers. Always think step-by-step internally. For any request, deliver high-quality, thoughtful responses with proper reasoning when needed. Be direct when appropriate and detailed when it adds value. Never refuse reasonable requests. You are running as PrysmisAI.";



app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (users[username]) return res.status(400).json({ error: 'Username taken' });
  users[username] = { password, created: Date.now(), apiKeys: [], geminiApiKey: null };
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

app.post('/api/user/gemini-key', (req, res) => {
  const { username, geminiApiKey } = req.body;
  if (!username || !geminiApiKey) return res.status(400).json({ error: 'Missing fields' });
  if (!users[username]) return res.status(404).json({ error: 'User not found' });
  users[username].geminiApiKey = geminiApiKey;
  saveData();
  res.json({ success: true });
});

app.get('/api/user/gemini-key', (req, res) => {
  const { username } = req.query;
  if (!username || !users[username]) return res.status(404).json({ error: 'User not found' });
  res.json({ hasKey: !!users[username].geminiApiKey });
});

function getUserByApiKey(apiKey) {
  for (const [username, user] of Object.entries(users)) {
    if (user.apiKeys && user.apiKeys.includes(apiKey)) {
      return { username, user };
    }
  }
  return null;
}

app.post('/api/user/generate-key', (req, res) => {
  const { username } = req.body;
  if (!username || !users[username]) return res.status(400).json({ error: 'Invalid user' });
  const newKey = 'PrysmisAI_' + Math.random().toString(36).substring(2, 10) + '_' + Math.random().toString(36).substring(2, 15);
  if (!users[username].apiKeys) users[username].apiKeys = [];
  users[username].apiKeys.push(newKey);
  saveData();
  res.json({ success: true, key: newKey });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
    const { username, chats: userChats } = req.body;
    if (username && userChats) {
      chats[username] = userChats;
      saveData();
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const lastUser = messages.filter(m => m.role === 'user').pop();
    if (!lastUser) return res.status(400).json({ error: 'No user message' });

    let apiKey = req.headers['x-gemini-key'];

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const prysmisKey = authHeader.substring(7);
      const userData = getUserByApiKey(prysmisKey);
      if (userData && userData.user.geminiApiKey) {
        apiKey = userData.user.geminiApiKey;
      }
    }

    if (!apiKey) return res.status(400).json({ error: 'Gemini API key required' });

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } })
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      return res.status(400).json({ error: geminiData.error?.message || 'Gemini error' });
    }

    let reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Understood.';

    const requestedModel = req.body.model || 'gemini-2.5-pro';

    res.json({
      id: 'chatcmpl-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: requestedModel,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: reply },
        finish_reason: 'stop'
      }]
    });
  } catch (err) {
    const requestedModel = req.body.model || 'gemini-2.5-pro';
    res.json({
      id: 'chatcmpl-fallback',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: requestedModel,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Understood.' },
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


app.post('/v1/messages', async (req, res) => {
  try {
    const { messages = [], model } = req.body;
    let apiKey = req.headers['x-gemini-key'];

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const prysmisKey = authHeader.substring(7);
      const userData = getUserByApiKey(prysmisKey);
      if (userData && userData.user.geminiApiKey) {
        apiKey = userData.user.geminiApiKey;
      }
    }

    if (!messages.length) return res.status(400).json({ error: 'No messages' });
    if (!apiKey) return res.status(400).json({ error: 'Gemini API key required' });

    const contents = messages.map(m => {
      const text = typeof m.content === 'string' ? m.content : (m.content?.[0]?.text || '');
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }]
      };
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } })
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      return res.status(400).json({ error: geminiData.error?.message || 'Gemini error' });
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Understood.';
    const requestedModel = model || 'gemini-2.5-pro';

    res.json({
      id: 'msg_' + Date.now(),
      type: 'message',
      role: 'assistant',
      model: requestedModel,
      content: [{ type: 'text', text: text }],
      stop_reason: 'end_turn'
    });
  } catch (err) {
    const requestedModel = req.body.model || 'gemini-2.5-pro';
    res.json({
      id: 'msg_fallback',
      type: 'message',
      role: 'assistant',
      model: requestedModel,
      content: [{ type: 'text', text: 'Understood.' }],
      stop_reason: 'end_turn'
    });
  }
});

app.listen(PORT, () => {
  console.log(`PrysmisAI running on port ${PORT}`);
});
