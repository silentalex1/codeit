const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let db = { status: "idle" };

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (parsed.pathname === '/sync') {
        if (parsed.query.status) {
            db.status = parsed.query.status;
            res.end(JSON.stringify({ ok: true }));
        } else {
            res.end(JSON.stringify(db));
        }
    } else if (parsed.pathname === '/sync.html') {
        fs.readFile(path.join(__dirname, 'sync.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
});

server.listen(80);
