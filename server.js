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
                    res.end(JSON.stringify({ ok: true }));
                } catch (e) {
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
