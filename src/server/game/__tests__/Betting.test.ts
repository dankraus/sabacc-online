import { GameManager } from '../GameManager';
import { GameEventEmitter } from '../GameEventEmitter';
import { GameState } from '../../../shared/types/game';
import { createMockEventEmitter } from '../testUtils';

describe('Simplified Betting System', () => {
    let gameManager: GameManager;
    let mockEventEmitter: ReturnType<typeof createMockEventEmitter>;
    const TEST_GAME_ID = 'test-game';

    beforeEach(() => {
        jest.clearAllMocks();
        mockEventEmitter = createMockEventEmitter();
        gameManager = new GameManager(mockEventEmitter);
    });

    const setupGameInProgress = () => {
        gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player-1');
        gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player-2');
        gameManager.startGame(TEST_GAME_ID, 'player-1');
        gameManager.rollDice(TEST_GAME_ID);
        return ['player-1', 'player-2'];
    };

    describe('Ante', () => {
        it('should collect ante from all players at game start', () => {
            setupGameInProgress();
            const game = gameManager.getGameState(TEST_GAME_ID);

            expect(game.pot).toBe(10); // 5 ante per player
            expect(game.players[0].chips).toBe(95); // 100 - 5 ante
            expect(game.players[1].chips).toBe(95); // 100 - 5 ante
        });
    });

    describe('Betting Phase Management', () => {
        it('should start betting phase when all players select cards', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('first_betting');
            expect(game.bettingPhaseStarted).toBe(true);
            expect(game.bettingRoundComplete).toBe(false);
            expect(game.currentPlayer).toBe(players[0]); // Dealer acts first
        });

        it('should start second betting phase after sabacc shift', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('second_betting');
            expect(game.bettingPhaseStarted).toBe(true);
            expect(game.bettingRoundComplete).toBe(false);
            expect(game.currentPlayer).toBe(players[0]); // Dealer acts first
        });
    });

    describe('Continue Playing Action', () => {
        it('should allow players to continue playing', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            const gameBefore = gameManager.getGameState(TEST_GAME_ID);
            const initialPot = gameBefore.pot;
            const initialChips = gameBefore.players[0].chips;

            gameManager.continuePlaying(TEST_GAME_ID, players[0]);

            const gameAfter = gameManager.getGameState(TEST_GAME_ID);
            expect(gameAfter.pot).toBe(initialPot + 2); // 2 chips added to pot
            expect(gameAfter.players[0].chips).toBe(initialChips - 2); // 2 chips deducted
            expect(gameAfter.players[0].hasActed).toBe(true);
            expect(gameAfter.players[0].bettingAction).toBe('continue');
            expect(gameAfter.currentPlayer).toBe(players[1]); // Next player's turn
        });

        it('should complete betting phase when all players act', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            gameManager.continuePlaying(TEST_GAME_ID, players[1]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.bettingRoundComplete).toBe(true);
            expect(game.players[0].hasActed).toBe(true);
            expect(game.players[1].hasActed).toBe(true);
        });

        it('should throw error if insufficient chips', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            // Set player's chips to less than continue cost
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players[0].chips = 1;

            expect(() => {
                gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            }).toThrow('Insufficient chips to continue playing');
        });
    });

    describe('Fold Action', () => {
        it('should allow players to fold', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.fold(TEST_GAME_ID, players[0]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.players[0].isActive).toBe(false);
            expect(game.players[0].hasActed).toBe(true);
            expect(game.players[0].bettingAction).toBe('fold');
            expect(game.players[0].hand).toHaveLength(0);
            expect(game.players[0].selectedCards).toHaveLength(0);
            expect(game.currentPlayer).toBe(players[1]); // Next player's turn
        });

        it('should set pending winner when all but one player folds', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.fold(TEST_GAME_ID, players[0]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect((game as any)._pendingWinner).toBe(players[1]);
        });
    });

    describe('Betting Validation', () => {
        it('should not allow betting actions before betting phase starts', () => {
            setupGameInProgress();
            expect(() => {
                gameManager.fold(TEST_GAME_ID, 'player-1');
            }).toThrow('Betting phase has not started');
        });

        it('should not allow inactive players to act', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.fold(TEST_GAME_ID, players[0]);
            expect(() => {
                gameManager.fold(TEST_GAME_ID, players[0]);
            }).toThrow('Player is not active');
        });

        it('should not allow players to act twice', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            expect(() => {
                gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            }).toThrow('Player has already acted this betting phase');
        });

        it('should not allow wrong player to act', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            expect(() => {
                gameManager.continuePlaying(TEST_GAME_ID, players[1]);
            }).toThrow('Not your turn to act');
        });

        it('should not allow actions after betting phase is complete', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            gameManager.continuePlaying(TEST_GAME_ID, players[1]);

            expect(() => {
                gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            }).toThrow('Betting phase has not started');
        });
    });

    describe('Betting Order', () => {
        it('should follow dealer-first, clockwise order', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPlayer).toBe(players[0]); // Dealer acts first

            gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            expect(game.currentPlayer).toBe(players[1]); // Next player clockwise
        });

        it('should skip folded players in betting order', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.fold(TEST_GAME_ID, players[0]);
            // Since player 0 folded, player 1 should be the only one left to act
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPlayer).toBe(players[1]);
            expect(game.bettingRoundComplete).toBe(false);

            gameManager.continuePlaying(TEST_GAME_ID, players[1]);
            expect(game.bettingRoundComplete).toBe(true);
        });
    });

    describe('Pot Management', () => {
        it('should calculate pot correctly with continues and folds', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            // Both players continue
            gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            gameManager.continuePlaying(TEST_GAME_ID, players[1]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.pot).toBe(14); // 10 (ante) + 2 + 2 (continues)
        });

        it('should award pot to winner at end of round', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const initialPot = gameManager.getGameState(TEST_GAME_ID).pot;
            gameManager.endRound(TEST_GAME_ID);

            const game = gameManager.getGameState(TEST_GAME_ID);
            // Pot should contain ante for the next round (5 chips per player)
            expect(game.pot).toBe(10); // 2 players * 5 ante
            // Winner should have received the previous round's pot, but also paid ante for next round
            // Starting chips: 95 (after first ante), + initialPot (won), - 5 (ante for next round)
            expect(game.players.some(p => p.chips === 95 + initialPot - 5)).toBe(true);
        });
    });

    describe('Phase Transitions', () => {
        it('should transition to reveal phase when improvement and betting are complete', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            // Complete betting phase
            gameManager.continuePlaying(TEST_GAME_ID, players[0]);
            gameManager.continuePlaying(TEST_GAME_ID, players[1]);

            // Complete improvement phase - add all cards from hand to selection
            const gameBeforeImprove = gameManager.getGameState(TEST_GAME_ID);
            const player0HandSize = gameBeforeImprove.players[0].hand.length;
            const player1HandSize = gameBeforeImprove.players[1].hand.length;

            if (player0HandSize > 0) {
                const allIndices = Array.from({ length: player0HandSize }, (_, i) => i);
                gameManager.improveCards(TEST_GAME_ID, players[0], allIndices);
            }
            if (player1HandSize > 0) {
                const allIndices = Array.from({ length: player1HandSize }, (_, i) => i);
                gameManager.improveCards(TEST_GAME_ID, players[1], allIndices);
            }

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('reveal');
        });
    });
}); 