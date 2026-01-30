const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.json());
app.use(express.static(__dirname));

app.post('/sync', (req, res) => {
    io.emit('update', req.body.msg);
    res.status(200).json({ success: true });
});

app.get('/sync', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

http.listen(80, () => {
    console.log('Server active');
});
