import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameManager } from '../game/GameManager';
import { GameEvents } from '../types/game';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server<GameEvents>(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const gameManager = new GameManager(io);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('player-join', (data: { gameId: string; playerName: string }) => {
    gameManager.joinGame(socket, data.gameId, data.playerName);
  });

  socket.on('player-leave', () => {
    gameManager.leaveGame(socket);
  });

  socket.on('place-bet', (data: { amount: number }) => {
    gameManager.placeBet(socket, data.amount);
  });

  socket.on('draw-card', () => {
    gameManager.drawCard(socket);
  });

  socket.on('stand', () => {
    gameManager.stand(socket);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});