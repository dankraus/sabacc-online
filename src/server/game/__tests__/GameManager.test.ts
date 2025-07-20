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
        const game = gameManager.getGameState(TEST_GAME_ID);
        // Ensure players have enough chips for ante
        ensurePlayersHaveChips(game, 10);
        gameManager.startGame(TEST_GAME_ID, players[0].id);
        return players;
    };

    const setupGameInProgress = () => {
        const players = startGameWithPlayers();
        gameManager.rollDice(TEST_GAME_ID);
        return players;
    };

    // Helper function to ensure players have enough chips for ante
    const ensurePlayersHaveChips = (game: any, minChips: number = 10) => {
        game.players.forEach((player: any) => {
            if (player.chips < minChips) {
                player.chips = minChips;
            }
        });
    };

    const createTestCard = () => ({
        value: 1,
        suit: 'Circle' as Suit,
        isWild: false
    });

    beforeEach(() => {
        jest.useFakeTimers();
        mockServer = new Server();
        gameManager = new GameManager(mockServer);
    });

    afterEach(() => {
        jest.useRealTimers();
        // Clear any pending timers
        jest.clearAllTimers();
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

        it('should transition to reveal phase when all players complete improvement and betting', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // Complete betting phase first
            gameManager.continuePlaying(TEST_GAME_ID, players[0].id);
            gameManager.continuePlaying(TEST_GAME_ID, players[1].id);

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
            // Pot should contain ante for the next round (5 chips per player)
            expect(game.pot).toBe(10); // 2 players * 5 ante
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
        beforeEach(() => {
            setupGame();
        });

        it('should throw error when game has ended', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.status = 'ended';
            expect(() => gameManager['validateGameState'](game)).toThrow('Game has ended');
        });

        it('should throw error when not enough players to continue', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.status = 'in_progress';
            game.players = [game.players[0]];
            expect(() => gameManager['validateGameState'](game)).toThrow('Not enough players to continue the game');
        });

        it('should throw error when player has negative chips', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players[0].chips = -1;
            expect(() => gameManager['validateGameState'](game)).toThrow('Player Player 1 has negative chips');
        });

        it('should throw error when deck has negative cards', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            (game as any).deck = { length: -1 };
            expect(() => gameManager['validateGameState'](game)).toThrow('Invalid deck state: negative number of cards');
        });

        it('should throw error when pot is negative', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.pot = -1;
            expect(() => gameManager['validateGameState'](game)).toThrow('Invalid pot state: negative pot value');
        });

        it('should throw error when dealer index is invalid', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.status = 'in_progress';
            game.dealerIndex = 10;
            expect(() => gameManager['validateGameState'](game)).toThrow('Invalid dealer index');
        });
    });

    describe('Player Joining Validation', () => {
        beforeEach(() => {
            setupGame();
        });

        it('should throw error when player is already in game', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(() => gameManager['validatePlayerCanJoin'](game, 'player-1')).toThrow('Player is already in the game');
        });

        it('should allow player to join even with insufficient chips for ante (ante is collected per round)', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.status = 'in_progress';
            game.settings.startingChips = 4;
            // Should not throw since ante validation is done per round, not when joining
            expect(() => gameManager['validatePlayerCanJoin'](game, 'newPlayer')).not.toThrow();
        });
    });

    describe('Phase Transition Validation', () => {
        beforeEach(() => {
            setupGame();
        });

        it('should throw error for invalid phase transition', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(() => gameManager['validatePhaseTransition'](game, 'setup', 'reveal')).toThrow('Invalid phase transition from setup to reveal');
        });

        it('should throw error when not all players have selected cards', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.currentPhase = 'selection';
            game.players[0].selectedCards = [];
            expect(() => gameManager['validatePhaseTransition'](game, 'selection', 'first_betting')).toThrow('All players must select cards before proceeding');
        });

        it('should not throw error when active player has insufficient chips for ante (ante is collected at round start)', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.currentPhase = 'first_betting';
            game.players[0].chips = 4;
            // Should not throw since ante validation is done at round start, not during phase transitions
            expect(() => gameManager['validatePhaseTransition'](game, 'first_betting', 'sabacc_shift')).not.toThrow();
        });

        it('should throw error when active player has not completed improvement', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.currentPhase = 'improve';
            game.players[0].hand = [createTestCard()];
            expect(() => gameManager['validatePhaseTransition'](game, 'improve', 'reveal')).toThrow('All active players must complete improvement');
        });
    });

    describe('Phase Timeout Handling', () => {
        beforeEach(() => {
            setupGame();
        });

        it('should auto-select first card for inactive players in selection phase', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.currentPhase = 'selection';
            game.players[0].selectedCards = [];
            game.players[0].hand = [createTestCard(), createTestCard()];
            gameManager['handlePhaseTimeout'](game);
            expect(game.players[0].selectedCards.length).toBe(1);
            expect(game.players[0].hand.length).toBe(1);
        });

        it('should auto-fold inactive players who have not acted in first betting phase', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.currentPhase = 'first_betting';
            game.players[0].hasActed = false;
            gameManager['handlePhaseTimeout'](game);
            expect(game.players[0].isActive).toBe(false);
            expect(game.players[0].hand.length).toBe(0);
            expect(game.players[0].selectedCards.length).toBe(0);
        });

        it('should auto-complete improvement for inactive players', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.currentPhase = 'improve';
            game.players[0].hand = [createTestCard(), createTestCard()];
            gameManager['handlePhaseTimeout'](game);
            expect(game.players[0].hand.length).toBe(0);
            expect(game.players[0].selectedCards.length).toBe(2);
        });
    });

    describe('Disconnect Handling', () => {
        beforeEach(() => {
            setupGame();
        });

        it('should handle player disconnect by removing them from game', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            gameManager.handleDisconnect('player-1');
            expect(game.players.find(p => p.id === 'player-1')).toBeUndefined();
        });

        it('should do nothing when disconnected player is not in any game', () => {
            const game = gameManager.getGameState(TEST_GAME_ID);
            const initialPlayerCount = game.players.length;
            gameManager.handleDisconnect('nonexistentPlayer');
            expect(game.players.length).toBe(initialPlayerCount);
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
            const game = gameManager.getGameState(TEST_GAME_ID);

            // Set round number to trigger game end
            game.roundNumber = game.players.length;

            // Complete a round
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID);

            // Verify game has ended
            expect(game.status).toBe('ended');
            expect(game.currentPhase).toBe('setup');
            expect(game.pot).toBe(0);
            expect(game.deck).toHaveLength(0);
            expect(game.currentDiceRoll).toBeNull();
            expect(game.targetNumber).toBeNull();
            expect(game.preferredSuit).toBeNull();
            game.players.forEach((player: any) => {
                expect(player.hand).toHaveLength(0);
                expect(player.selectedCards).toHaveLength(0);
                expect(player.isActive).toBe(false);
            });
        });

        // Skipped: phase completion and timeout handling tests that rely on private/internal logic
    });

    describe('Game End Conditions', () => {
        it('should determine winner based on chip count', () => {
            const players = setupGameInProgress();
            const game = gameManager.getGameState(TEST_GAME_ID);

            // Set different chip amounts
            game.players[0].chips = 150;
            game.players[1].chips = 200;

            // Set round number to trigger game end
            game.roundNumber = game.players.length;

            // Complete a round
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // Mock the gameEnded event
            const gameEndedHandler = jest.fn();
            mockServer.to(TEST_GAME_ID).emit = gameEndedHandler;

            gameManager.endRound(TEST_GAME_ID);

            // Get actual winner and chip values from game state
            const winner = game.players.reduce((prev, curr) => (curr.chips > prev.chips ? curr : prev));
            const allPlayers = game.players.map(p => ({ name: p.name, finalChips: p.chips }));
            expect(gameEndedHandler).toHaveBeenCalledWith('gameEnded', {
                winner: winner.name,
                finalChips: winner.chips,
                allPlayers
            });
        });

        it('should properly rotate dealer each round', () => {
            const players = setupGameInProgress();
            let game = gameManager.getGameState(TEST_GAME_ID);

            // Complete first round
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID);

            // Wait for transition to setup phase and verify game status
            jest.advanceTimersByTime(3000);
            game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start next round (this will deal hands and set up the round)
            gameManager.startGame(TEST_GAME_ID, players[1].id);
            game = gameManager.getGameState(TEST_GAME_ID);

            // Verify dealer has rotated
            expect(game.dealerIndex).toBe(1);

            // Complete second round
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID);

            // Wait for transition to setup phase and verify game status
            jest.advanceTimersByTime(3000);
            game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start next round (this will deal hands and set up the round)
            gameManager.startGame(TEST_GAME_ID, players[0].id);
            game = gameManager.getGameState(TEST_GAME_ID);

            // Verify dealer has rotated back
            expect(game.dealerIndex).toBe(0);
        });

        it('should handle invalid dealer index by throwing error on game start', () => {
            const players = setupGameInProgress();
            const game = gameManager.getGameState(TEST_GAME_ID);

            // Ensure players have enough chips
            ensurePlayersHaveChips(game, 20);

            // Set invalid dealer index
            game.dealerIndex = game.players.length;

            // Attempt to start a new round
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
            }).toThrow('Invalid dealer index');
        });
    });
}); 