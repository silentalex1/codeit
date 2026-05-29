const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
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
    res.json({ status: pluginStatus, bookmarklet: bookmarkletConnected, tree: studioTree });
});

app.post('/status', (req, res) => {
    if (req.body) {
        if (req.body.status) pluginStatus = req.body.status;
        if (req.body.tree) studioTree = req.body.tree;
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
        res.json({ code: codeToSend });
    } else {
        res.json({});
    }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {});
