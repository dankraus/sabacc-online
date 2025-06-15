import { Server } from 'socket.io';
import { GameManager } from '../GameManager';
import { GameState, Player, DEFAULT_GAME_SETTINGS, Suit } from '../../../shared/types/game';
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

describe('GameManager', () => {
    let gameManager: GameManager;
    let mockServer: Server;
    const TEST_GAME_ID = 'test-game';

    beforeEach(() => {
        jest.clearAllMocks();
        mockServer = new Server();
        gameManager = new GameManager(mockServer);
    });

    describe('Game Initialization', () => {
        it('should create a new game when joining with valid gameId', () => {
            const playerName = 'Test Player';
            const result = gameManager.joinGame(TEST_GAME_ID, playerName);

            expect(result.id).toBe(TEST_GAME_ID);
            expect(result.status).toBe('waiting');
            expect(result.currentPhase).toBe('setup');
            expect(result.players).toHaveLength(1);
            expect(result.players[0].name).toBe(playerName);
            expect(result.deck).toHaveLength(createDeck().length);
            expect(result.currentDiceRoll).toBeNull();
            expect(result.targetNumber).toBeNull();
            expect(result.preferredSuit).toBeNull();
            expect(result.roundNumber).toBe(0);
            expect(result.dealerIndex).toBe(0);
        });

        it('should add players to existing game', () => {
            const player1 = 'Player 1';
            const player2 = 'Player 2';

            gameManager.joinGame(TEST_GAME_ID, player1);
            const result = gameManager.joinGame(TEST_GAME_ID, player2);

            expect(result.players).toHaveLength(2);
            expect(result.players.map(p => p.name)).toContain(player1);
            expect(result.players.map(p => p.name)).toContain(player2);
        });

        it('should throw error when game is full', () => {
            // Fill up the game
            for (let i = 0; i < DEFAULT_GAME_SETTINGS.maxPlayers; i++) {
                gameManager.joinGame(TEST_GAME_ID, `Player ${i}`);
            }

            expect(() => {
                gameManager.joinGame(TEST_GAME_ID, 'Extra Player');
            }).toThrow('Game is full');
        });
    });

    describe('Game Start', () => {
        it('should start game with correct initial state', () => {
            const result = gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            expect(result.status).toBe('in_progress');
            expect(result.currentPhase).toBe('initial_roll');
            expect(result.players[0].hand).toHaveLength(5);
            expect(result.players[1].hand).toHaveLength(5);
            expect(result.pot).toBe(10); // 5 ante per player
        });

        it('should throw error when starting non-existent game', () => {
            expect(() => {
                gameManager.startGame('non-existent');
            }).toThrow('Game not found');
        });

        it('should throw error if non-dealer tries to start the game', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, 'Player 2');
            }).toThrow('Only the dealer can start the game');
        });

        it('should throw error if not enough players to start', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, 'Dealer');
            }).toThrow('Not enough players to start the game');
        });

        it('should throw error if game already in progress', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, 'Dealer');
            }).toThrow('Game already in progress');
        });
    });

    describe('Dice Rolling', () => {
        it('should roll dice and update game state', () => {
            const result = gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            gameManager.rollDice(TEST_GAME_ID);
            expect(result.currentDiceRoll).not.toBeNull();
            expect(result.targetNumber).not.toBeNull();
            expect(result.preferredSuit).not.toBeNull();
            expect(result.currentPhase).toBe('selection');
        });

        it('should have valid dice roll values', () => {
            const result = gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            gameManager.rollDice(TEST_GAME_ID);
            const validGoldValues = [0, 5, -5, 10, -10];
            const validSuits = ['Circle', 'Triangle', 'Square'];
            expect(validGoldValues).toContain(result.currentDiceRoll?.goldValue);
            expect(validSuits).toContain(result.currentDiceRoll?.silverSuit);
        });
    });

    describe('Card Selection', () => {
        it('should allow players to select cards', () => {
            const result = gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            gameManager.rollDice(TEST_GAME_ID);
            const selectedIndices = [0, 1];
            gameManager.selectCards(TEST_GAME_ID, 'Dealer', selectedIndices);
            expect(result.players[0].selectedCards).toHaveLength(2);
            expect(result.players[0].hand).toHaveLength(3);
        });

        it('should move to first betting phase when all players have selected', () => {
            const result = gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, 'Dealer', [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, 'Player 2', [0, 1]);
            expect(result.currentPhase).toBe('first_betting');
        });

        it('should throw error when selecting cards for non-existent player', () => {
            const result = gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            gameManager.rollDice(TEST_GAME_ID);
            expect(() => {
                gameManager.selectCards(TEST_GAME_ID, 'non-existent', [0, 1]);
            }).toThrow('Player not found');
        });
    });

    describe('Sabacc Shift', () => {
        it('should handle sabacc shift correctly', () => {
            const gameId = gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            gameManager.rollDice(TEST_GAME_ID);

            // Get initial game state
            const initialGame = gameManager.getGameState(TEST_GAME_ID);
            if (!initialGame) throw new Error('Failed to get initial game state');
            const originalHand = [...initialGame.players[0].hand];

            // Force a sabacc shift by selecting cards that would trigger it
            gameManager.selectCards(TEST_GAME_ID, 'Dealer', [0, 1, 2]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // Get updated game state
            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            if (!updatedGame) throw new Error('Failed to get updated game state');

            expect(updatedGame.players[0].hand).not.toEqual(originalHand);
            expect(updatedGame.players[0].hand.length).toBe(5);
            expect(updatedGame.players[0].hand.every(card =>
                card.suit && ['Circle', 'Triangle', 'Square'].includes(card.suit)
            )).toBe(true);
        });
    });

    describe('Round End', () => {
        it('should determine winner and reset game state', () => {
            const gameId = 'test-game';
            const gameManager = new GameManager(mockServer);
            gameManager.joinGame(gameId, 'Dealer');
            gameManager.joinGame(gameId, 'Player 2');
            gameManager.startGame(gameId, 'Dealer');
            gameManager.rollDice(gameId);
            gameManager.selectCards(gameId, 'Dealer', [0]);
            gameManager.selectCards(gameId, 'Player 2', [0]);
            gameManager.handleSabaccShift(gameId);
            gameManager.endRound(gameId);
            const game = gameManager.getGameState(gameId);
            expect(game.currentPhase).toBe('setup');
            expect(game.pot).toBe(0);
        });

        it('should throw error when ending round without target number or preferred suit', () => {
            const gameId = 'test-game';
            const gameManager = new GameManager(mockServer);
            gameManager.joinGame(gameId, 'Dealer');
            gameManager.joinGame(gameId, 'Player 2');
            gameManager.startGame(gameId, 'Dealer');
            expect(() => gameManager.endRound(gameId)).toThrow('Cannot end round: target number or preferred suit not set');
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