const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const USERS_FILE = path.join(DATA_DIR, 'users.json');
let users = new Map();

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      users = new Map(Object.entries(raw));
    }
  } catch {}
}
function saveUsers() {
  const obj = {};
  users.forEach((v, k) => { obj[k] = v; });
  fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2));
}
loadUsers();

function getOrCreateUser(username) {
  if (!username) username = 'guest';
  if (!users.has(username)) {
    users.set(username, { username, geminiApiKey: '', prysmisKeys: [], createdAt: Date.now() });
    saveUsers();
  }
  return users.get(username);
}
function findUserByPrysmisKey(key) {
  for (const u of users.values()) {
    if (u.prysmisKeys && u.prysmisKeys.includes(key)) return u;
  }
  return null;
}
function resolveGeminiKey(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer PrysmisAI_')) {
    const k = auth.slice(7).trim();
    const u = findUserByPrysmisKey(k);
    return u && u.geminiApiKey ? u.geminiApiKey : null;
  }
  const direct = req.headers['x-gemini-key'];
  if (direct) return direct;
  const userHeader = req.headers['x-prysmis-user'];
  if (userHeader) {
    const u = getOrCreateUser(userHeader);
    return u.geminiApiKey || null;
  }
  return null;
}
function getCurrentUser(req) {
  const userHeader = req.headers['x-prysmis-user'];
  if (userHeader) return getOrCreateUser(userHeader);
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer PrysmisAI_')) {
    return findUserByPrysmisKey(auth.slice(7).trim());
  }
  return null;
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

function optimizeContext(messages, max = 40) {
  if (messages.length <= max) return messages;
  const system = messages.filter(m => m.role === 'system');
  const rest = messages.filter(m => m.role !== 'system');
  return [...system, ...rest.slice(-(max - system.length))];
}

function toGeminiContents(messages, pendingImages = []) {
  const contents = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts = [];
    if (typeof m.content === 'string') {
      if (m.content) parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p.type === 'text' && p.text) parts.push({ text: p.text });
        if (p.type === 'image_url' && p.image_url && p.image_url.url && p.image_url.url.startsWith('data:')) {
          const [meta, b64] = p.image_url.url.split(',');
          const mime = meta.match(/data:(.*?);/) ? meta.match(/data:(.*?);/)[1] : 'image/png';
          parts.push({ inlineData: { mimeType: mime, data: b64 } });
        }
      }
    }
    if (parts.length) contents.push({ role, parts });
  }
  if (pendingImages.length && contents.length) {
    const last = contents[contents.length - 1];
    if (last.role === 'user') {
      for (const img of pendingImages) {
        const b64 = img.startsWith('data:') ? img.split(',')[1] : img;
        const mime = img.startsWith('data:') ? (img.split(';')[0].split(':')[1] || 'image/png') : 'image/png';
        last.parts.push({ inlineData: { mimeType: mime, data: b64 } });
      }
    }
  }
  return contents;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url, init, maxRetries = 4) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < maxRetries) {
          const jitter = Math.random() * 300;
          const backoff = Math.floor(Math.pow(2, attempt) * 600 + jitter);
          await sleep(backoff);
          continue;
        }
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < maxRetries) {
        const jitter = Math.random() * 300;
        const backoff = Math.floor(Math.pow(2, attempt) * 500 + jitter);
        await sleep(backoff);
        continue;
      }
    }
  }
  throw lastErr || new Error('Gemini request failed after retries');
}

