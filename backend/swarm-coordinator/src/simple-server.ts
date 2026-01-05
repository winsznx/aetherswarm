import http from 'http';

const port = parseInt(process.env.PORT || '8081');

const server = http.createServer((req, res) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Simple server running' }));
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Simple server running on port ${port} (0.0.0.0)`);
});
