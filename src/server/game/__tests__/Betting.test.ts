import { Server } from 'socket.io';
import { GameManager } from '../GameManager';
import { GameState } from '../../../shared/types/game';

describe('Betting System', () => {
    let gameManager: GameManager;
    let mockServer: Server;
    const TEST_GAME_ID = 'test-game';

    beforeEach(() => {
        jest.clearAllMocks();
        mockServer = new Server();
        gameManager = new GameManager(mockServer);
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

    describe('Betting Rounds', () => {
        it('should allow players to continue playing in first betting phase', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('first_betting');
        });

        it('should allow players to fold in first betting phase', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.fold(TEST_GAME_ID, players[0]);
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.players[0].isActive).toBe(false);
        });

        it('should allow players to continue playing in second betting phase', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.currentPhase).toBe('improve');
        });

        it('should allow players to fold in second betting phase', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            gameManager.fold(TEST_GAME_ID, players[0]);
            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.players[0].isActive).toBe(false);
        });
    });

    describe('Betting Validation', () => {
        it('should not allow betting in incorrect phase', () => {
            setupGameInProgress();
            expect(() => {
                gameManager.fold(TEST_GAME_ID, 'player-1');
            }).toThrow('Cannot fold in current phase');
        });

        it('should not allow inactive players to bet', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            gameManager.fold(TEST_GAME_ID, players[0]);
            expect(() => {
                gameManager.fold(TEST_GAME_ID, players[0]);
            }).toThrow('Player is not active');
        });

        it('should not allow players to bet more than their available chips', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);

            // Set player's chips to a low amount
            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players[0].chips = 5;

            expect(() => {
                gameManager.placeBet(TEST_GAME_ID, players[0], 10);
            }).toThrow('Insufficient chips for bet');
        });
    });

    describe('Pot Management', () => {
        it('should award pot to winner at end of round', () => {
            const players = setupGameInProgress();
            gameManager.selectCards(TEST_GAME_ID, players[0], [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, players[1], [0, 1]);
            gameManager.handleSabaccShift(TEST_GAME_ID);

            const initialPot = gameManager.getGameState(TEST_GAME_ID).pot;
            gameManager.endRound(TEST_GAME_ID);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.pot).toBe(0);
            // Winner should have received the pot
            expect(game.players.some(p => p.chips === 95 + initialPot)).toBe(true);
        });
    });

    describe('Betting Mechanics', () => {
        it('should handle betting correctly', () => {
            // Setup game with two players
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player-1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player-2');
            gameManager.startGame(TEST_GAME_ID, 'player-1');
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, 'player-1', [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, 'player-2', [0, 1]);

            // Place bets
            gameManager.placeBet(TEST_GAME_ID, 'player-1', 10);
            gameManager.placeBet(TEST_GAME_ID, 'player-2', 20);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.pot).toBe(40); // 5 ante per player + 10 + 20
            expect(game.players[0].chips).toBe(85); // 100 - 5 ante - 10 bet
            expect(game.players[1].chips).toBe(75); // 100 - 5 ante - 20 bet
        });

        it('should throw error when betting more than available chips', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player-1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player-2');
            gameManager.startGame(TEST_GAME_ID, 'player-1');
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, 'player-1', [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, 'player-2', [0, 1]);

            expect(() => {
                gameManager.placeBet(TEST_GAME_ID, 'player-1', 101);
            }).toThrow('Insufficient chips for bet');
        });

        it('should throw error when betting in wrong phase', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player-1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player-2');
            gameManager.startGame(TEST_GAME_ID, 'player-1');

            expect(() => {
                gameManager.placeBet(TEST_GAME_ID, 'player-1', 10);
            }).toThrow('Cannot bet in current phase');
        });

        it('should handle folding correctly', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player-1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player-2');
            gameManager.startGame(TEST_GAME_ID, 'player-1');
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, 'player-1', [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, 'player-2', [0, 1]);

            gameManager.fold(TEST_GAME_ID, 'player-1');

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.players[0].isActive).toBe(false);
            expect(game.players[0].hand).toHaveLength(0);
            expect(game.players[0].selectedCards).toHaveLength(0);
        });

        it('should handle automatic win when all but one player folds', () => {
            gameManager.joinGame(TEST_GAME_ID, 'Player 1', 'player-1');
            gameManager.joinGame(TEST_GAME_ID, 'Player 2', 'player-2');
            gameManager.startGame(TEST_GAME_ID, 'player-1');
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, 'player-1', [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, 'player-2', [0, 1]);

            gameManager.fold(TEST_GAME_ID, 'player-1');
            gameManager.endRound(TEST_GAME_ID);

            const game = gameManager.getGameState(TEST_GAME_ID);
            expect(game.players[1].chips).toBe(105); // 100 - 5 ante + 40 pot - 20 bet
        });
    });
}); 