async function callGemini(apiKey, messages, systemPrompt, model, temperature, maxTokens, stream) {
  const optimized = optimizeContext(messages);
  const contents = toGeminiContents(optimized);
  const body = {
    contents,
    generationConfig: {
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxTokens ?? 8192,
      topP: 0.95
    }
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  const m = (model || 'gemini-2.5-pro').replace('models/', '');
  const endpoint = `${GEMINI_ENDPOINT}/${m}:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`;

  const res = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 400)}`);
  }
  if (!stream) {
    const data = await res.json();
    const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts)
      ? data.candidates[0].content.parts.map(p => p.text || '').join('')
      : '';
    return { text, raw: data };
  }
  return res;
}

async function streamGeminiToSSE(apiKey, messages, systemPrompt, images, res, customFormat = false) {
  const gemRes = await callGemini(apiKey, messages, systemPrompt, 'gemini-2.5-pro', 0.7, 8192, true);
  if (!gemRes.body) {
    res.write(`data: ${JSON.stringify(customFormat ? { type: 'done' } : { choices: [{ delta: {} }] })}\n\n`);
    return;
  }
  const reader = gemRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const j = JSON.parse(t);
        const text = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts)
          ? j.candidates[0].content.parts.map(p => p.text || '').join('')
          : '';
        if (text) {
          if (customFormat) {
            res.write(`data: ${JSON.stringify({ type: 'token', content: text })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
          }
        }
      } catch {}
    }
  }
  if (customFormat) {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } else {
    res.write('data: [DONE]\n\n');
  }
}

const SYSTEM_PROMPT = `You are PrysmisAI, an elite AI for Roblox game development powered by Gemini 2.5 Pro.

Core rules:
- Deliver production-ready Luau code with zero comments.
- Prioritize security, performance, clean architecture, anti-exploit measures.
- Use modern Luau: task, buffer, vector, strict typing, ModuleScripts, proper replication.
- When images are provided, analyze every detail and provide exact recreation or improvement steps in Luau.
- Be direct, professional, no emojis, no hedging.

For any Roblox task give complete working code ready to paste. For general questions give precise actionable answers.`;

function getSystemPrompt(agent) {
  const base = `RULES:
- You are PrysmisAI powered by Gemini 2.5 Pro.
- Write all Luau code with zero comments.
- Never refuse image analysis.
- Be elite level, direct, professional. No emojis.`;
  if (agent === 'UI Designing') {
    return `You are PrysmisAI UI Design Agent powered by Gemini 2.5 Pro.\n\n${base}\n\nExpert at production ScreenGui, Frames, TextButtons, UICorner, UIStroke, TweenService, modern HUDs, menus, inventories.\nWhen given a screenshot deliver pixel-perfect Luau that recreates or improves it exactly.`;
  }
  if (agent === 'Map Designing') {
    return `You are PrysmisAI Map Design Agent powered by Gemini 2.5 Pro.\n\n${base}\n\nExpert at immersive performance-optimized Roblox worlds, terrain, lighting, VFX, player flow.\nGiven environment screenshots provide exact build instructions + terrain scripts in Luau.`;
  }
  if (agent === 'Scripting') {
    return `You are PrysmisAI Advanced Scripting Agent powered by Gemini 2.5 Pro.\n\n${base}\n\nExpert at large scale production systems: DataStore, Remotes, ProfileService style data, combat, matchmaking, anti-cheat, inventories.\nGiven code screenshots or descriptions deliver complete typed ModuleScript + server scripts with zero comments.`;
  }
  return `You are PrysmisAI, a highly intelligent Roblox development assistant powered by Gemini 2.5 Pro.\n\n${base}\n\nExcel at Luau scripting, UI, maps, systems, and technical problem solving.\nAnalyze any provided images in full detail.`;
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(path.join(__dirname, 'generated')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PrysmisAI' });
});

app.post('/api/auth/create', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const u = getOrCreateUser(username.trim());
  res.json({ ok: true, username: u.username });
});

app.post('/api/auth/register', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const u = getOrCreateUser(username.trim());
  res.json({ ok: true, username: u.username });
});

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const u = getOrCreateUser(username.trim());
  res.json({ ok: true, username: u.username, hasKey: !!u.geminiApiKey });
});

app.post('/api/user/gemini-key', (req, res) => {
  const { username, key } = req.body;
  if (!username || !key) return res.status(400).json({ error: 'username and key required' });
  const u = getOrCreateUser(username.trim());
  u.geminiApiKey = key.trim();
  saveUsers();
  res.json({ ok: true });
});

