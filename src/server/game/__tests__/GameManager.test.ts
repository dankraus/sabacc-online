import { Server } from 'socket.io';
import { GameManager } from '../GameManager';
import { GameState, Player, DEFAULT_GAME_SETTINGS } from '../../../shared/types/game';

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

describe('GameManager', () => {
    let gameManager: GameManager;
    let mockIo: Server;
    const TEST_GAME_ID = 'test-game';

    beforeEach(() => {
        jest.clearAllMocks();
        mockIo = new Server();
        gameManager = new GameManager(mockIo);
    });

    describe('Game Creation and Joining', () => {
        it('should create a new game when joining with valid game ID', () => {
            const playerName = 'Test Player';
            const result = gameManager.joinGame(TEST_GAME_ID, playerName);

            expect(result).toBeDefined();
            expect(result.players).toHaveLength(1);
            expect(result.players[0].name).toBe(playerName);
            expect(result.players[0].chips).toBe(DEFAULT_GAME_SETTINGS.startingChips);
        });

        it('should add player to existing game when joining', () => {
            const player1 = 'Player 1';
            const player2 = 'Player 2';

            gameManager.joinGame(TEST_GAME_ID, player1);
            const result = gameManager.joinGame(TEST_GAME_ID, player2);

            expect(result.players).toHaveLength(2);
            expect(result.players.map(p => p.name)).toContain(player1);
            expect(result.players.map(p => p.name)).toContain(player2);
        });

        it('should not allow joining when game is full', () => {
            // Fill up the game
            for (let i = 0; i < DEFAULT_GAME_SETTINGS.maxPlayers; i++) {
                gameManager.joinGame(TEST_GAME_ID, `Player ${i}`);
            }

            // Try to join when full
            expect(() => {
                gameManager.joinGame(TEST_GAME_ID, 'Extra Player');
            }).toThrow('Game is full');
        });
    });

    describe('Game State Management', () => {
        it('should initialize game with correct settings', () => {
            const result = gameManager.joinGame(TEST_GAME_ID, 'Test Player');

            expect(result.settings).toEqual(DEFAULT_GAME_SETTINGS);
            expect(result.status).toBe('waiting');
            expect(result.currentPhase).toBe('setup');
            expect(result.deck).toHaveLength(62); // 30 red + 30 green + 2 wild
        });

        it('should start game when minimum players are reached', () => {
            // Add minimum required players
            for (let i = 0; i < DEFAULT_GAME_SETTINGS.minPlayers; i++) {
                gameManager.joinGame(TEST_GAME_ID, `Player ${i}`);
            }

            const gameState = gameManager.getGameState(TEST_GAME_ID);
            expect(gameState.status).toBe('in_progress');
            expect(gameState.currentPhase).toBe('betting');
        });

        it('should not start game with fewer than minimum players', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Single Player');

            const gameState = gameManager.getGameState(TEST_GAME_ID);
            expect(gameState.status).toBe('waiting');
            expect(gameState.currentPhase).toBe('setup');
        });
    });

    describe('Player Management', () => {
        it('should remove player from game', () => {
            const playerName = 'Test Player';
            gameManager.joinGame(TEST_GAME_ID, playerName);

            gameManager.leaveGame(TEST_GAME_ID, playerName);
            // After last player leaves, the game should be deleted
            expect(() => {
                gameManager.getGameState(TEST_GAME_ID);
            }).toThrow('Game not found');
        });

        it('should handle last player leaving', () => {
            const playerName = 'Test Player';
            gameManager.joinGame(TEST_GAME_ID, playerName);

            gameManager.leaveGame(TEST_GAME_ID, playerName);

            // Game should be removed when last player leaves
            expect(() => {
                gameManager.getGameState(TEST_GAME_ID);
            }).toThrow('Game not found');
        });

        it('should maintain game state when non-last player leaves', () => {
            const player1 = 'Player 1';
            const player2 = 'Player 2';

            gameManager.joinGame(TEST_GAME_ID, player1);
            gameManager.joinGame(TEST_GAME_ID, player2);

            gameManager.leaveGame(TEST_GAME_ID, player1);
            const gameState = gameManager.getGameState(TEST_GAME_ID);

            expect(gameState.players).toHaveLength(1);
            expect(gameState.players[0].name).toBe(player2);
        });

        it('should handle player disconnect', () => {
            const playerName = 'Test Player';
            gameManager.joinGame(TEST_GAME_ID, playerName);

            gameManager.handleDisconnect(playerName);

            expect(() => {
                gameManager.getGameState(TEST_GAME_ID);
            }).toThrow('Game not found');
        });
    });

    describe('Error Handling', () => {
        it('should throw error when joining non-existent game after creation', () => {
            expect(() => {
                gameManager.getGameState('non-existent-game');
            }).toThrow('Game not found');
        });

        it('should throw error when leaving non-existent game', () => {
            expect(() => {
                gameManager.leaveGame('non-existent-game', 'Test Player');
            }).toThrow('Game not found');
        });

        it('should throw error when player not found in game', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Player 1');

            expect(() => {
                gameManager.leaveGame(TEST_GAME_ID, 'Non-existent Player');
            }).toThrow('Player not found in game');
        });
    });
}); 