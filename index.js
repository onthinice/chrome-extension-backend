const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const PORT = process.env.PORT || 3000;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = {};

// --- THIS IS THE NEW, CRITICAL PART ---
// This handles Render's health checks.
// When Render pings our server, we'll respond with a simple "OK".
server.on('request', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is alive and listening for WebSockets.');
});
// --- END OF NEW PART ---

wss.on('connection', (socket, req) => {
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const roomId = urlParams.get('room');
    if (!roomId) return socket.close();

    if (!rooms[roomId]) rooms[roomId] = [];

    let sessionId = null;

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                sessionId = data.id;
                // Prevent duplicate sessions
                if (!rooms[roomId].find(s => s.id === sessionId)) {
                    rooms[roomId].push({ id: sessionId, socket });
                }
                broadcast(roomId);
            }
            if (data.type === 'leave') {
                removeSession(roomId, data.id);
                broadcast(roomId);
            }
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    socket.on('close', () => {
        if (sessionId) {
            removeSession(roomId, sessionId);
            broadcast(roomId);
        }
    });
});

function broadcast(roomId) {
    const sessions = rooms[roomId] || [];
    const payload = {
        type: 'update',
        sessions: sessions.map(s => s.id)
    };
    const payloadString = JSON.stringify(payload);

    sessions.forEach(s => {
        if (s.socket.readyState === WebSocket.OPEN) {
            s.socket.send(payloadString);
        }
    });
}

function removeSession(roomId, id) {
    if (!rooms[roomId]) return;
    rooms[roomId] = rooms[roomId].filter(s => s.id !== id);
}

server.listen(PORT, () => {
    console.log(`✅ WebSocket server running on port ${PORT}`);
});
