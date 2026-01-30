const http = require('http');
const fs = require('fs');
const path = require('path');

let latestMsg = "Awaiting Data...";

const server = http.createServer((req, res) => {
    if (req.url === '/sync') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    latestMsg = data.msg;
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: true }));const http = require('http');
let state = { status: "idle" };

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'POST' && req.url === '/sync') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            state = JSON.parse(body);
            res.end(JSON.stringify({ok: true}));
        });
    } else {
        res.end(JSON.stringify(state));
    }
});

server.listen(80);
                } catch (e) {const http = require('http');
const fs = require('fs');
const path = require('path');

let storage = { msg: "No data yet" };

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/sync') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', () => {
                storage = JSON.parse(body);
                res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                res.end(JSON.stringify({ok: true}));
            });
        } else {
            res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify(storage));
        }
    } else if (url.pathname === '/sync.html') {
        fs.readFile(path.join(__dirname, 'sync.html'), (err, data) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        });
    }
});

server.listen(80);
                    res.writeHead(400);
                    res.end();
                }
            });
        } else if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ msg: latestMsg }));
        }
    } else {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
});

server.listen();
