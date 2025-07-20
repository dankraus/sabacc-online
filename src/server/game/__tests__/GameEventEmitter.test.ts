import { Server } from 'socket.io';
import { GameEventEmitter } from '../GameEventEmitter';
import { GameState, Player, DEFAULT_GAME_SETTINGS, Suit, DiceRoll } from '../../../shared/types/game';
import { createDeck } from '../../../shared/types/gameUtils';

// Mock Socket.IO
jest.mock('socket.io', () => {
    const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
    };
    return {
        Server: jest.fn(() => mockServer)
    };
});

// Mock the emit function to have mock property
const mockEmit = jest.fn();
(mockEmit as any).mock = { calls: [] };

describe('GameEventEmitter', () => {
    let gameEventEmitter: GameEventEmitter;
    let mockIo: Server;
    const TEST_GAME_ID = 'test-game';

    // Helper function to check if data has timestamp and sequence number
    const expectEnhancedData = (data: any) => {
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('sequenceNumber');
        expect(typeof data.timestamp).toBe('number');
        expect(typeof data.sequenceNumber).toBe('number');
    };

    // Helper function to check if data contains the original data plus enhancements
    const expectContainsOriginalData = (enhancedData: any, originalData: any) => {
        Object.keys(originalData).forEach(key => {
            if (key !== 'timestamp' && key !== 'sequenceNumber') {
                expect(enhancedData[key]).toEqual(originalData[key]);
            }
        });
    };

    const createTestGame = (): GameState => ({
        id: TEST_GAME_ID,
        status: 'waiting',
        currentPhase: 'setup',
        players: [
            {
                id: 'player-1',
                name: 'Player 1',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true,
                hasActed: false,
                bettingAction: null
            },
            {
                id: 'player-2',
                name: 'Player 2',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true,
                hasActed: false,
                bettingAction: null
            }
        ],
        deck: createDeck(),
        settings: DEFAULT_GAME_SETTINGS,
        currentPlayer: null,
        pot: 0,
        lastAction: null,
        currentDiceRoll: null,
        targetNumber: null,
        preferredSuit: null,
        roundNumber: 0,
        dealerIndex: 0,
        continueCost: 2,
        bettingRoundComplete: false,
        bettingPhaseStarted: false,
        dealersUsed: new Set<string>()
    });

    const createTestPlayer = (): Player => ({
        id: 'test-player',
        name: 'Test Player',
        chips: 100,
        hand: [],
        selectedCards: [],
        isActive: true,
        hasActed: false,
        bettingAction: null
    });

    const createTestDiceRoll = (): DiceRoll => ({
        goldValue: 5,
        silverSuit: 'Circle' as Suit
    });

    beforeEach(() => {
        mockIo = new Server();
        gameEventEmitter = new GameEventEmitter(mockIo);
    });

    describe('Game State Events', () => {
        it('should emit gameStateUpdated', () => {
            const game = createTestGame();
            gameEventEmitter.emitGameStateUpdated(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated')?.[1];
            expectEnhancedData(emittedData);
            expectContainsOriginalData(emittedData, game);
        });
    });

    describe('Player Events', () => {
        it('should emit playerJoined', () => {
            const game = createTestGame();
            const player = createTestPlayer();
            gameEventEmitter.emitPlayerJoined(game, player);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'playerJoined')?.[1];
            expectEnhancedData(emittedData);
            expectContainsOriginalData(emittedData, player);
        });

        it('should emit playerLeft', () => {
            const game = createTestGame();
            const playerName = 'Test Player';
            gameEventEmitter.emitPlayerLeft(game, playerName);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'playerLeft')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.value).toBe(playerName);
        });
    });

    describe('Error Events', () => {
        it('should emit errorOccurred to specific socket', () => {
            const socketId = 'socket-123';
            const message = 'Test error message';
            gameEventEmitter.emitErrorOccurred(socketId, message);

            expect(mockIo.to).toHaveBeenCalledWith(socketId);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'errorOccurred')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.value).toBe(message);
        });

        it('should emit errorOccurred to game room', () => {
            const game = createTestGame();
            const message = 'Test error message';
            gameEventEmitter.emitErrorToGame(game, message);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'errorOccurred')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.value).toBe(message);
        });
    });

    describe('Chat Events', () => {
        it('should emit chatMessageReceived', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            const text = 'Hello world';
            const timestamp = Date.now();
            gameEventEmitter.emitChatMessageReceived(game, playerId, text, timestamp);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'chatMessageReceived')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.playerId).toBe(playerId);
            expect(emittedData.text).toBe(text);
            expect(emittedData).toHaveProperty('timestamp');
        });
    });

    describe('Betting Events', () => {
        it('should emit bettingPhaseStarted', () => {
            const game = createTestGame();
            gameEventEmitter.emitBettingPhaseStarted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'bettingPhaseStarted')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.gameId).toBe(TEST_GAME_ID);
        });

        it('should emit playerActed', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            const action = 'continue' as const;
            gameEventEmitter.emitPlayerActed(game, playerId, action);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'playerActed')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.playerId).toBe(playerId);
            expect(emittedData.action).toBe(action);
        });

        it('should emit bettingPhaseCompleted', () => {
            const game = createTestGame();
            gameEventEmitter.emitBettingPhaseCompleted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'bettingPhaseCompleted')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.gameId).toBe(TEST_GAME_ID);
        });
    });

    describe('Game Flow Events', () => {
        it('should emit gameStarted', () => {
            const game = createTestGame();
            gameEventEmitter.emitGameStarted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStarted')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.gameId).toBe(TEST_GAME_ID);
        });

        it('should emit diceRolled', () => {
            const game = createTestGame();
            const diceRoll = createTestDiceRoll();
            gameEventEmitter.emitDiceRolled(game, diceRoll);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'diceRolled')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.gameId).toBe(TEST_GAME_ID);
            expect(emittedData.diceRoll).toEqual(diceRoll);
        });

        it('should emit cardsSelected', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            gameEventEmitter.emitCardsSelected(game, playerId);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'cardsSelected')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.gameId).toBe(TEST_GAME_ID);
            expect(emittedData.playerId).toBe(playerId);
        });

        it('should emit cardsImproved', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            gameEventEmitter.emitCardsImproved(game, playerId);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'cardsImproved')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.gameId).toBe(TEST_GAME_ID);
            expect(emittedData.playerId).toBe(playerId);
        });
    });

    describe('Round Events', () => {
        it('should emit roundEnded', () => {
            const game = createTestGame();
            const winner = 'Player 1';
            const pot = 100;
            const tiebreakerUsed = false;
            gameEventEmitter.emitRoundEnded(game, winner, pot, tiebreakerUsed);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'roundEnded')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.winner).toBe(winner);
            expect(emittedData.pot).toBe(pot);
            expect(emittedData.tiebreakerUsed).toBe(tiebreakerUsed);
        });
    });

    describe('Game End Events', () => {
        it('should emit gameEnded', () => {
            const game = createTestGame();
            const winner = 'Player 1';
            const finalChips = 200;
            const allPlayers = [
                { name: 'Player 1', finalChips: 200 },
                { name: 'Player 2', finalChips: 0 }
            ];
            gameEventEmitter.emitGameEnded(game, winner, finalChips, allPlayers);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameEnded')?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.winner).toBe(winner);
            expect(emittedData.finalChips).toBe(finalChips);
            expect(emittedData.allPlayers).toEqual(allPlayers);
        });
    });

    describe('Utility Methods', () => {
        it('should emit to room', () => {
            const roomId = 'room-123';
            const event = 'gameStateUpdated';
            const data = { test: 'data' };
            gameEventEmitter.emitToRoom(roomId, event, data);

            expect(mockIo.to).toHaveBeenCalledWith(roomId);
            // Debug: print all emit calls
            // eslint-disable-next-line no-console
            // console.log('mockIo.emit calls:', (mockIo.emit as any).mock.calls);
            const allCalls = (mockIo.emit as any).mock.calls.filter((call: any) => call[0] === event);
            const emittedData = allCalls[allCalls.length - 1]?.[1];
            expect(emittedData).toBeDefined();
            expectEnhancedData(emittedData);
            expect(emittedData?.test).toBe('data');
        });

        it('should emit to socket', () => {
            const socketId = 'socket-123';
            const event = 'errorOccurred';
            const data = 'Test error message';
            gameEventEmitter.emitToSocket(socketId, event, data);

            expect(mockIo.to).toHaveBeenCalledWith(socketId);
            const emittedData = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === event)?.[1];
            expectEnhancedData(emittedData);
            expect(emittedData.value).toBe(data);
        });
    });

    describe('Event Logging', () => {
        it('should log events for a game', () => {
            const game = createTestGame();
            const player = createTestPlayer();

            gameEventEmitter.emitPlayerJoined(game, player);

            const eventLog = gameEventEmitter.getEventLog(TEST_GAME_ID);
            expect(eventLog).toBeDefined();
            expect(eventLog!.events).toHaveLength(1);
            expect(eventLog!.events[0].type).toBe('playerJoined');
            expect(eventLog!.events[0].playerId).toBe(player.id);
        });

        it('should get events by type', () => {
            const game = createTestGame();
            const player = createTestPlayer();

            gameEventEmitter.emitPlayerJoined(game, player);
            gameEventEmitter.emitGameStateUpdated(game);
            gameEventEmitter.emitPlayerJoined(game, player);

            const playerJoinedEvents = gameEventEmitter.getEventsByType(TEST_GAME_ID, 'playerJoined');
            expect(playerJoinedEvents).toHaveLength(2);

            const gameStateEvents = gameEventEmitter.getEventsByType(TEST_GAME_ID, 'gameStateUpdated');
            expect(gameStateEvents).toHaveLength(1);
        });

        it('should get events by player', () => {
            const game = createTestGame();
            const player = createTestPlayer();

            gameEventEmitter.emitPlayerJoined(game, player);
            gameEventEmitter.emitPlayerActed(game, player.id, 'continue');
            gameEventEmitter.emitGameStateUpdated(game);

            const playerEvents = gameEventEmitter.getEventsByPlayer(TEST_GAME_ID, player.id);
            expect(playerEvents).toHaveLength(2);
            expect(playerEvents[0].type).toBe('playerJoined');
            expect(playerEvents[1].type).toBe('playerActed');
        });

        it('should clear event log', () => {
            const game = createTestGame();
            const player = createTestPlayer();

            gameEventEmitter.emitPlayerJoined(game, player);
            expect(gameEventEmitter.getEventLog(TEST_GAME_ID)).toBeDefined();

            gameEventEmitter.clearEventLog(TEST_GAME_ID);
            expect(gameEventEmitter.getEventLog(TEST_GAME_ID)).toBeUndefined();
        });
    });

    describe('Batch Operations', () => {
        it('should emit gameStateAndPlayerJoined', () => {
            const game = createTestGame();
            const player = createTestPlayer();
            gameEventEmitter.emitGameStateAndPlayerJoined(game, player);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const gameStateCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated');
            const playerJoinedCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'playerJoined');

            expectEnhancedData(gameStateCall![1]);
            expectEnhancedData(playerJoinedCall![1]);
            expectContainsOriginalData(gameStateCall![1], game);
            expectContainsOriginalData(playerJoinedCall![1], player);
        });

        it('should emit gameStateAndPlayerLeft', () => {
            const game = createTestGame();
            const playerName = 'Test Player';
            gameEventEmitter.emitGameStateAndPlayerLeft(game, playerName);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const gameStateCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated');
            const playerLeftCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'playerLeft');

            expectEnhancedData(gameStateCall![1]);
            expectEnhancedData(playerLeftCall![1]);
            expectContainsOriginalData(gameStateCall![1], game);
        });

        it('should emit gameStateAndBettingPhaseStarted', () => {
            const game = createTestGame();
            gameEventEmitter.emitGameStateAndBettingPhaseStarted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const gameStateCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated');
            const bettingPhaseCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'bettingPhaseStarted');

            expectEnhancedData(gameStateCall![1]);
            expectEnhancedData(bettingPhaseCall![1]);
            expectContainsOriginalData(gameStateCall![1], game);
        });

        it('should emit gameStateAndPlayerActed', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            const action = 'continue' as const;
            gameEventEmitter.emitGameStateAndPlayerActed(game, playerId, action);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const gameStateCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated');
            const playerActedCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'playerActed');

            expectEnhancedData(gameStateCall![1]);
            expectEnhancedData(playerActedCall![1]);
            expectContainsOriginalData(gameStateCall![1], game);
            expect(playerActedCall![1].playerId).toBe(playerId);
            expect(playerActedCall![1].action).toBe(action);
        });

        it('should emit gameStateAndDiceRolled', () => {
            const game = createTestGame();
            const diceRoll = createTestDiceRoll();
            gameEventEmitter.emitGameStateAndDiceRolled(game, diceRoll);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const gameStateCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated');
            const diceRolledCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'diceRolled');

            expectEnhancedData(gameStateCall![1]);
            expectEnhancedData(diceRolledCall![1]);
            expectContainsOriginalData(gameStateCall![1], game);
            expect(diceRolledCall![1].diceRoll).toEqual(diceRoll);
        });

        it('should emit gameStateAndRoundEnded', () => {
            const game = createTestGame();
            const winner = 'Player 1';
            const pot = 100;
            const tiebreakerUsed = false;
            gameEventEmitter.emitGameStateAndRoundEnded(game, winner, pot, tiebreakerUsed);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const gameStateCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated');
            const roundEndedCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'roundEnded');

            expectEnhancedData(gameStateCall![1]);
            expectEnhancedData(roundEndedCall![1]);
            expectContainsOriginalData(gameStateCall![1], game);
            expect(roundEndedCall![1].winner).toBe(winner);
            expect(roundEndedCall![1].pot).toBe(pot);
            expect(roundEndedCall![1].tiebreakerUsed).toBe(tiebreakerUsed);
        });

        it('should emit gameStateAndGameEnded', () => {
            const game = createTestGame();
            const winner = 'Player 1';
            const finalChips = 200;
            const allPlayers = [
                { name: 'Player 1', finalChips: 200 },
                { name: 'Player 2', finalChips: 0 }
            ];
            gameEventEmitter.emitGameStateAndGameEnded(game, winner, finalChips, allPlayers);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            const gameStateCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameStateUpdated');
            const gameEndedCall = (mockIo.emit as any).mock.calls.find((call: any) => call[0] === 'gameEnded');

            expectEnhancedData(gameStateCall![1]);
            expectEnhancedData(gameEndedCall![1]);
            expectContainsOriginalData(gameStateCall![1], game);
            expect(gameEndedCall![1].winner).toBe(winner);
            expect(gameEndedCall![1].finalChips).toBe(finalChips);
            expect(gameEndedCall![1].allPlayers).toEqual(allPlayers);
        });
    });
}); 