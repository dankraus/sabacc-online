import { GameManager } from '../GameManager';
import { GameEventEmitter } from '../GameEventEmitter';
import { GameState, Player, DEFAULT_GAME_SETTINGS, Suit } from '../../../shared/types/game';
import { createDeck } from '../../../shared/types/gameUtils';
import { createMockEventEmitter } from '../testUtils';

describe('GameManager', () => {
    let gameManager: GameManager;
    let mockEventEmitter: ReturnType<typeof createMockEventEmitter>;
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
        mockEventEmitter = createMockEventEmitter();
        gameManager = new GameManager(mockEventEmitter);
    });

    afterEach(() => {
        jest.useRealTimers();
        // Clear any pending timers
        jest.clearAllTimers();
    });

    describe('Game Initialization', () => {
        // Basic functionality moved to integration tests - testing manager coordination
        // Unit tests focus on error cases and edge conditions

        it('should throw error when game is full', () => {
            setupGame(DEFAULT_GAME_SETTINGS.maxPlayers);
            expect(() => {
                gameManager.joinGame(TEST_GAME_ID, 'Extra Player', 'extra-player');
            }).toThrow('Game is full');
        });
    });

    describe('Game Start', () => {
        // Basic functionality moved to integration tests - testing manager coordination
        // Unit tests focus on error cases and edge conditions

        it('should throw error when starting non-existent game', () => {
            expect(() => {
                gameManager.startGame('non-existent');
            }).toThrow('Game not found');
        });

        it('should throw error when non-dealer tries to start game', () => {
            gameManager = new GameManager(mockEventEmitter);
            const players = setupGame(2);
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[1].id);
            }).toThrow('Only the dealer can start the game');
        });

        it('should throw error when starting game with insufficient players', () => {
            gameManager = new GameManager(mockEventEmitter);
            const players = setupGame(1);
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[0].id);
            }).toThrow('Not enough players to start the game');
        });

        it('should throw error when starting game that is already in progress', () => {
            gameManager = new GameManager(mockEventEmitter);
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

        it('should correctly enforce discarding unselected cards before drawing new ones', () => {
            const players = setupGameInProgress();
            const initialGame = gameManager.getGameState(TEST_GAME_ID);

            // Player selects 2 cards, so 3 cards should be discarded
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0, 1]);

            // Store the selected cards to verify they remain
            const selectedCards = [...initialGame.players[0].selectedCards];

            // Store the original hand to verify unselected cards are discarded
            const originalHand = [...initialGame.players[0].hand];
            const unselectedCards = originalHand.filter(card => !selectedCards.includes(card));

            gameManager.handleSabaccShift(TEST_GAME_ID);

            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            const player = updatedGame.players[0];

            // Verify that selected cards are still in the player's hand
            selectedCards.forEach(selectedCard => {
                expect(player.hand).toContainEqual(selectedCard);
            });

            // Verify that unselected cards are no longer in the hand
            unselectedCards.forEach(unselectedCard => {
                expect(player.hand).not.toContainEqual(unselectedCard);
            });

            // Verify that new cards were drawn (hand should be 5 cards total)
            expect(player.hand.length).toBe(5);

            // Verify that the number of new cards drawn equals the number discarded
            const newCards = player.hand.filter(card => !selectedCards.includes(card));
            expect(newCards.length).toBe(unselectedCards.length);
        });
    });

    describe('Card Improvement', () => {
        it('should handle card improvement correctly', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // Complete the second betting phase first
            gameManager.continuePlaying(TEST_GAME_ID, players[0].id);
            gameManager.continuePlaying(TEST_GAME_ID, players[1].id);

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

            // Complete the second betting phase first
            gameManager.continuePlaying(TEST_GAME_ID, players[0].id);
            gameManager.continuePlaying(TEST_GAME_ID, players[1].id);

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
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('setup');
            // Pot should contain ante for the next round (5 chips per player)
            expect(game.pot).toBe(10); // 2 players * 5 ante
        });

        it('should throw error when ending round without target number or preferred suit', () => {
            startGameWithPlayers();
            // Manually clear the target number and preferred suit to test the error case
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.targetNumber = null;
            game.preferredSuit = null;
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

            // End round and verify immediate transition to setup phase
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('setup');
        });

        it('should end game when each player has dealt once', () => {
            const players = setupGameInProgress();
            const game = gameManager.getGameState(TEST_GAME_ID);

            // Complete first round (player 0 deals)
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start second round (player 1 deals)
            gameManager.startGame(TEST_GAME_ID, players[1].id);

            // Complete second round
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

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

            // Complete first round (player 0 deals)
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start second round (player 1 deals)
            gameManager.startGame(TEST_GAME_ID, players[1].id);

            // Complete second round
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);

            // Mock the gameEnded event
            const gameEndedHandler = jest.fn();
            mockEventEmitter.emitGameEnded = gameEndedHandler;

            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Get actual winner and chip values from game state
            const winner = game.players.reduce((prev, curr) => (curr.chips > prev.chips ? curr : prev));
            const allPlayers = game.players.map(p => ({ name: p.name, finalChips: p.chips }));
            expect(gameEndedHandler).toHaveBeenCalledWith(game, winner.name, winner.chips, allPlayers);
        });

        it('should properly rotate dealer each round', () => {
            const players = setupGameInProgress();
            let game = gameManager.getGameState(TEST_GAME_ID);

            // Complete first round
            gameManager.selectCards(TEST_GAME_ID, players[0].id, [0]);
            gameManager.selectCards(TEST_GAME_ID, players[1].id, [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase and verify game status
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
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase and verify game status
            game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.status).toBe('ended'); // Game should end after each player has dealt once

            // The test is complete - both players have dealt once
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

    describe('Dealer Rotation Validation', () => {
        beforeEach(() => {
            // Clear any existing games
            gameManager['games'].clear();
        });

        it('should track dealers used correctly', () => {
            // Create a fresh game
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player2');

            const game = gameManager.getGameState(TEST_GAME_ID);

            // Ensure players have enough chips for ante
            ensurePlayersHaveChips(game, 10);

            // Start first round - player 0 should be marked as dealer
            gameManager.startGame(TEST_GAME_ID, 'player1');
            expect(game.dealersUsed.has('player1')).toBe(true);
            expect(game.dealersUsed.size).toBe(1);

            // Complete first round
            gameManager.selectCards(TEST_GAME_ID, 'player1', [0]);
            gameManager.selectCards(TEST_GAME_ID, 'player2', [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start second round - player 1 should be marked as dealer
            gameManager.startGame(TEST_GAME_ID, 'player2');
            expect(game.dealersUsed.has('player2')).toBe(true);
            expect(game.dealersUsed.size).toBe(2);
        });

        it('should validate that each player deals exactly once', () => {
            // Create a fresh game
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player2');

            let game = gameManager.getGameState(TEST_GAME_ID);

            // Ensure players have enough chips for ante
            ensurePlayersHaveChips(game, 10);

            // Start first round
            gameManager.startGame(TEST_GAME_ID, 'player1');

            // Complete first round
            gameManager.selectCards(TEST_GAME_ID, 'player1', [0]);
            gameManager.selectCards(TEST_GAME_ID, 'player2', [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase
            game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start second round
            gameManager.startGame(TEST_GAME_ID, 'player2');

            // Complete second round
            gameManager.selectCards(TEST_GAME_ID, 'player1', [0]);
            gameManager.selectCards(TEST_GAME_ID, 'player2', [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Game should end after each player has dealt once
            expect(game.status).toBe('ended');
        });



        it('should provide accurate dealer rotation information', () => {
            // Create a fresh game
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player2');

            const game = gameManager.getGameState(TEST_GAME_ID);

            // Ensure players have enough chips for ante
            ensurePlayersHaveChips(game, 10);

            // Start first round
            gameManager.startGame(TEST_GAME_ID, 'player1');

            const rotationInfo = gameManager.getDealerRotationInfo(TEST_GAME_ID);
            expect(rotationInfo.currentDealer).toBe('Player 1');
            expect(rotationInfo.dealersUsed).toEqual(['Player 1']);
            expect(rotationInfo.playersNotDealt).toEqual(['Player 2']);
            expect(rotationInfo.roundNumber).toBe(1);
            expect(rotationInfo.totalPlayers).toBe(2);
            expect(rotationInfo.gameShouldEnd).toBe(false);

            // Complete first round
            gameManager.selectCards(TEST_GAME_ID, 'player1', [0]);
            gameManager.selectCards(TEST_GAME_ID, 'player2', [0]);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start second round
            gameManager.startGame(TEST_GAME_ID, 'player2');

            const rotationInfo2 = gameManager.getDealerRotationInfo(TEST_GAME_ID);
            expect(rotationInfo2.currentDealer).toBe('Player 2');
            expect(rotationInfo2.dealersUsed).toEqual(['Player 1', 'Player 2']);
            expect(rotationInfo2.playersNotDealt).toEqual([]);
            expect(rotationInfo2.roundNumber).toBe(1); // Round number is incremented after endRound
            expect(rotationInfo2.totalPlayers).toBe(2);
            expect(rotationInfo2.gameShouldEnd).toBe(false); // Game should not end yet
        });

        it('should handle dealer rotation with more than 2 players', () => {
            // Create a fresh game with 3 players
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player2');
            gameManager.joinGame(TEST_GAME_ID, 'Player 3', 'player3');

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.players.length).toBe(3);

            // Ensure players have enough chips for ante
            ensurePlayersHaveChips(game, 10);

            // Start first round
            gameManager.startGame(TEST_GAME_ID, 'player1');
            expect(game.dealersUsed.has('player1')).toBe(true);

            // Complete first round
            game.players.forEach(player => {
                gameManager.selectCards(TEST_GAME_ID, player.id, [0]);
            });
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start second round
            gameManager.startGame(TEST_GAME_ID, 'player2');
            expect(game.dealersUsed.has('player2')).toBe(true);

            // Complete second round
            game.players.forEach(player => {
                gameManager.selectCards(TEST_GAME_ID, player.id, [0]);
            });
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Wait for transition to setup phase
            expect(game.status).toBe('waiting');

            // Ensure players have enough chips for the next round
            ensurePlayersHaveChips(game, 20);

            // Start third round
            gameManager.startGame(TEST_GAME_ID, 'player3');
            expect(game.dealersUsed.has('player3')).toBe(true);

            // Complete third round
            game.players.forEach(player => {
                gameManager.selectCards(TEST_GAME_ID, player.id, [0]);
            });
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.endRound(TEST_GAME_ID, true); // Use immediate transition for tests

            // Verify all players have dealt (this is the main test)
            expect(game.dealersUsed.size).toBe(3);
            expect(game.dealersUsed.has('player1')).toBe(true);
            expect(game.dealersUsed.has('player2')).toBe(true);
            expect(game.dealersUsed.has('player3')).toBe(true);

            // Check dealer rotation info
            const rotationInfo = gameManager.getDealerRotationInfo(TEST_GAME_ID);
            expect(rotationInfo.dealersUsed).toEqual(['Player 1', 'Player 2', 'Player 3']);
            expect(rotationInfo.playersNotDealt).toEqual([]);
            expect(rotationInfo.totalPlayers).toBe(3);
        });
    });
}); 