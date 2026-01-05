const WebSocket = require('ws');

const url = 'wss://swarm-coordinator-production.up.railway.app';
console.log(`Connecting to ${url}...`);

const ws = new WebSocket(url);

ws.on('open', () => {
    console.log('✅ Connected successfully!');
    ws.close();
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
});

ws.on('unexpected-response', (req, res) => {
    console.error('❌ Unexpected response:', res.statusCode, res.statusMessage);
    process.exit(1);
});
