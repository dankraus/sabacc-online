import { PlayerManager } from '../PlayerManager';
import { GameEventEmitter } from '../GameEventEmitter';
import { GameState, Player, DEFAULT_GAME_SETTINGS } from '../../../shared/types/game';
import { createMockEventEmitter } from '../testUtils';

// Mock GameEventEmitter
const mockEventEmitter = createMockEventEmitter();

describe('PlayerManager', () => {
    let playerManager: PlayerManager;
    let mockGame: GameState;

    beforeEach(() => {
        playerManager = new PlayerManager(mockEventEmitter);
        mockGame = {
            id: 'test-game',
            status: 'waiting',
            currentPhase: 'setup',
            players: [],
            deck: [],
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
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createPlayer', () => {
        it('should create a player with correct default state', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);

            expect(player).toEqual({
                id: 'player1',
                name: 'Test Player',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true,
                hasActed: false,
                bettingAction: null
            });
        });
    });

    describe('validatePlayerCanJoin', () => {
        it('should allow valid player to join', () => {
            expect(() => {
                playerManager.validatePlayerCanJoin(mockGame, 'player1');
            }).not.toThrow();
        });

        it('should throw error if player is already in game', () => {
            mockGame.players.push({
                id: 'player1',
                name: 'Test Player',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true,
                hasActed: false,
                bettingAction: null
            });

            expect(() => {
                playerManager.validatePlayerCanJoin(mockGame, 'player1');
            }).toThrow('Player is already in the game');
        });

        it('should throw error if game is full', () => {
            // Add max players to game
            for (let i = 0; i < mockGame.settings.maxPlayers; i++) {
                mockGame.players.push({
                    id: `player${i}`,
                    name: `Player ${i}`,
                    chips: 100,
                    hand: [],
                    selectedCards: [],
                    isActive: true,
                    hasActed: false,
                    bettingAction: null
                });
            }

            expect(() => {
                playerManager.validatePlayerCanJoin(mockGame, 'newPlayer');
            }).toThrow('Game is full');
        });

        it('should throw error if game is in progress', () => {
            mockGame.status = 'in_progress';

            expect(() => {
                playerManager.validatePlayerCanJoin(mockGame, 'player1');
            }).toThrow('Cannot join game in progress');
        });
    });

    describe('addPlayerToGame', () => {
        it('should add player to game and emit events', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);

            playerManager.addPlayerToGame(mockGame, player);

            expect(mockGame.players).toHaveLength(1);
            expect(mockGame.players[0]).toBe(player);
            expect(mockEventEmitter.emitGameStateAndPlayerJoined).toHaveBeenCalledWith(mockGame, player);
        });
    });

    describe('removePlayerFromGame', () => {
        it('should remove player from game and emit events', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            mockGame.players.push(player);

            const playerName = playerManager.removePlayerFromGame(mockGame, 'player1');

            expect(mockGame.players).toHaveLength(0);
            expect(playerName).toBe('Test Player');
            expect(mockEventEmitter.emitGameStateAndPlayerLeft).toHaveBeenCalledWith(mockGame, 'Test Player');
        });

        it('should throw error if player not found', () => {
            expect(() => {
                playerManager.removePlayerFromGame(mockGame, 'nonexistent');
            }).toThrow('Player not found in game');
        });
    });

    describe('findPlayer', () => {
        it('should find existing player', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            mockGame.players.push(player);

            const found = playerManager.findPlayer(mockGame, 'player1');

            expect(found).toBe(player);
        });

        it('should return undefined for non-existent player', () => {
            const found = playerManager.findPlayer(mockGame, 'nonexistent');

            expect(found).toBeUndefined();
        });
    });

    describe('getPlayerOrThrow', () => {
        it('should return player if found', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            mockGame.players.push(player);

            const found = playerManager.getPlayerOrThrow(mockGame, 'player1');

            expect(found).toBe(player);
        });

        it('should throw error if player not found', () => {
            expect(() => {
                playerManager.getPlayerOrThrow(mockGame, 'nonexistent');
            }).toThrow('Player not found');
        });
    });

    describe('findGameByPlayerId', () => {
        it('should find game containing player', () => {
            const games = new Map<string, GameState>();
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            mockGame.players.push(player);
            games.set('game1', mockGame);

            const found = playerManager.findGameByPlayerId(games, 'player1');

            expect(found).toBe(mockGame);
        });

        it('should return null if player not found in any game', () => {
            const games = new Map<string, GameState>();
            games.set('game1', mockGame);

            const found = playerManager.findGameByPlayerId(games, 'nonexistent');

            expect(found).toBeNull();
        });
    });

    describe('handlePlayerDisconnect', () => {
        it('should remove player and delete game if empty', () => {
            const games = new Map<string, GameState>();
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            mockGame.players.push(player);
            games.set('game1', mockGame);

            playerManager.handlePlayerDisconnect(games, 'player1');

            expect(mockGame.players).toHaveLength(0);
            expect(games.has('game1')).toBe(false);
        });

        it('should remove player but keep game if other players remain', () => {
            const games = new Map<string, GameState>();
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 100);
            mockGame.players.push(player1, player2);
            games.set('game1', mockGame);

            playerManager.handlePlayerDisconnect(games, 'player1');

            expect(mockGame.players).toHaveLength(1);
            expect(mockGame.players[0].id).toBe('player2');
            expect(games.has('game1')).toBe(true);
        });
    });

    describe('validatePlayersHaveEnoughChips', () => {
        it('should pass validation when all players have enough chips', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 10);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 10);
            mockGame.players.push(player1, player2);

            expect(() => {
                playerManager.validatePlayersHaveEnoughChips(mockGame);
            }).not.toThrow();
        });

        it('should throw error when player has insufficient chips', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 3);
            mockGame.players.push(player1);

            expect(() => {
                playerManager.validatePlayersHaveEnoughChips(mockGame);
            }).toThrow('Player Test Player 1 does not have enough chips for ante');
        });
    });

    describe('collectAnte', () => {
        it('should collect ante from all players', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 10);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 10);
            mockGame.players.push(player1, player2);

            playerManager.collectAnte(mockGame);

            expect(player1.chips).toBe(5);
            expect(player2.chips).toBe(5);
            expect(mockGame.pot).toBe(10);
        });

        it('should throw error if player has insufficient chips', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 3);
            mockGame.players.push(player1);

            expect(() => {
                playerManager.collectAnte(mockGame);
            }).toThrow('Player Test Player 1 does not have enough chips for ante');
        });
    });

    describe('dealInitialHands', () => {
        it('should deal cards to all players', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 100);
            mockGame.players.push(player1, player2);
            mockGame.deck = [
                { suit: 'Circle', value: 1, color: 'green', isWild: false },
                { suit: 'Triangle', value: 2, color: 'green', isWild: false },
                { suit: 'Square', value: 3, color: 'green', isWild: false },
                { suit: 'Circle', value: 4, color: 'green', isWild: false },
                { suit: 'Triangle', value: 5, color: 'green', isWild: false },
                { suit: 'Square', value: 6, color: 'green', isWild: false },
                { suit: 'Circle', value: 7, color: 'green', isWild: false },
                { suit: 'Triangle', value: 8, color: 'green', isWild: false },
                { suit: 'Square', value: 9, color: 'green', isWild: false },
                { suit: 'Circle', value: 10, color: 'green', isWild: false }
            ];

            playerManager.dealInitialHands(mockGame);

            expect(player1.hand).toHaveLength(5);
            expect(player2.hand).toHaveLength(5);
            expect(mockGame.deck).toHaveLength(0);
            expect(player1.selectedCards).toHaveLength(0);
            expect(player1.isActive).toBe(true);
            expect(player1.hasActed).toBe(false);
            expect(player1.bettingAction).toBeNull();
        });
    });

    describe('resetPlayerStateForNewRound', () => {
        it('should reset all player state for new round', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            player.hand = [{ suit: 'Circle', value: 1, color: 'green', isWild: false }];
            player.selectedCards = [{ suit: 'Triangle', value: 2, color: 'green', isWild: false }];
            player.isActive = false;
            player.hasActed = true;
            player.bettingAction = 'fold';
            mockGame.players.push(player);

            playerManager.resetPlayerStateForNewRound(mockGame);

            expect(player.hand).toHaveLength(0);
            expect(player.selectedCards).toHaveLength(0);
            expect(player.isActive).toBe(true);
            expect(player.hasActed).toBe(false);
            expect(player.bettingAction).toBeNull();
        });
    });

    describe('validateCardIndices', () => {
        it('should pass validation for valid indices', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            player.hand = [
                { suit: 'Circle', value: 1, color: 'green', isWild: false },
                { suit: 'Triangle', value: 2, color: 'green', isWild: false }
            ];

            expect(() => {
                playerManager.validateCardIndices(player, [0, 1]);
            }).not.toThrow();
        });

        it('should throw error for invalid indices', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            player.hand = [
                { suit: 'Circle', value: 1, color: 'green', isWild: false }
            ];

            expect(() => {
                playerManager.validateCardIndices(player, [0, 1]);
            }).toThrow('Invalid card indices');
        });
    });

    describe('allPlayersHaveSelected', () => {
        it('should return true when all players have selected cards', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 100);
            player1.selectedCards = [{ suit: 'Circle', value: 1, color: 'green', isWild: false }];
            player2.selectedCards = [{ suit: 'Triangle', value: 2, color: 'green', isWild: false }];
            mockGame.players.push(player1, player2);

            const result = playerManager.allPlayersHaveSelected(mockGame);

            expect(result).toBe(true);
        });

        it('should return false when some players have not selected cards', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 100);
            player1.selectedCards = [{ suit: 'Circle', value: 1, color: 'green', isWild: false }];
            mockGame.players.push(player1, player2);

            const result = playerManager.allPlayersHaveSelected(mockGame);

            expect(result).toBe(false);
        });
    });

    describe('allActivePlayersCompletedImprovement', () => {
        it('should return true when all active players have no cards in hand', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 100);
            player1.isActive = true;
            player1.hand = [];
            player2.isActive = false;
            player2.hand = [{ suit: 'Circle', value: 1, color: 'green', isWild: false }];
            mockGame.players.push(player1, player2);

            const result = playerManager.allActivePlayersCompletedImprovement(mockGame);

            expect(result).toBe(true);
        });

        it('should return false when active players still have cards', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 100);
            player1.isActive = true;
            player1.hand = [{ suit: 'Circle', value: 1, color: 'green', isWild: false }];
            player2.isActive = true;
            player2.hand = [];
            mockGame.players.push(player1, player2);

            const result = playerManager.allActivePlayersCompletedImprovement(mockGame);

            expect(result).toBe(false);
        });
    });

    describe('getActivePlayers', () => {
        it('should return only active players', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 100);
            player1.isActive = true;
            player2.isActive = false;
            mockGame.players.push(player1, player2);

            const activePlayers = playerManager.getActivePlayers(mockGame);

            expect(activePlayers).toHaveLength(1);
            expect(activePlayers[0].id).toBe('player1');
        });
    });

    describe('determineGameWinner', () => {
        it('should return player with most chips', () => {
            const player1 = playerManager.createPlayer('player1', 'Test Player 1', 100);
            const player2 = playerManager.createPlayer('player2', 'Test Player 2', 200);
            const player3 = playerManager.createPlayer('player3', 'Test Player 3', 150);
            mockGame.players.push(player1, player2, player3);

            const winner = playerManager.determineGameWinner(mockGame);

            expect(winner.id).toBe('player2');
        });
    });

    describe('awardPotToWinner', () => {
        it('should award pot to winner', () => {
            const player = playerManager.createPlayer('player1', 'Test Player', 100);
            mockGame.pot = 50;

            playerManager.awardPotToWinner(mockGame, player);

            expect(player.chips).toBe(150);
        });
    });
}); 