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
        const players = Array.from({ length: numPlayers }, (_, i) => ({
            name: `Player ${i + 1}`,
            id: `player-${i + 1}`
        }));
        players.forEach(player => gameManager.joinGame(TEST_GAME_ID, player.name, player.id));
        return players;
    };

    const startGameWithPlayers = (numPlayers: number = 2) => {
        const players = setupGame(numPlayers);
        gameManager.startGame(TEST_GAME_ID, players[0].id);
        return players;
    };

    const setupGameInProgress = () => {
        const players = startGameWithPlayers();
        gameManager.rollDice(TEST_GAME_ID);
        return players;
    };

    beforeEach(() => {
        jest.useFakeTimers();
        mockServer = new Server();
        gameManager = new GameManager(mockServer);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Game Initialization', () => {
        it('should create a new game when joining with valid gameId', () => {
            const playerName = 'Test Player';
            const playerId = 'test-player-1';
            const result = gameManager.joinGame(TEST_GAME_ID, playerName, playerId);

            expect(result.id).toBe(TEST_GAME_ID);
            expect(result.status).toBe('waiting');
            expect(result.currentPhase).toBe('setup');
            expect(result.players).toHaveLength(1);
            expect(result.players[0].name).toBe(playerName);
            expect(result.players[0].id).toBe(playerId);
            expect(result.deck).toHaveLength(createDeck().length);
            expect(result.currentDiceRoll).toBeNull();
            expect(result.targetNumber).toBeNull();
            expect(result.preferredSuit).toBeNull();
            expect(result.roundNumber).toBe(0);
        });

        it('should handle multiple players joining', () => {
            const players = setupGame(3);
            const result = gameManager.getGameState(TEST_GAME_ID);

            expect(result.players).toHaveLength(3);
            players.forEach(player => {
                expect(result.players.map(p => p.id)).toContain(player.id);
                expect(result.players.map(p => p.name)).toContain(player.name);
            });
        });

        it('should throw error when game is full', () => {
            setupGame(DEFAULT_GAME_SETTINGS.maxPlayers);
            expect(() => {
                gameManager.joinGame(TEST_GAME_ID, 'Extra Player', 'extra-player');
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
            const players = setupGame(2);
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[1].id);
            }).toThrow('Only the dealer can start the game');
        });

        it('should throw error when starting game with insufficient players', () => {
            mockServer = new Server();
            gameManager = new GameManager(mockServer);
            const players = setupGame(1);
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
            }).toThrow('Not enough players to start the game');
        });

        it('should throw error when starting game that is already in progress', () => {
            mockServer = new Server();
            gameManager = new GameManager(mockServer);
            const players = setupGame(2);
            gameManager.startGame(TEST_GAME_ID, players[0].id);
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
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
        it('should handle card selection correctly', () => {
            const players = setupGameInProgress();
            const result = gameManager.getGameState(TEST_GAME_ID);

            // Test card selection
            const selectedIndices = [0, 1];
            gameManager.selectCards(TEST_GAME_ID, players[0].id, selectedIndices);
            expect(result.players[0].selectedCards).toHaveLength(2);
            expect(result.players[0].hand).toHaveLength(3);

            // Test phase transition when all players select
            gameManager.selectCards(TEST_GAME_ID, players[1].id, selectedIndices);
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
            const players = setupGameInProgress();
            const initialGame = gameManager.getGameState(TEST_GAME_ID);
            const originalHand = [...initialGame.players[0].hand];

            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0, 1, 2]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            expect(updatedGame.players[0].hand).not.toEqual(originalHand);
            expect(updatedGame.players[0].hand.length).toBe(5);
            expect(updatedGame.players[0].hand.every(card =>
                (card.isWild === true) || (card.suit && ['Circle', 'Triangle', 'Square'].includes(card.suit))
            )).toBe(true);
        });
    });

    describe('Card Improvement', () => {
        it('should handle card improvement correctly', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const initialGame = gameManager.getGameState(TEST_GAME_ID);
            const initialSelection = [...initialGame.players[0].selectedCards];
            const initialHand = [...initialGame.players[0].hand];

            gameManager.improveCards(TEST_GAME_ID, players[0].id, [0, 1]);

            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            expect(updatedGame.players[0].selectedCards.length).toBe(initialSelection.length + 2);
            expect(updatedGame.players[0].hand.length).toBe(initialHand.length - 2);
        });

        it('should throw error when improving cards in wrong phase', () => {
            const players = setupGameInProgress();
            expect(() => {
                gameManager.improveCards(TEST_GAME_ID, players[0].id, [0, 1]);
            }).toThrow('Cannot improve cards in current phase');
        });

        it('should throw error when improving cards with invalid indices', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            expect(() => {
                gameManager.improveCards(TEST_GAME_ID, players[0].id, [10, 11]);
            }).toThrow('Invalid card indices');
        });

        it('should transition to reveal phase when all players complete improvement', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // First player improves all cards
            gameManager.improveCards(TEST_GAME_ID, players[0].id, [0, 1, 2, 3, 4]);
            // Second player improves all cards
            gameManager.improveCards(TEST_GAME_ID, players[1].id, [0, 1, 2, 3, 4]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('reveal');
        });
    });

    describe('Player Management', () => {
        it('should handle player leaving scenarios', () => {
            // Test single player leaving
            const players = setupGame(2);
            gameManager.leaveGame(TEST_GAME_ID, players[0].id);
            expect(gameManager.getGameState(TEST_GAME_ID).players).toHaveLength(1);

            // Test last player leaving
            gameManager.leaveGame(TEST_GAME_ID, players[1].id);
            expect(() => {
                gameManager.getGameState(TEST_GAME_ID);
            }).toThrow('Game not found');
        });

        it('should throw error when leaving game with non-existent player', () => {
            setupGame(1);
            expect(() => {
                gameManager.leaveGame(TEST_GAME_ID, 'non-existent-player');
            }).toThrow('Player not found in game');
        });

        it('should handle disconnect for player not in any game', () => {
            // This should not throw any errors
            gameManager.handleDisconnect('non-existent-player');
        });
    });

    describe('Round End', () => {
        it('should handle round end and reset game state', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID);
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('round_end');
            jest.advanceTimersByTime(3000);
            expect(game.currentPhase).toBe('setup');
            expect(game.pot).toBe(0);
        });

        it('should throw error when ending round without target number or preferred suit', () => {
            startGameWithPlayers();
            expect(() => gameManager.endRound(TEST_GAME_ID))
                .toThrow('Cannot end round: target number or preferred suit not set');
        });

        it('should throw error when no winner can be determined', () => {
            const players = setupGameInProgress();
            // Get to betting phase
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            // Forcibly set all players to inactive and clear _pendingWinner
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(p => { p.isActive = false; });
            delete (game as any)._pendingWinner;
            expect(() => gameManager.endRound(TEST_GAME_ID))
                .toThrow('No winner could be determined');
        });
    });

    describe('Game State Validation', () => {
        it('should throw error when joining a game that has ended', () => {
            const players = setupGame(2);
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.status = 'ended';
            expect(() => {
                gameManager.joinGame(TEST_GAME_ID, 'New Player', 'new-player');
            }).toThrow('Game has ended');
        });

        it('should throw error when player tries to join twice', () => {
            const players = setupGame(1);
            expect(() => {
                gameManager.joinGame(TEST_GAME_ID, 'Same Player', players[0].id);
            }).toThrow('Player is already in the game');
        });

        it('should throw error when player has insufficient chips for ante', () => {
            const players = setupGame(2);
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players[0].chips = 4; // Less than ante of 5
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
            }).toThrow('does not have enough chips for ante');
        });

        it('should throw error when game has negative pot', () => {
            const players = setupGame(2);
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.pot = -1;
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
            }).toThrow('Invalid pot state: negative pot value');
        });

        it('should throw error when player has negative chips', () => {
            const players = setupGame(2);
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players[0].chips = -1;
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
            }).toThrow('has negative chips');
        });

        it('should throw error on invalid phase transition', () => {
            const players = setupGame(2);
            gameManager.startGame(TEST_GAME_ID, players[0].id);
            const game = gameManager.getGameState(TEST_GAME_ID);
            // Set to a phase where improveCards is not allowed
            game.currentPhase = 'initial_roll';
            expect(() => {
                gameManager.improveCards(TEST_GAME_ID, players[0].id, []);
            }).toThrow('Cannot improve cards in current phase');
        });

        it('should allow valid phase transitions', () => {
            const players = setupGame(2);
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
            }).not.toThrow();
        });
    });

    describe('Phase Management', () => {
        it('should handle round_end phase correctly', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // End round and verify round_end phase
            gameManager.endRound(TEST_GAME_ID);
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('round_end');

            // Wait for transition to setup phase
            jest.advanceTimersByTime(3000);
            expect(game.currentPhase).toBe('setup');
        });

        it('should end game when each player has dealt once', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // Set round number to trigger game end
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.roundNumber = game.players.length;

            // End round and verify game end
            gameManager.endRound(TEST_GAME_ID);
            expect(game.status).toBe('ended');
        });

        // Skipped: phase completion and timeout handling tests that rely on private/internal logic
    });
}); 