/* istanbul ignore file */
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameManager } from './game/GameManager';
import { GameEventEmitter } from './game/GameEventEmitter';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types/game';

dotenv.config();

export const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const gameEventEmitter = new GameEventEmitter(io);
const gameManager = new GameManager(gameEventEmitter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('gameJoined', (data: { gameId: string; playerName: string }) => {
    try {
      // Join the socket room for this game
      socket.join(data.gameId);
      gameManager.joinGame(data.gameId, data.playerName, socket.id);
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('gameLeft', (gameId: string) => {
    try {
      // Leave the socket room for this game
      socket.leave(gameId);
      gameManager.leaveGame(gameId, socket.id);
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('startGame', (data: { gameId: string; dealerId?: string }) => {
    try {
      gameManager.startGame(data.gameId, data.dealerId);
      const gameState = gameManager.getGameState(data.gameId);
      gameEventEmitter.emitGameStarted(gameState);
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('rollDice', (gameId: string) => {
    try {
      gameManager.rollDice(gameId);
      const gameState = gameManager.getGameState(gameId);
      if (gameState.currentDiceRoll) {
        socket.emit('diceRolled', { gameId, diceRoll: gameState.currentDiceRoll });
      }
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('selectCards', (data: { gameId: string; selectedCardIndices: number[] }) => {
    try {
      gameManager.selectCards(data.gameId, socket.id, data.selectedCardIndices);
      socket.emit('cardsSelected', { gameId: data.gameId, playerId: socket.id });
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('continuePlaying', (gameId: string) => {
    try {
      gameManager.continuePlaying(gameId, socket.id);
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('fold', (gameId: string) => {
    try {
      gameManager.fold(gameId, socket.id);
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('improveCards', (data: { gameId: string; cardsToAdd: number[] }) => {
    try {
      gameManager.improveCards(data.gameId, socket.id, data.cardsToAdd);
      socket.emit('cardsImproved', { gameId: data.gameId, playerId: socket.id });
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('endRound', (gameId: string) => {
    try {
      gameManager.endRound(gameId);
    } catch (error) {
      socket.emit('errorOccurred', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  socket.on('chatMessageSent', (message: string) => {
    // Find which game this player is in and broadcast to that room
    const game = gameManager.getGameByPlayerId(socket.id);
    if (game) {
      const player = game.players.find(p => p.id === socket.id);
      if (player) {
        gameEventEmitter.emitChatMessageReceived(game, socket.id, message, Date.now());
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});