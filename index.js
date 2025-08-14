const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.send("Connected to Render WebSocket server!");

  ws.on("message", (msg) => {
    console.log("Received:", msg);
    ws.send(`Echo: ${msg}`);
  });
});

app.get("/", (req, res) => res.send("WebSocket server is running"));

server.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