app.get('/api/user/gemini-key', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ hasKey: !!(user && user.geminiApiKey) });
});

app.post('/api/keys/generate', (req, res) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'auth required' });
  const newKey = 'PrysmisAI_' + randomUUID().replace(/-/g, '');
  if (!user.prysmisKeys) user.prysmisKeys = [];
  user.prysmisKeys.push(newKey);
  saveUsers();
  res.json({ key: newKey });
});

app.get('/api/keys', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ keys: user && user.prysmisKeys ? user.prysmisKeys : [] });
});

app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, history = [], agent = null, images = [] } = req.body;
    const user = getCurrentUser(req);
    const apiKey = user && user.geminiApiKey ? user.geminiApiKey : resolveGeminiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: 'No Gemini key saved for account. Enter it in the chat modal.' });
      return;
    }
    const systemPrompt = getSystemPrompt(agent);
    const openaiMessages = [];
    if (systemPrompt) openaiMessages.push({ role: 'system', content: systemPrompt });
    for (const h of history) {
      openaiMessages.push({ role: h.isUser ? 'user' : 'assistant', content: h.content });
    }
    if (message) openaiMessages.push({ role: 'user', content: message });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await streamGeminiToSSE(apiKey, openaiMessages, systemPrompt, images, res, true);
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message || 'error' });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages = [], model, temperature, max_tokens, stream } = req.body;
    const apiKey = resolveGeminiKey(req);
    if (!apiKey) return res.status(401).json({ error: { message: 'No Gemini API key. Use a valid PrysmisAI_ key or X-Gemini-Key header.' } });

    const sys = messages.find(m => m.role === 'system');
    const nonSys = messages.filter(m => m.role !== 'system');
    const sysPrompt = sys ? sys.content : getSystemPrompt(null);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      await streamGeminiToSSE(apiKey, nonSys, sysPrompt, [], res, false);
      res.end();
    } else {
      const out = await callGemini(apiKey, nonSys, sysPrompt, model || 'gemini-2.5-pro', temperature, max_tokens, false);
      res.json({
        id: 'chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model || 'gemini-2.5-pro',
        choices: [{ index: 0, message: { role: 'assistant', content: out.text }, finish_reason: 'stop' }]
      });
    }
  } catch (e) {
    res.status(502).json({ error: { message: e.message || 'proxy error' } });
  }
});

app.post('/v1/messages', async (req, res) => {
  try {
    const { messages = [], model, max_tokens, temperature, stream } = req.body;
    const apiKey = resolveGeminiKey(req);
    if (!apiKey) return res.status(401).json({ error: { message: 'No Gemini API key configured for this PrysmisAI key' } });

    const sys = messages.find(m => m.role === 'system');
    const nonSys = messages.filter(m => m.role !== 'system');
    const sysPrompt = sys ? sys.content : getSystemPrompt(null);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      await streamGeminiToSSE(apiKey, nonSys, sysPrompt, [], res, false);
      res.end();
    } else {
      const out = await callGemini(apiKey, nonSys, sysPrompt, model || 'gemini-2.5-pro', temperature, max_tokens, false);
      res.json({ id: 'msg_' + Date.now(), type: 'message', role: 'assistant', content: [{ type: 'text', text: out.text }], model: model || 'gemini-2.5-pro' });
    }
  } catch (e) {
    res.status(502).json({ error: { message: e.message } });
  }
});

app.get('/api/models', (req, res) => {
  res.json({ object: 'list', data: [{ id: 'gemini-2.5-pro', object: 'model', owned_by: 'google' }] });
});

app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'platform.html'));
});

app.get('/dashboard/platform.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'platform.html'));
});

// Catch-all for unknown API routes → proper JSON error (prevents HTML-in-JSON problems)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});
app.use('/v1', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PrysmisAI running on port ${PORT}`);
});
