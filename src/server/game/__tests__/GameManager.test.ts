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

    // Helper functions to reduce repetition
    const setupGame = (numPlayers: number = 2) => {
        const players = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
        players.forEach(player => gameManager.joinGame(TEST_GAME_ID, player));
        return players;
    };

    const startGameWithPlayers = (numPlayers: number = 2) => {
        const players = setupGame(numPlayers);
        gameManager.startGame(TEST_GAME_ID, players[0]);
        return players;
    };

    const setupGameInProgress = () => {
        const players = startGameWithPlayers();
        gameManager.rollDice(TEST_GAME_ID);
        return players;
    };

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

        it('should handle multiple players joining', () => {
            const players = setupGame(3);
            const result = gameManager.getGameState(TEST_GAME_ID);

            expect(result.players).toHaveLength(3);
            players.forEach(player => {
                expect(result.players.map(p => p.name)).toContain(player);
            });
        });

        it('should throw error when game is full', () => {
            setupGame(DEFAULT_GAME_SETTINGS.maxPlayers);
            expect(() => {
                gameManager.joinGame(TEST_GAME_ID, 'Extra Player');
            }).toThrow('Game is full');
        });
    });

    describe('Game Start', () => {
        it('should start game with correct initial state', () => {
            const players = startGameWithPlayers();
            const result = gameManager.getGameState(TEST_GAME_ID);

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

        it('should throw error when non-dealer tries to start game', () => {
            mockServer = new Server();
            gameManager = new GameManager(mockServer);
            gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, 'Player 2');
            }).toThrow('Only the dealer can start the game');
        });

        it('should throw error when starting game with insufficient players', () => {
            mockServer = new Server();
            gameManager = new GameManager(mockServer);
            gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, 'Dealer');
            }).toThrow('Not enough players to start the game');
        });

        it('should throw error when starting game that is already in progress', () => {
            mockServer = new Server();
            gameManager = new GameManager(mockServer);
            gameManager.joinGame(TEST_GAME_ID, 'Dealer');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2');
            gameManager.startGame(TEST_GAME_ID, 'Dealer');
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, 'Dealer');
            }).toThrow('Game already in progress');
        });
    });

    describe('Dice Rolling', () => {
        it('should handle dice rolling and update game state', () => {
            startGameWithPlayers();
            gameManager.rollDice(TEST_GAME_ID);
            const result = gameManager.getGameState(TEST_GAME_ID);

            expect(result.currentDiceRoll).not.toBeNull();
            expect(result.targetNumber).not.toBeNull();
            expect(result.preferredSuit).not.toBeNull();
            expect(result.currentPhase).toBe('selection');

            // Verify dice roll values
            const validGoldValues = [0, 5, -5, 10, -10];
            const validSuits = ['Circle', 'Triangle', 'Square'];
            expect(validGoldValues).toContain(result.currentDiceRoll?.goldValue);
            expect(validSuits).toContain(result.currentDiceRoll?.silverSuit);
        });
    });

    describe('Card Selection', () => {
        it('should handle card selection and phase transitions', () => {
            const players = setupGameInProgress();
            const result = gameManager.getGameState(TEST_GAME_ID);

            // Test card selection
            const selectedIndices = [0, 1];
            gameManager.selectCards(TEST_GAME_ID, players[0], selectedIndices);
            expect(result.players[0].selectedCards).toHaveLength(2);
            expect(result.players[0].hand).toHaveLength(3);

            // Test phase transition when all players select
            gameManager.selectCards(TEST_GAME_ID, players[1], selectedIndices);
            expect(result.currentPhase).toBe('first_betting');
        });

        it('should throw error when selecting cards for non-existent player', () => {
            setupGameInProgress();
            expect(() => {
                gameManager.selectCards(TEST_GAME_ID, 'non-existent', [0, 1]);
            }).toThrow('Player not found');
        });
    });

    describe('Sabacc Shift', () => {
        it('should handle sabacc shift correctly', () => {
            setupGameInProgress();
            const initialGame = gameManager.getGameState(TEST_GAME_ID);
            const originalHand = [...initialGame.players[0].hand];

            gameManager.selectCards(TEST_GAME_ID, 'Player 1', [0, 1, 2]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            expect(updatedGame.players[0].hand).not.toEqual(originalHand);
            expect(updatedGame.players[0].hand.length).toBe(5);
            expect(updatedGame.players[0].hand.every(card =>
                card.suit && ['Circle', 'Triangle', 'Square'].includes(card.suit)
            )).toBe(true);
        });
    });

    describe('Card Improvement', () => {
        it('should handle card improvement correctly', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const initialGame = gameManager.getGameState(TEST_GAME_ID);
            const initialSelection = [...initialGame.players[0].selectedCards];
            const initialHand = [...initialGame.players[0].hand];

            gameManager.improveCards(TEST_GAME_ID, players[0], [0, 1]);

            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            expect(updatedGame.players[0].selectedCards.length).toBe(initialSelection.length + 2);
            expect(updatedGame.players[0].hand.length).toBe(initialHand.length - 2);
        });

        it('should throw error when improving cards in wrong phase', () => {
            setupGameInProgress();
            expect(() => {
                gameManager.improveCards(TEST_GAME_ID, 'Player 1', [0, 1]);
            }).toThrow('Cannot improve cards in current phase');
        });

        it('should throw error when improving cards with invalid indices', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            expect(() => {
                gameManager.improveCards(TEST_GAME_ID, players[0], [10, 11]);
            }).toThrow('Invalid card indices');
        });

        it('should transition to reveal phase when all players complete improvement', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // First player improves all cards
            gameManager.improveCards(TEST_GAME_ID, players[0], [0, 1, 2, 3, 4]);
            // Second player improves all cards
            gameManager.improveCards(TEST_GAME_ID, players[1], [0, 1, 2, 3, 4]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('reveal');
        });
    });

    describe('Round End', () => {
        it('should handle round end and reset game state', () => {
            setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, 'Player 1', [0]);
            gameManager.selectCards(TEST_GAME_ID, 'Player 2', [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('setup');
            expect(game.pot).toBe(0);
        });

        it('should throw error when ending round without target number or preferred suit', () => {
            startGameWithPlayers();
            expect(() => gameManager.endRound(TEST_GAME_ID))
                .toThrow('Cannot end round: target number or preferred suit not set');
        });
    });

    describe('Player Management', () => {
        it('should handle player leaving scenarios', () => {
            // Test single player leaving
            setupGame(2);
            gameManager.leaveGame(TEST_GAME_ID, 'Player 1');
            expect(gameManager.getGameState(TEST_GAME_ID).players).toHaveLength(1);

            // Test last player leaving
            gameManager.leaveGame(TEST_GAME_ID, 'Player 2');
            expect(() => {
                gameManager.getGameState(TEST_GAME_ID);
            }).toThrow('Game not found');
        });
    });
}); 