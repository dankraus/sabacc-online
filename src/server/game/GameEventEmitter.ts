import { Server } from 'socket.io';
import { GameState, Player, DiceRoll, BettingAction, ServerToClientEvents, ClientToServerEvents, GameEvent, EventLog } from '../../shared/types/game';
import { v4 as uuidv4 } from 'uuid';

export class GameEventEmitter {
    private io: Server<ClientToServerEvents, ServerToClientEvents>;
    private eventLogs: Map<string, EventLog> = new Map();

    constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
        this.io = io;
    }

    // Event Logging Methods
    private getOrCreateEventLog(gameId: string): EventLog {
        if (!this.eventLogs.has(gameId)) {
            this.eventLogs.set(gameId, {
                gameId,
                events: [],
                lastSequenceNumber: 0
            });
        }
        return this.eventLogs.get(gameId)!;
    }

    private logEvent(gameId: string, type: string, data: any, playerId?: string): GameEvent {
        const eventLog = this.getOrCreateEventLog(gameId);
        const timestamp = Date.now();
        const sequenceNumber = ++eventLog.lastSequenceNumber;

        const event: GameEvent = {
            id: uuidv4(),
            gameId,
            type,
            timestamp,
            sequenceNumber,
            data,
            playerId
        };

        eventLog.events.push(event);
        return event;
    }

    // Centralized emit function (no target param)
    private emit(id: string, event: keyof ServerToClientEvents, data: any, logGameId?: string, logType?: string, playerId?: string) {
        // If logGameId and logType are provided, log the event and use its timestamp/sequence
        let meta = { timestamp: Date.now(), sequenceNumber: 0 };
        if (logGameId && logType) {
            const logged = this.logEvent(logGameId, logType, data, playerId);
            meta = { timestamp: logged.timestamp, sequenceNumber: logged.sequenceNumber };
        }
        let enhancedData;
        if (typeof data === 'string') {
            enhancedData = { value: data, ...meta };
        } else {
            enhancedData = { ...data, ...meta };
        }
        this.io.to(id).emit(event, enhancedData);
    }

    // Event Log Access Methods
    getEventLog(gameId: string): EventLog | undefined {
        return this.eventLogs.get(gameId);
    }

    getEventsForGame(gameId: string): GameEvent[] {
        const eventLog = this.eventLogs.get(gameId);
        return eventLog ? eventLog.events : [];
    }

    getEventsByType(gameId: string, type: string): GameEvent[] {
        const events = this.getEventsForGame(gameId);
        return events.filter(event => event.type === type);
    }

    getEventsByPlayer(gameId: string, playerId: string): GameEvent[] {
        const events = this.getEventsForGame(gameId);
        return events.filter(event => event.playerId === playerId);
    }

    // Game State Events
    emitGameStateUpdated(game: GameState): void {
        this.emit(game.id, 'gameStateUpdated', game, game.id, 'gameStateUpdated');
    }

    // Player Events
    emitPlayerJoined(game: GameState, player: Player): void {
        this.emit(game.id, 'playerJoined', player, game.id, 'playerJoined', player.id);
    }

    emitPlayerLeft(game: GameState, playerName: string): void {
        this.emit(game.id, 'playerLeft', playerName, game.id, 'playerLeft');
    }

    // Error Events
    emitErrorOccurred(socketId: string, message: string): void {
        this.emit(socketId, 'errorOccurred', message, 'system', 'errorOccurred');
    }

    emitErrorToGame(game: GameState, message: string): void {
        this.emit(game.id, 'errorOccurred', message, game.id, 'errorOccurred');
    }

    // Chat Events
    emitChatMessageReceived(game: GameState, playerId: string, text: string, timestamp: number): void {
        const messageData = { playerId, text, timestamp };
        this.emit(game.id, 'chatMessageReceived', messageData, game.id, 'chatMessageReceived', playerId);
    }

    // Betting Events
    emitBettingPhaseStarted(game: GameState): void {
        this.emit(game.id, 'bettingPhaseStarted', { gameId: game.id }, game.id, 'bettingPhaseStarted');
    }

    emitPlayerActed(game: GameState, playerId: string, action: BettingAction): void {
        const actionData = { playerId, action };
        this.emit(game.id, 'playerActed', actionData, game.id, 'playerActed', playerId);
    }

    emitBettingPhaseCompleted(game: GameState): void {
        this.emit(game.id, 'bettingPhaseCompleted', { gameId: game.id }, game.id, 'bettingPhaseCompleted');
    }

    // Game Flow Events
    emitGameStarted(game: GameState): void {
        this.emit(game.id, 'gameStarted', { gameId: game.id }, game.id, 'gameStarted');
    }

    emitDiceRolled(game: GameState, diceRoll: DiceRoll): void {
        const diceData = { gameId: game.id, diceRoll };
        this.emit(game.id, 'diceRolled', diceData, game.id, 'diceRolled');
    }

    emitCardsSelected(game: GameState, playerId: string): void {
        const cardData = { gameId: game.id, playerId };
        this.emit(game.id, 'cardsSelected', cardData, game.id, 'cardsSelected', playerId);
    }

    emitCardsImproved(game: GameState, playerId: string): void {
        const cardData = { gameId: game.id, playerId };
        this.emit(game.id, 'cardsImproved', cardData, game.id, 'cardsImproved', playerId);
    }

    // Round Events
    emitRoundEnded(game: GameState, winner: string, pot: number, tiebreakerUsed: boolean): void {
        const roundData = { winner, pot, tiebreakerUsed };
        this.emit(game.id, 'roundEnded', roundData, game.id, 'roundEnded');
    }

    // Game End Events
    emitGameEnded(game: GameState, winner: string, finalChips: number, allPlayers: { name: string; finalChips: number }[]): void {
        const gameEndData = { winner, finalChips, allPlayers };
        this.emit(game.id, 'gameEnded', gameEndData, game.id, 'gameEnded');
    }

    // Utility Methods
    emitToRoom(roomId: string, event: keyof ServerToClientEvents, data: any): void {
        this.emit(roomId, event, data);
    }

    emitToSocket(socketId: string, event: keyof ServerToClientEvents, data: any): void {
        this.emit(socketId, event, data);
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

    // Cleanup Methods
    clearEventLog(gameId: string): void {
        this.eventLogs.delete(gameId);
    }

    clearAllEventLogs(): void {
        this.eventLogs.clear();
    }
} 