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

describe('GameEventEmitter', () => {
    let gameEventEmitter: GameEventEmitter;
    let mockIo: Server;
    const TEST_GAME_ID = 'test-game';

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
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
        });
    });

    describe('Player Events', () => {
        it('should emit playerJoined', () => {
            const game = createTestGame();
            const player = createTestPlayer();
            gameEventEmitter.emitPlayerJoined(game, player);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('playerJoined', player);
        });

        it('should emit playerLeft', () => {
            const game = createTestGame();
            const playerName = 'Test Player';
            gameEventEmitter.emitPlayerLeft(game, playerName);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('playerLeft', playerName);
        });
    });

    describe('Error Events', () => {
        it('should emit errorOccurred to specific socket', () => {
            const socketId = 'socket-123';
            const message = 'Test error message';
            gameEventEmitter.emitErrorOccurred(socketId, message);

            expect(mockIo.to).toHaveBeenCalledWith(socketId);
            expect(mockIo.emit).toHaveBeenCalledWith('errorOccurred', message);
        });

        it('should emit errorOccurred to game room', () => {
            const game = createTestGame();
            const message = 'Test error message';
            gameEventEmitter.emitErrorToGame(game, message);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('errorOccurred', message);
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
            expect(mockIo.emit).toHaveBeenCalledWith('chatMessageReceived', {
                playerId,
                text,
                timestamp
            });
        });
    });

    describe('Betting Events', () => {
        it('should emit bettingPhaseStarted', () => {
            const game = createTestGame();
            gameEventEmitter.emitBettingPhaseStarted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('bettingPhaseStarted', TEST_GAME_ID);
        });

        it('should emit playerActed', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            const action = 'continue' as const;
            gameEventEmitter.emitPlayerActed(game, playerId, action);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('playerActed', { playerId, action });
        });

        it('should emit bettingPhaseCompleted', () => {
            const game = createTestGame();
            gameEventEmitter.emitBettingPhaseCompleted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('bettingPhaseCompleted', TEST_GAME_ID);
        });
    });

    describe('Game Flow Events', () => {
        it('should emit gameStarted', () => {
            const game = createTestGame();
            gameEventEmitter.emitGameStarted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStarted', TEST_GAME_ID);
        });

        it('should emit diceRolled', () => {
            const game = createTestGame();
            const diceRoll = createTestDiceRoll();
            gameEventEmitter.emitDiceRolled(game, diceRoll);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('diceRolled', { gameId: TEST_GAME_ID, diceRoll });
        });

        it('should emit cardsSelected', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            gameEventEmitter.emitCardsSelected(game, playerId);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('cardsSelected', { gameId: TEST_GAME_ID, playerId });
        });

        it('should emit cardsImproved', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            gameEventEmitter.emitCardsImproved(game, playerId);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('cardsImproved', { gameId: TEST_GAME_ID, playerId });
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
            expect(mockIo.emit).toHaveBeenCalledWith('roundEnded', {
                winner,
                pot,
                tiebreakerUsed
            });
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
            expect(mockIo.emit).toHaveBeenCalledWith('gameEnded', {
                winner,
                finalChips,
                allPlayers
            });
        });
    });

    describe('Utility Methods', () => {
        it('should emit to room', () => {
            const roomId = 'room-123';
            const event = 'gameStateUpdated';
            const data = { test: 'data' };
            gameEventEmitter.emitToRoom(roomId, event, data);

            expect(mockIo.to).toHaveBeenCalledWith(roomId);
            expect(mockIo.emit).toHaveBeenCalledWith(event, data);
        });

        it('should emit to socket', () => {
            const socketId = 'socket-123';
            const event = 'errorOccurred';
            const data = 'Error message';
            gameEventEmitter.emitToSocket(socketId, event, data);

            expect(mockIo.to).toHaveBeenCalledWith(socketId);
            expect(mockIo.emit).toHaveBeenCalledWith(event, data);
        });
    });

    describe('Batch Operations', () => {
        it('should emit gameStateAndPlayerJoined', () => {
            const game = createTestGame();
            const player = createTestPlayer();
            gameEventEmitter.emitGameStateAndPlayerJoined(game, player);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
            expect(mockIo.emit).toHaveBeenCalledWith('playerJoined', player);
        });

        it('should emit gameStateAndPlayerLeft', () => {
            const game = createTestGame();
            const playerName = 'Test Player';
            gameEventEmitter.emitGameStateAndPlayerLeft(game, playerName);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
            expect(mockIo.emit).toHaveBeenCalledWith('playerLeft', playerName);
        });

        it('should emit gameStateAndBettingPhaseStarted', () => {
            const game = createTestGame();
            gameEventEmitter.emitGameStateAndBettingPhaseStarted(game);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
            expect(mockIo.emit).toHaveBeenCalledWith('bettingPhaseStarted', TEST_GAME_ID);
        });

        it('should emit gameStateAndPlayerActed', () => {
            const game = createTestGame();
            const playerId = 'player-123';
            const action = 'fold' as const;
            gameEventEmitter.emitGameStateAndPlayerActed(game, playerId, action);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
            expect(mockIo.emit).toHaveBeenCalledWith('playerActed', { playerId, action });
        });

        it('should emit gameStateAndDiceRolled', () => {
            const game = createTestGame();
            const diceRoll = createTestDiceRoll();
            gameEventEmitter.emitGameStateAndDiceRolled(game, diceRoll);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
            expect(mockIo.emit).toHaveBeenCalledWith('diceRolled', { gameId: TEST_GAME_ID, diceRoll });
        });

        it('should emit gameStateAndRoundEnded', () => {
            const game = createTestGame();
            const winner = 'Player 1';
            const pot = 100;
            const tiebreakerUsed = false;
            gameEventEmitter.emitGameStateAndRoundEnded(game, winner, pot, tiebreakerUsed);

            expect(mockIo.to).toHaveBeenCalledWith(TEST_GAME_ID);
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
            expect(mockIo.emit).toHaveBeenCalledWith('roundEnded', {
                winner,
                pot,
                tiebreakerUsed
            });
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
            expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', game);
            expect(mockIo.emit).toHaveBeenCalledWith('gameEnded', {
                winner,
                finalChips,
                allPlayers
            });
        });
    });
}); 