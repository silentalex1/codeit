const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const users = {};
let pluginStatus = 'none';
let pendingCode = null;
let bookmarkletConnected = false;
let studioTree = '';
let sharedScreen = '';
let activeAIModel = 'gemini-2.5 pro';

app.get('/bridge.html', (req, res) => {
    res.send("<!DOCTYPE html><html><head><script>window.addEventListener('message',async e=>{if(!e.data||!e.data.url)return;try{let r=await fetch(e.data.url,e.data.opts);let t=await r.text();e.source.postMessage({id:e.data.id,ok:r.ok,status:r.status,text:t},'*')}catch(err){e.source.postMessage({id:e.data.id,ok:false,error:err.message},'*')}});</script></head><body></body></html>");
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register-auth', (req, res) => {
    const u = req.body.username;
    const p = req.body.password;
    if (u && p) {
        if (users[u]) return res.json({ success: false });
        users[u] = p;
        return res.json({ success: true });
    }
    res.json({ success: false });
});

app.post('/login-auth', (req, res) => {
    const u = req.body.username;
    const p = req.body.password;
    if (users[u] && users[u] === p) {
        return res.json({ success: true });
    }
    res.json({ success: false });
});

app.post('/connect', (req, res) => {
    bookmarkletConnected = true;
    pluginStatus = 'pending';
    res.json({ success: true });
});

app.post('/plugin-connect', (req, res) => {
    res.json({ success: true });
});

app.get('/status', (req, res) => {
    res.json({ status: pluginStatus, bookmarklet: bookmarkletConnected, tree: studioTree, screen: sharedScreen, model: activeAIModel });
});

app.post('/status', (req, res) => {
    if (req.body) {
        if (req.body.status) pluginStatus = req.body.status;
        if (req.body.tree) studioTree = req.body.tree;
        if (req.body.screen) sharedScreen = req.body.screen;
        if (req.body.activeModel) activeAIModel = req.body.activeModel;
    }
    res.json({ success: true });
});

app.post('/apply', (req, res) => {
    if (req.body && req.body.code) {
        pendingCode = req.body.code;
    }
    res.json({ success: true });
});

app.get('/poll', (req, res) => {
    if (pendingCode) {
        const codeToSend = pendingCode;
        pendingCode = null;
        res.json({ code: codeToSend, model: activeAIModel });
    } else {
        res.json({ model: activeAIModel });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const fetchRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=' + req.query.key, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await fetchRes.json();
        res.status(fetchRes.status).json(data);
    } catch (e) {
        res.status(500).json({ error: { message: 'Proxy Error' } });
    }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {});
