const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const DB_FILE = './users.json';

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(DB_FILE));

    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username taken' });
    }

    users.push({ username, password, history: [] });
    fs.writeFileSync(DB_FILE, JSON.stringify(users));
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(DB_FILE));
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) return res.status(401).json({ error: 'Invalid details' });
    res.json({ success: true, username: user.username });
});

app.listen(3000, () => console.log('Server running on port 3000'));
