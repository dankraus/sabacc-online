import { RoundManager } from '../RoundManager';
import { GameEventEmitter } from '../GameEventEmitter';
import { GameState, Player, GameSettings, DEFAULT_GAME_SETTINGS } from '../../../shared/types/game';
import { createDeck, shuffle } from '../../../shared/types/gameUtils';
import { createMockEventEmitter } from '../testUtils';

// Mock GameEventEmitter
const mockEventEmitter = createMockEventEmitter();

describe('RoundManager', () => {
    let roundManager: RoundManager;
    let mockGame: GameState;
    let mockPlayers: Player[];

    beforeEach(() => {
        roundManager = new RoundManager(mockEventEmitter);

        mockPlayers = [
            {
                id: 'player1',
                name: 'Alice',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true,
                hasActed: false,
                bettingAction: null
            },
            {
                id: 'player2',
                name: 'Bob',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true,
                hasActed: false,
                bettingAction: null
            },
            {
                id: 'player3',
                name: 'Charlie',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true,
                hasActed: false,
                bettingAction: null
            }
        ];

        mockGame = {
            id: 'test-game',
            status: 'waiting',
            currentPhase: 'setup',
            players: mockPlayers,
            deck: shuffle(createDeck()),
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
            dealersUsed: new Set<string>(),
            hostId: null
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('startNewRound', () => {
        it('should start a new round successfully', () => {
            roundManager.startNewRound(mockGame);

            expect(mockGame.status).toBe('in_progress');
            expect(mockGame.currentPhase).toBe('selection');
            expect(mockGame.roundNumber).toBe(1);
            expect(mockGame.dealersUsed.has('player1')).toBe(true);
            expect(mockGame.deck.length).toBeGreaterThan(0);
            expect(mockGame.currentDiceRoll).toBeDefined();
            expect(mockGame.targetNumber).toBeDefined();
            expect(mockGame.preferredSuit).toBeDefined();
            expect(mockEventEmitter.emitGameStateUpdated).toHaveBeenCalledWith(mockGame);
        });

        it('should validate dealer can start the game', () => {
            expect(() => {
                roundManager.startNewRound(mockGame, 'player2');
            }).toThrow('Only the dealer can start the game');
        });

        it('should allow dealer to start the game', () => {
            roundManager.startNewRound(mockGame, 'player1');
            expect(mockGame.status).toBe('in_progress');
        });
    });

    describe('rollDiceForRound', () => {
        it('should roll dice and set target values', () => {
            mockGame.currentPhase = 'initial_roll';

            roundManager.rollDiceForRound(mockGame);

            expect(mockGame.currentDiceRoll).toBeDefined();
            expect(mockGame.targetNumber).toBeDefined();
            expect(mockGame.preferredSuit).toBeDefined();
            expect(mockGame.currentPhase).toBe('selection');
            expect(mockEventEmitter.emitGameStateUpdated).toHaveBeenCalledWith(mockGame);
        });
    });

    describe('endRound', () => {
        beforeEach(() => {
            mockGame.targetNumber = 5;
            mockGame.preferredSuit = 'Circle';
            mockGame.currentPhase = 'reveal';
            mockGame.status = 'in_progress';
            mockGame.roundNumber = 1;
        });

        it('should end round and determine winner', () => {
            // Set up a simple scenario where player1 wins
            mockGame.players[0].selectedCards = [{ suit: 'Circle', value: 5, color: 'green', isWild: false }];
            mockGame.players[1].selectedCards = [{ suit: 'Triangle', value: 3, color: 'green', isWild: false }];
            mockGame.players[2].selectedCards = [{ suit: 'Square', value: 7, color: 'green', isWild: false }];

            roundManager.endRound(mockGame);

            // Check that roundEnded was emitted with correct winner
            expect(mockEventEmitter.emitGameStateAndRoundEnded).toHaveBeenCalledWith(mockGame, 'Alice', 15, false);
        });

        it('should throw error if target number not set', () => {
            mockGame.targetNumber = null;

            expect(() => {
                roundManager.endRound(mockGame);
            }).toThrow('Cannot end round: target number or preferred suit not set');
        });

        it('should throw error if preferred suit not set', () => {
            mockGame.preferredSuit = null;

            expect(() => {
                roundManager.endRound(mockGame);
            }).toThrow('Cannot end round: target number or preferred suit not set');
        });
    });

    describe('getDealerRotationInfo', () => {
        it('should return correct dealer rotation information', () => {
            mockGame.dealerIndex = 1;
            mockGame.roundNumber = 2;
            mockGame.dealersUsed.add('player1');
            mockGame.dealersUsed.add('player2');

            const info = roundManager.getDealerRotationInfo(mockGame);

            expect(info.currentDealer).toBe('Bob');
            expect(info.dealersUsed).toEqual(['Alice', 'Bob']);
            expect(info.playersNotDealt).toEqual(['Charlie']);
            expect(info.roundNumber).toBe(2);
            expect(info.totalPlayers).toBe(3);
            expect(info.gameShouldEnd).toBe(false);
        });
    });

    describe('shouldEndGame', () => {
        it('should return false when not all players have dealt', () => {
            mockGame.dealersUsed.add('player1');
            mockGame.roundNumber = 1;

            expect(roundManager.shouldEndGame(mockGame)).toBe(false);
        });

        it('should return true when all players have dealt', () => {
            mockGame.dealersUsed.add('player1');
            mockGame.dealersUsed.add('player2');
            mockGame.dealersUsed.add('player3');
            mockGame.roundNumber = 3;

            expect(roundManager.shouldEndGame(mockGame)).toBe(true);
        });
    });

    describe('shouldEndGameAfterRound', () => {
        it('should return false when not all players have dealt', () => {
            mockGame.dealersUsed.add('player1');
            mockGame.roundNumber = 1;

            expect(roundManager.shouldEndGameAfterRound(mockGame)).toBe(false);
        });

        it('should return true when all players have dealt and round will complete', () => {
            mockGame.dealersUsed.add('player1');
            mockGame.dealersUsed.add('player2');
            mockGame.dealersUsed.add('player3');
            mockGame.roundNumber = 2;

            expect(roundManager.shouldEndGameAfterRound(mockGame)).toBe(true);
        });
    });

    describe('validateDealerRotation', () => {
        it('should not throw error for valid dealer rotation', () => {
            mockGame.status = 'in_progress';
            mockGame.dealerIndex = 1;
            mockGame.roundNumber = 2;
            mockGame.dealersUsed.add('player1');
            mockGame.dealersUsed.add('player2');

            expect(() => {
                roundManager['validateDealerRotation'](mockGame);
            }).not.toThrow();
        });

        it('should throw error for invalid dealer index', () => {
            mockGame.status = 'in_progress';
            mockGame.dealerIndex = 5; // Invalid index

            expect(() => {
                roundManager['validateDealerRotation'](mockGame);
            }).toThrow('Invalid dealer index');
        });

        it('should throw error for dealer tracking inconsistency', () => {
            mockGame.status = 'in_progress';
            mockGame.dealerIndex = 1;
            mockGame.roundNumber = 1;
            mockGame.dealersUsed.add('player1');
            mockGame.dealersUsed.add('player2'); // More dealers than rounds

            expect(() => {
                roundManager['validateDealerRotation'](mockGame);
            }).toThrow('Dealer tracking inconsistency: more dealers used than rounds played');
        });


    });
}); 