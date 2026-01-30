const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let currentStatus = { status: "idle" };

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (parsed.pathname === '/sync') {
        if (parsed.query.status) {
            currentStatus.status = parsed.query.status;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(currentStatus));
        }
    } else {
        fs.readFile(path.join(__dirname, 'sync.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data || 'Page not found');
        });
    }
});

server.listen(process.env.PORT || 80);
