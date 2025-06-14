import { Server, Socket } from 'socket.io';
import { GameState, Player, GameEvents } from '../types/game';
import { SabaccGame } from './SabaccGame';

export class GameManager {
  private games: Map<string, SabaccGame> = new Map();
  private playerGameMap: Map<string, string> = new Map();

  constructor(private io: Server) { }

  joinGame(socket: Socket, gameId: string, playerName: string): void {
    try {
      let game = this.games.get(gameId);

      if (!game) {
        game = new SabaccGame(gameId, this.io);
        this.games.set(gameId, game);
      }

      const success = game.addPlayer(socket.id, playerName);

      if (success) {
        socket.join(gameId);
        this.playerGameMap.set(socket.id, gameId);

        socket.emit('game-state-update', game.getGameState());
        socket.to(gameId).emit('game-state-update', game.getGameState());

        console.log(`Player ${playerName} joined game ${gameId}`);
      } else {
        socket.emit('error', { message: 'Failed to join game. Game may be full.' });
      }
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'An error occurred while joining the game.' });
    }
  }

  leaveGame(socket: Socket): void {
    const gameId = this.playerGameMap.get(socket.id);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (game) {
      game.removePlayer(socket.id);
      socket.leave(gameId);

      if (game.getPlayerCount() === 0) {
        this.games.delete(gameId);
      } else {
        socket.to(gameId).emit('game-state-update', game.getGameState());
      }
    }

    this.playerGameMap.delete(socket.id);
  }

  placeBet(socket: Socket, amount: number): void {
    const gameId = this.playerGameMap.get(socket.id);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (game) {
      const success = game.placeBet(socket.id, amount);
      if (success) {
        this.io.to(gameId).emit('game-state-update', game.getGameState());
      } else {
        socket.emit('error', { message: 'Invalid bet amount.' });
      }
    }
  }

  drawCard(socket: Socket): void {
    const gameId = this.playerGameMap.get(socket.id);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (game) {
      const success = game.drawCard(socket.id);
      if (success) {
        this.io.to(gameId).emit('game-state-update', game.getGameState());
      } else {
        socket.emit('error', { message: 'Cannot draw card at this time.' });
      }
    }
  }

  stand(socket: Socket): void {
    const gameId = this.playerGameMap.get(socket.id);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (game) {
      const success = game.stand(socket.id);
      if (success) {
        this.io.to(gameId).emit('game-state-update', game.getGameState());

        if (game.isGameOver()) {
          const winner = game.getWinner();
          this.io.to(gameId).emit('game-over', {
            winner: winner?.name || 'No winner',
            finalState: game.getGameState()
          });
        }
      }
    }
  }

  handleDisconnect(socket: Socket): void {
    this.leaveGame(socket);
  }
}