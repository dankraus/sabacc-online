import { GameManager } from '../GameManager';
import { GameEventEmitter } from '../GameEventEmitter';
import { BettingManager } from '../BettingManager';
import { GameStateManager } from '../GameStateManager';
import { PlayerManager } from '../PlayerManager';
import { RoundManager } from '../RoundManager';
import { GameState, Player, DEFAULT_GAME_SETTINGS, GamePhase, Suit } from '../../../shared/types/game';
import { createDeck } from '../../../shared/types/gameUtils';
import { createMockEventEmitter } from '../testUtils';

/**
 * Integration Tests for Manager Interactions
 * 
 * These tests verify that the different managers work together correctly
 * to handle complex game scenarios. They test the integration points
 * between managers rather than individual manager functionality.
 */
describe('Manager Integration Tests', () => {
    let gameManager: GameManager;
    let mockEventEmitter: ReturnType<typeof createMockEventEmitter>;
    let bettingManager: BettingManager;
    let gameStateManager: GameStateManager;
    let playerManager: PlayerManager;
    let roundManager: RoundManager;

    const TEST_GAME_ID = 'integration-test-game';
    const TEST_PLAYER_1 = { id: 'player-1', name: 'Alice' };
    const TEST_PLAYER_2 = { id: 'player-2', name: 'Bob' };

    beforeEach(() => {
        jest.useFakeTimers();
        mockEventEmitter = createMockEventEmitter();
        gameManager = new GameManager(mockEventEmitter);

        // Access the internal managers for testing
        bettingManager = (gameManager as any).bettingManager;
        gameStateManager = (gameManager as any).gameStateManager;
        playerManager = (gameManager as any).playerManager;
        roundManager = (gameManager as any).roundManager;
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllTimers();
    });

    describe('Game Lifecycle Integration', () => {
        it('should coordinate all managers during game creation and player joining', () => {
            // 1. Game Creation and Player Joining
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            let game = gameManager.getGameState(TEST_GAME_ID);

            // Verify GameStateManager validated the game state
            expect(game.status).toBe('waiting');
            expect(game.currentPhase).toBe('setup');
            expect(game.players).toHaveLength(1);
            expect(game.deck).toHaveLength(createDeck().length);
            expect(game.currentDiceRoll).toBeNull();
            expect(game.targetNumber).toBeNull();
            expect(game.preferredSuit).toBeNull();
            expect(game.roundNumber).toBe(0);

            // Verify PlayerManager handled player creation
            const foundPlayer = game.players.find(p => p.id === TEST_PLAYER_1.id);
            expect(foundPlayer).toBeDefined();
            expect(foundPlayer?.name).toBe(TEST_PLAYER_1.name);
            expect(foundPlayer?.chips).toBe(DEFAULT_GAME_SETTINGS.startingChips);

            // 2. Second Player Joining
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);
            game = gameManager.getGameState(TEST_GAME_ID);

            expect(game.players).toHaveLength(2);
            expect(game.players.map(p => p.id)).toContain(TEST_PLAYER_2.id);
            expect(game.players.map(p => p.name)).toContain(TEST_PLAYER_2.name);
        });

        it('should handle multiple players joining with manager coordination', () => {
            // Join multiple players
            const players = [
                { id: 'player-1', name: 'Alice' },
                { id: 'player-2', name: 'Bob' },
                { id: 'player-3', name: 'Charlie' }
            ];

            players.forEach(player => {
                gameManager.joinGame(TEST_GAME_ID, player.name, player.id);
            });

            const game = gameManager.getGameState(TEST_GAME_ID);

            // Verify all players were added correctly
            expect(game.players).toHaveLength(3);
            players.forEach(player => {
                expect(game.players.map(p => p.id)).toContain(player.id);
                expect(game.players.map(p => p.name)).toContain(player.name);
                const foundPlayer = game.players.find(p => p.id === player.id);
                expect(foundPlayer?.chips).toBe(DEFAULT_GAME_SETTINGS.startingChips);
            });
        });

        it('should coordinate managers during game start', () => {
            // Setup game with players
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);

            // Start game
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            const startedGame = gameManager.getGameState(TEST_GAME_ID);

            // Verify RoundManager started the round
            expect(startedGame.status).toBe('in_progress');
            expect(startedGame.currentPhase).toBe('initial_roll');
            expect(startedGame.roundNumber).toBe(1);
            expect(startedGame.dealerIndex).toBe(0);

            // Verify PlayerManager dealt cards and collected ante
            startedGame.players.forEach(player => {
                expect(player.hand).toHaveLength(5);
                expect(player.chips).toBe(15); // 20 - 5 ante
            });
            expect(startedGame.pot).toBe(10); // 2 players * 5 ante
        });

        it('should coordinate managers during dice rolling', () => {
            // Setup and start game
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);

            // Roll dice
            gameManager.rollDice(TEST_GAME_ID);
            const updatedGame = gameManager.getGameState(TEST_GAME_ID);

            // Verify RoundManager handled dice rolling
            expect(updatedGame.currentDiceRoll).toBeDefined();
            expect(updatedGame.targetNumber).toBeDefined();
            expect(updatedGame.preferredSuit).toBeDefined();
            expect(updatedGame.currentPhase).toBe('selection');
        });
    });

    describe('Betting and State Management Integration', () => {
        it('should coordinate betting actions with state validation', () => {
            // Setup game to betting phase
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.rollDice(TEST_GAME_ID);

            // Select cards to trigger betting phase
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);

            const bettingGame = gameManager.getGameState(TEST_GAME_ID);

            // Verify BettingManager and GameStateManager coordinate
            expect(bettingGame.currentPhase).toBe('first_betting');
            expect(bettingGame.bettingPhaseStarted).toBe(true);
            expect(bettingGame.currentPlayer).toBeDefined();

            // Test valid betting action
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            const updatedGame = gameManager.getGameState(TEST_GAME_ID);

            // Verify state was updated correctly
            expect(updatedGame.currentPlayer).toBe(TEST_PLAYER_2.id);
            expect(updatedGame.lastAction).toBeDefined();
        });

        it('should handle betting phase completion and phase transitions', () => {
            // Setup game to betting phase
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);

            // Complete betting phase
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);

            let updatedGame = gameManager.getGameState(TEST_GAME_ID);
            expect(updatedGame.bettingRoundComplete).toBe(true);

            // Trigger Sabacc shift
            gameManager.handleSabaccShift(TEST_GAME_ID);
            updatedGame = gameManager.getGameState(TEST_GAME_ID);

            // Verify phase transition
            expect(updatedGame.currentPhase).toBe('second_betting');
            expect(updatedGame.bettingPhaseStarted).toBe(true);
            expect(updatedGame.bettingRoundComplete).toBe(false);
        });

        it('should handle complete betting flow with manager coordination', () => {
            // Setup game to betting phase
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);

            // First betting phase
            const gameBefore = gameManager.getGameState(TEST_GAME_ID);
            const initialPot = gameBefore.pot;
            const initialChips = gameBefore.players[0].chips;

            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);

            const gameAfter = gameManager.getGameState(TEST_GAME_ID);
            expect(gameAfter.pot).toBe(initialPot + 4); // 2 chips per player
            expect(gameAfter.players[0].chips).toBe(initialChips - 2);
            expect(gameAfter.players[0].hasActed).toBe(true);
            expect(gameAfter.players[0].bettingAction).toBe('continue');
            expect(gameAfter.players[1].hasActed).toBe(true);
            expect(gameAfter.players[1].bettingAction).toBe('continue');
            expect(gameAfter.bettingRoundComplete).toBe(true);

            // Sabacc shift and second betting phase
            gameManager.handleSabaccShift(TEST_GAME_ID);
            const secondBettingGame = gameManager.getGameState(TEST_GAME_ID);
            expect(secondBettingGame.currentPhase).toBe('second_betting');
            expect(secondBettingGame.bettingPhaseStarted).toBe(true);
            expect(secondBettingGame.bettingRoundComplete).toBe(false);
            expect(secondBettingGame.currentPlayer).toBe(TEST_PLAYER_1.id); // Dealer acts first

            // Complete second betting phase
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);

            const finalGame = gameManager.getGameState(TEST_GAME_ID);
            expect(finalGame.currentPhase).toBe('improve');
        });

        it('should handle fold actions with manager coordination', () => {
            // Setup game to betting phase
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);

            // Player 1 folds
            gameManager.fold(TEST_GAME_ID, TEST_PLAYER_1.id);

            const gameAfterFold = gameManager.getGameState(TEST_GAME_ID);
            expect(gameAfterFold.players[0].isActive).toBe(false);
            expect(gameAfterFold.players[0].hasActed).toBe(true);
            expect(gameAfterFold.players[0].bettingAction).toBe('fold');
            expect(gameAfterFold.players[0].hand).toHaveLength(0);
            expect(gameAfterFold.players[0].selectedCards).toHaveLength(0);
            expect(gameAfterFold.currentPlayer).toBe(TEST_PLAYER_2.id);

            // Player 2 continues, which should complete the betting phase
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);

            const finalGame = gameManager.getGameState(TEST_GAME_ID);
            expect(finalGame.bettingRoundComplete).toBe(true);
        });
    });

    describe('Player Management and Game State Integration', () => {
        it('should handle player joining and leaving with state updates', () => {
            // Join first player
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            let game = gameManager.getGameState(TEST_GAME_ID);

            expect(game.players).toHaveLength(1);
            expect(game.status).toBe('waiting');

            // Join second player
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);
            game = gameManager.getGameState(TEST_GAME_ID);

            expect(game.players).toHaveLength(2);

            // Start game
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            game = gameManager.getGameState(TEST_GAME_ID);

            expect(game.status).toBe('in_progress');

            // Player leaves during game
            gameManager.leaveGame(TEST_GAME_ID, TEST_PLAYER_2.id);
            game = gameManager.getGameState(TEST_GAME_ID);

            expect(game.players).toHaveLength(1);
            expect(game.players[0].id).toBe(TEST_PLAYER_1.id);
            expect(game.status).toBe('in_progress'); // Game continues with remaining player
        });

        it('should coordinate player state with round progression', () => {
            // Setup game to improve phase
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);
            gameManager.handleSabaccShift(TEST_GAME_ID);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);

            const improveGame = gameManager.getGameState(TEST_GAME_ID);

            // Verify all players are in improve phase
            expect(improveGame.currentPhase).toBe('improve');
            improveGame.players.forEach(player => {
                expect(player.isActive).toBe(true);
                expect(player.selectedCards).toBeDefined();
                expect(player.hand).toBeDefined();
            });

            // Complete improvement phase - add all remaining cards
            const currentGame = gameManager.getGameState(TEST_GAME_ID);
            const player1HandSize = currentGame.players.find(p => p.id === TEST_PLAYER_1.id)!.hand.length;
            const player2HandSize = currentGame.players.find(p => p.id === TEST_PLAYER_2.id)!.hand.length;

            // Add all remaining cards to complete improvement
            const player1Indices = Array.from({ length: player1HandSize }, (_, i) => i);
            const player2Indices = Array.from({ length: player2HandSize }, (_, i) => i);

            gameManager.improveCards(TEST_GAME_ID, TEST_PLAYER_1.id, player1Indices);
            gameManager.improveCards(TEST_GAME_ID, TEST_PLAYER_2.id, player2Indices);

            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            expect(updatedGame.currentPhase).toBe('reveal');

            // Verify player states are maintained
            updatedGame.players.forEach(player => {
                expect(player.isActive).toBe(true);
                expect(player.selectedCards.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid game actions gracefully', () => {
            const players = [TEST_PLAYER_1, TEST_PLAYER_2];

            // Try to start game before it's ready
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[1].id); // Wrong player
            }).toThrow('Game not found');

            // Setup game
            gameManager.joinGame(TEST_GAME_ID, players[0].name, players[0].id);
            gameManager.joinGame(TEST_GAME_ID, players[1].name, players[1].id);

            // Try to start game with wrong player
            expect(() => {
                gameManager.startGame(TEST_GAME_ID, players[1].id); // Wrong player
            }).toThrow('Only the dealer can start the game');
        });

        it('should handle network disconnections during critical phases', () => {
            // Setup game to betting phase
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);

            // Simulate disconnection during betting
            gameManager.handleDisconnect(TEST_PLAYER_2.id);

            // Game should continue with remaining player
            const updatedGame = gameManager.getGameState(TEST_GAME_ID);
            expect(updatedGame.status).toBe('in_progress');
            expect(updatedGame.players).toHaveLength(1);
            expect(updatedGame.players[0].id).toBe(TEST_PLAYER_1.id);
        });
    });

    describe('Complete Game Flow Integration', () => {
        it('should handle complete game flow from start to finish', () => {
            // Setup game
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);

            // Start game
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            let currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.status).toBe('in_progress');
            expect(currentGame.currentPhase).toBe('initial_roll');

            // Roll dice
            gameManager.rollDice(TEST_GAME_ID);
            currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.currentPhase).toBe('selection');
            expect(currentGame.currentDiceRoll).toBeDefined();

            // Select cards
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);
            currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.currentPhase).toBe('first_betting');

            // Complete first betting
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);
            currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.bettingRoundComplete).toBe(true);

            // Sabacc shift
            gameManager.handleSabaccShift(TEST_GAME_ID);
            currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.currentPhase).toBe('second_betting');

            // Complete second betting
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.continuePlaying(TEST_GAME_ID, TEST_PLAYER_2.id);
            currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.currentPhase).toBe('improve');

            // Improve cards
            gameManager.improveCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.improveCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);
            currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.currentPhase).toBe('improve');

            // Note: Phase transitions to reveal would happen after betting completion
            // This test focuses on manager coordination during the improve phase

            // End round
            gameManager.endRound(TEST_GAME_ID);
            currentGame = gameManager.getGameState(TEST_GAME_ID);
            expect(currentGame.currentPhase).toBe('round_end');
        });
    });

    describe('Performance and Scalability Integration', () => {
        it('should handle multiple concurrent games efficiently', () => {
            const gameIds = ['game-1', 'game-2', 'game-3'];
            const players = ['player-1', 'player-2', 'player-3'];

            // Create multiple games
            gameIds.forEach((gameId, index) => {
                gameManager.joinGame(gameId, `Player ${index + 1}`, players[index]);
            });

            // Verify all games exist independently
            gameIds.forEach(gameId => {
                const game = gameManager.getGameState(gameId);
                expect(game.id).toBe(gameId);
                expect(game.players).toHaveLength(1);
            });

            // Add second player to game-1 and start it
            gameManager.joinGame('game-1', 'Player 2', 'player-2');
            const game1 = gameManager.getGameState('game-1');
            game1.players.forEach(player => player.chips = 20);
            gameManager.startGame('game-1', 'player-1');

            // Verify other games are unaffected
            const game2 = gameManager.getGameState('game-2');
            expect(game2.status).toBe('waiting');
        });

        it('should handle rapid state transitions without corruption', () => {
            // Setup game
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_1.name, TEST_PLAYER_1.id);
            gameManager.joinGame(TEST_GAME_ID, TEST_PLAYER_2.name, TEST_PLAYER_2.id);

            const game = gameManager.getGameState(TEST_GAME_ID);
            game.players.forEach(player => player.chips = 20);

            // Rapid state transitions
            gameManager.startGame(TEST_GAME_ID, TEST_PLAYER_1.id);
            gameManager.rollDice(TEST_GAME_ID);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_1.id, [0, 1]);
            gameManager.selectCards(TEST_GAME_ID, TEST_PLAYER_2.id, [0, 1]);

            // Verify state is consistent
            const finalGame = gameManager.getGameState(TEST_GAME_ID);
            expect(finalGame.currentPhase).toBe('first_betting');
            expect(finalGame.bettingPhaseStarted).toBe(true);
            expect(finalGame.players.every(p => p.selectedCards.length > 0)).toBe(true);
        });
    });
});
