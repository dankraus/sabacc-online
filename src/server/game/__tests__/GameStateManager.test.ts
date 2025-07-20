import { Server } from 'socket.io';
import { GameStateManager } from '../GameStateManager';
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

describe('GameStateManager', () => {
    let gameStateManager: GameStateManager;
    let mockServer: Server;
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

    const createTestCard = () => ({
        value: 1,
        suit: 'Circle' as Suit,
        isWild: false
    });

    beforeEach(() => {
        mockServer = new Server();
        gameStateManager = new GameStateManager(mockServer);
    });

    describe('Game State Validation', () => {
        it('should throw error when game has ended', () => {
            const game = createTestGame();
            game.status = 'ended';
            expect(() => gameStateManager.validateGameState(game)).toThrow('Game has ended');
        });

        it('should throw error when not enough players to continue', () => {
            const game = createTestGame();
            game.status = 'in_progress';
            game.players = [game.players[0]];
            expect(() => gameStateManager.validateGameState(game)).toThrow('Not enough players to continue the game');
        });

        it('should throw error when player has negative chips', () => {
            const game = createTestGame();
            game.players[0].chips = -1;
            expect(() => gameStateManager.validateGameState(game)).toThrow('Player Player 1 has negative chips');
        });

        it('should throw error when deck has negative cards', () => {
            const game = createTestGame();
            (game as any).deck = { length: -1 };
            expect(() => gameStateManager.validateGameState(game)).toThrow('Invalid deck state: negative number of cards');
        });

        it('should throw error when pot is negative', () => {
            const game = createTestGame();
            game.pot = -1;
            expect(() => gameStateManager.validateGameState(game)).toThrow('Invalid pot state: negative pot value');
        });

        it('should throw error when dealer index is invalid', () => {
            const game = createTestGame();
            game.status = 'in_progress';
            game.dealerIndex = 10;
            expect(() => gameStateManager.validateGameState(game)).toThrow('Invalid dealer index');
        });

        it('should not throw error for valid game state', () => {
            const game = createTestGame();
            expect(() => gameStateManager.validateGameState(game)).not.toThrow();
        });
    });

    describe('Player Joining Validation', () => {
        it('should throw error when player is already in game', () => {
            const game = createTestGame();
            expect(() => gameStateManager.validatePlayerCanJoin(game, 'player-1')).toThrow('Player is already in the game');
        });

        it('should allow new player to join', () => {
            const game = createTestGame();
            expect(() => gameStateManager.validatePlayerCanJoin(game, 'newPlayer')).not.toThrow();
        });
    });

    describe('Game Start Validation', () => {
        it('should throw error when game is already in progress', () => {
            const game = createTestGame();
            game.status = 'in_progress';
            expect(() => gameStateManager.validateGameCanStart(game, 5)).toThrow('Game already in progress');
        });

        it('should throw error when not enough players', () => {
            const game = createTestGame();
            game.players = [game.players[0]];
            expect(() => gameStateManager.validateGameCanStart(game, 5)).toThrow('Not enough players to start the game');
        });

        it('should throw error when player has insufficient chips for ante', () => {
            const game = createTestGame();
            game.players[0].chips = 4;
            expect(() => gameStateManager.validateGameCanStart(game, 5)).toThrow('Player Player 1 does not have enough chips for ante');
        });

        it('should not throw error for valid game start conditions', () => {
            const game = createTestGame();
            expect(() => gameStateManager.validateGameCanStart(game, 5)).not.toThrow();
        });
    });

    describe('Phase Transition Validation', () => {
        it('should throw error for invalid phase transition', () => {
            const game = createTestGame();
            expect(() => gameStateManager.validatePhaseTransition(game, 'setup', 'reveal')).toThrow('Invalid phase transition from setup to reveal');
        });

        it('should throw error when not all players have selected cards', () => {
            const game = createTestGame();
            game.currentPhase = 'selection';
            game.players[0].selectedCards = [];
            expect(() => gameStateManager.validatePhaseTransition(game, 'selection', 'first_betting')).toThrow('All players must select cards before proceeding');
        });

        it('should not throw error for valid phase transition', () => {
            const game = createTestGame();
            expect(() => gameStateManager.validatePhaseTransition(game, 'setup', 'initial_roll')).not.toThrow();
        });

        it('should throw error when active player has not completed improvement', () => {
            const game = createTestGame();
            game.currentPhase = 'improve';
            game.players[0].hand = [createTestCard()];
            expect(() => gameStateManager.validatePhaseTransition(game, 'improve', 'reveal')).toThrow('All active players must complete improvement');
        });
    });

    describe('Phase Timeout Handling', () => {
        it('should auto-select first card for inactive players in selection phase', () => {
            const game = createTestGame();
            game.currentPhase = 'selection';
            game.players[0].selectedCards = [];
            game.players[0].hand = [createTestCard(), createTestCard()];
            gameStateManager.handlePhaseTimeout(game);
            expect(game.players[0].selectedCards.length).toBe(1);
            expect(game.players[0].hand.length).toBe(1);
        });

        it('should auto-fold inactive players who have not acted in betting phase', () => {
            const game = createTestGame();
            game.currentPhase = 'first_betting';
            game.players[0].hasActed = false;
            gameStateManager.handlePhaseTimeout(game);
            expect(game.players[0].isActive).toBe(false);
            expect(game.players[0].hand.length).toBe(0);
            expect(game.players[0].selectedCards.length).toBe(0);
        });

        it('should auto-complete improvement for inactive players', () => {
            const game = createTestGame();
            game.currentPhase = 'improve';
            game.players[0].hand = [createTestCard(), createTestCard()];
            gameStateManager.handlePhaseTimeout(game);
            expect(game.players[0].hand.length).toBe(0);
            expect(game.players[0].selectedCards.length).toBe(2);
        });
    });

    describe('Game End Logic', () => {
        it('should return true when all players have dealt once', () => {
            const game = createTestGame();
            game.roundNumber = 2;
            game.dealersUsed.add('player-1');
            game.dealersUsed.add('player-2');
            expect(gameStateManager.shouldEndGame(game)).toBe(true);
        });

        it('should return false when not all players have dealt', () => {
            const game = createTestGame();
            game.roundNumber = 1;
            game.dealersUsed.add('player-1');
            expect(gameStateManager.shouldEndGame(game)).toBe(false);
        });

        it('should return true when game should end after round', () => {
            const game = createTestGame();
            game.roundNumber = 1;
            game.dealersUsed.add('player-1');
            game.dealersUsed.add('player-2');
            expect(gameStateManager.shouldEndGameAfterRound(game)).toBe(true);
        });
    });

    describe('Game State Management', () => {
        it('should reset game state for new round', () => {
            const game = createTestGame();
            game.pot = 100;
            game.currentDiceRoll = { goldValue: 5, silverSuit: 'Circle' as Suit };
            game.targetNumber = 5;
            game.preferredSuit = 'Circle' as Suit;
            game.bettingPhaseStarted = true;
            game.bettingRoundComplete = true;
            game.players[0].hand = [createTestCard()];
            game.players[0].selectedCards = [createTestCard()];
            game.players[0].hasActed = true;
            game.players[0].bettingAction = 'continue';

            gameStateManager.resetGameStateForNewRound(game);

            expect(game.pot).toBe(0);
            expect(game.dealerIndex).toBe(1);
            expect(game.roundNumber).toBe(1);
            expect(game.currentPhase).toBe('round_end');
            expect(game.currentDiceRoll).toBeNull();
            expect(game.targetNumber).toBeNull();
            expect(game.preferredSuit).toBeNull();
            expect(game.bettingPhaseStarted).toBe(false);
            expect(game.bettingRoundComplete).toBe(false);
            expect(game.players[0].hand.length).toBe(0);
            expect(game.players[0].selectedCards.length).toBe(0);
            expect(game.players[0].isActive).toBe(true);
            expect(game.players[0].hasActed).toBe(false);
            expect(game.players[0].bettingAction).toBeNull();
        });

        it('should cleanup game state when game ends', () => {
            const game = createTestGame();
            game.status = 'in_progress';
            game.pot = 100;
            game.players[0].hand = [createTestCard()];
            game.players[0].selectedCards = [createTestCard()];

            gameStateManager.cleanupGameState(game);

            expect(game.status).toBe('ended');
            expect(game.currentPhase).toBe('setup');
            expect(game.pot).toBe(0);
            expect(game.deck.length).toBe(0);
            expect(game.currentDiceRoll).toBeNull();
            expect(game.targetNumber).toBeNull();
            expect(game.preferredSuit).toBeNull();
            expect(game.players[0].hand.length).toBe(0);
            expect(game.players[0].selectedCards.length).toBe(0);
            expect(game.players[0].isActive).toBe(false);
            expect(game.players[0].hasActed).toBe(false);
            expect(game.players[0].bettingAction).toBeNull();
        });
    });

    describe('Dealer Rotation Info', () => {
        it('should return correct dealer rotation information', () => {
            const game = createTestGame();
            game.dealersUsed.add('player-1');

            const info = gameStateManager.getDealerRotationInfo(game);

            expect(info.currentDealer).toBe('Player 1');
            expect(info.dealersUsed).toEqual(['Player 1']);
            expect(info.playersNotDealt).toEqual(['Player 2']);
            expect(info.roundNumber).toBe(0);
            expect(info.totalPlayers).toBe(2);
            expect(info.gameShouldEnd).toBe(false);
        });
    });
}); 