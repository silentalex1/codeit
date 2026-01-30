const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let store = { status: "idle" };

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (parsedUrl.pathname === '/sync') {
        if (parsedUrl.query.status) {
            store.status = parsedUrl.query.status;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(store));
        }
    } else if (parsedUrl.pathname === '/sync.html' || parsedUrl.pathname === '/') {
        fs.readFile(path.join(__dirname, 'sync.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
});

server.listen(80);
