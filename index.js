const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const server = http.createServer(); // Required by Render
const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on('connection', (socket, req) => {
    const urlParams = new URLSearchParams(req.url.replace('/?', ''));
    const roomId = urlParams.get('room');
    if (!roomId) return socket.close();

    if (!rooms[roomId]) rooms[roomId] = [];

    let sessionId = null;

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                sessionId = data.id;
                rooms[roomId].push({ id: sessionId, socket });
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

    sessions.forEach(s => {
        if (s.socket.readyState === WebSocket.OPEN) {
            s.socket.send(JSON.stringify(payload));
        }
    });
}

function removeSession(roomId, id) {
    rooms[roomId] = (rooms[roomId] || []).filter(s => s.id !== id);
}

server.listen(PORT, () => {
    console.log(`✅ WebSocket server running on port ${PORT}`);
});
