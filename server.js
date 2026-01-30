const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let bridgeState = { status: "idle" };

const server = http.createServer((req, res) => {
    const queryData = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (queryData.pathname === '/sync') {
        if (queryData.query.status) {
            bridgeState.status = queryData.query.status;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } else {const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let bridgeState = { status: "idle" };

const server = http.createServer((req, res) => {
    const queryData = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (queryData.pathname === '/sync.html') {
        if (queryData.query.status) {
            bridgeState.status = queryData.query.status;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(bridgeState));
        }
    } else {
        fs.readFile(path.join(__dirname, 'sync.html'), (err, content) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content || 'File not found');
        });
    }
});

server.listen(process.env.PORT || 80);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(bridgeState));
        }
    } else {
        fs.readFile(path.join(__dirname, 'sync.html'), (err, content) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
    }
});

server.listen(process.env.PORT || 80);
