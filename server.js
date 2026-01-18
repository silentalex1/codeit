const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(express.json({ limit: '50mb' }));
app.use(cors());

const initDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }));
    }
};
initDB();

const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));

app.post('/api/auth', (req, res) => {
    const { username, password, type } = req.body;
    let db = readDB();

    if (type === 'register') {
        if (db.users[username]) return res.status(400).json({ error: 'User exists' });
        db.users[username] = {
            password,
            settings: { nickname: username, pfp: '', workMode: false, hideSidebar: false },
            history: []
        };
        writeDB(db);
        return res.json({ success: true, user: db.users[username] });
    } else {
        const user = db.users[username];
        if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid' });
        return res.json({ success: true, user });
    }
});

app.post('/api/update', (req, res) => {
    const { username, settings, history } = req.body;
    let db = readDB();
    if (!db.users[username]) return res.status(404).json({ error: 'No user' });
    
    if (settings) db.users[username].settings = settings;
    if (history) db.users[username].history = history;
    
    writeDB(db);
    res.json({ success: true });
});

app.get('/api/user/:username', (req, res) => {
    const db = readDB();
    const user = db.users[req.params.username];
    if (!user) return res.status(404).json({ error: 'No user' });
    res.json(user);
});

app.listen(PORT, () => {});
