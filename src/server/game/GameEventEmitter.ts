import { Server } from 'socket.io';
import { GameState, Player, DiceRoll, BettingAction, ServerToClientEvents, ClientToServerEvents } from '../../shared/types/game';

export class GameEventEmitter {
    private io: Server<ClientToServerEvents, ServerToClientEvents>;

    constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
        this.io = io;
    }

    // Game State Events
    emitGameStateUpdated(game: GameState): void {
        this.io.to(game.id).emit('gameStateUpdated', game);
    }

    // Player Events
    emitPlayerJoined(game: GameState, player: Player): void {
        this.io.to(game.id).emit('playerJoined', player);
    }

    emitPlayerLeft(game: GameState, playerName: string): void {
        this.io.to(game.id).emit('playerLeft', playerName);
    }

    // Error Events
    emitErrorOccurred(socketId: string, message: string): void {
        this.io.to(socketId).emit('errorOccurred', message);
    }

    emitErrorToGame(game: GameState, message: string): void {
        this.io.to(game.id).emit('errorOccurred', message);
    }

    // Chat Events
    emitChatMessageReceived(game: GameState, playerId: string, text: string, timestamp: number): void {
        this.io.to(game.id).emit('chatMessageReceived', {
            playerId,
            text,
            timestamp
        });
    }

    // Betting Events
    emitBettingPhaseStarted(game: GameState): void {
        this.io.to(game.id).emit('bettingPhaseStarted', game.id);
    }

    emitPlayerActed(game: GameState, playerId: string, action: BettingAction): void {
        this.io.to(game.id).emit('playerActed', { playerId, action });
    }

    emitBettingPhaseCompleted(game: GameState): void {
        this.io.to(game.id).emit('bettingPhaseCompleted', game.id);
    }

    // Game Flow Events
    emitGameStarted(game: GameState): void {
        this.io.to(game.id).emit('gameStarted', game.id);
    }

    emitDiceRolled(game: GameState, diceRoll: DiceRoll): void {
        this.io.to(game.id).emit('diceRolled', { gameId: game.id, diceRoll });
    }

    emitCardsSelected(game: GameState, playerId: string): void {
        this.io.to(game.id).emit('cardsSelected', { gameId: game.id, playerId });
    }

    emitCardsImproved(game: GameState, playerId: string): void {
        this.io.to(game.id).emit('cardsImproved', { gameId: game.id, playerId });
    }

    // Round Events
    emitRoundEnded(game: GameState, winner: string, pot: number, tiebreakerUsed: boolean): void {
        this.io.to(game.id).emit('roundEnded', {
            winner,
            pot,
            tiebreakerUsed
        });
    }

    // Game End Events
    emitGameEnded(game: GameState, winner: string, finalChips: number, allPlayers: { name: string; finalChips: number }[]): void {
        this.io.to(game.id).emit('gameEnded', {
            winner,
            finalChips,
            allPlayers
        });
    }

    // Utility Methods
    emitToRoom(roomId: string, event: keyof ServerToClientEvents, data: any): void {
        this.io.to(roomId).emit(event, data);
    }

    emitToSocket(socketId: string, event: keyof ServerToClientEvents, data: any): void {
        this.io.to(socketId).emit(event, data);
    }

    // Batch Operations
    emitGameStateAndPlayerJoined(game: GameState, player: Player): void {
        this.emitGameStateUpdated(game);
        this.emitPlayerJoined(game, player);
    }

    emitGameStateAndPlayerLeft(game: GameState, playerName: string): void {
        this.emitGameStateUpdated(game);
        this.emitPlayerLeft(game, playerName);
    }

    emitGameStateAndBettingPhaseStarted(game: GameState): void {
        this.emitGameStateUpdated(game);
        this.emitBettingPhaseStarted(game);
    }

    emitGameStateAndPlayerActed(game: GameState, playerId: string, action: BettingAction): void {
        this.emitGameStateUpdated(game);
        this.emitPlayerActed(game, playerId, action);
    }

    emitGameStateAndBettingPhaseCompleted(game: GameState): void {
        this.emitGameStateUpdated(game);
        this.emitBettingPhaseCompleted(game);
    }

    emitGameStateAndDiceRolled(game: GameState, diceRoll: DiceRoll): void {
        this.emitGameStateUpdated(game);
        this.emitDiceRolled(game, diceRoll);
    }

    emitGameStateAndCardsSelected(game: GameState, playerId: string): void {
        this.emitGameStateUpdated(game);
        this.emitCardsSelected(game, playerId);
    }

    emitGameStateAndCardsImproved(game: GameState, playerId: string): void {
        this.emitGameStateUpdated(game);
        this.emitCardsImproved(game, playerId);
    }

    emitGameStateAndRoundEnded(game: GameState, winner: string, pot: number, tiebreakerUsed: boolean): void {
        this.emitGameStateUpdated(game);
        this.emitRoundEnded(game, winner, pot, tiebreakerUsed);
    }

    emitGameStateAndGameEnded(game: GameState, winner: string, finalChips: number, allPlayers: { name: string; finalChips: number }[]): void {
        this.emitGameStateUpdated(game);
        this.emitGameEnded(game, winner, finalChips, allPlayers);
    }
} 