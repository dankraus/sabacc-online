import { GameState, Player, GamePhase } from '../../shared/types/game';
import { PlayerManager } from './PlayerManager';
import { GameEventEmitter } from './GameEventEmitter';

// Phase transition configuration
const PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
    'setup': ['initial_roll'],
    'initial_roll': ['selection'],
    'selection': ['first_betting'],
    'first_betting': ['sabacc_shift'],
    'sabacc_shift': ['second_betting'],
    'second_betting': ['improve'],
    'improve': ['reveal'],
    'reveal': ['round_end'],
    'round_end': ['setup']
} as const;

export class GameStateManager {
    private eventEmitter: GameEventEmitter;
    private playerManager: PlayerManager;

    constructor(eventEmitter: GameEventEmitter) {
        this.eventEmitter = eventEmitter;
        this.playerManager = new PlayerManager(eventEmitter);
    }

    /**
     * Validate the overall game state
     */
    validateGameState(game: GameState): void {
        // Validate game status
        if (game.status === 'ended') {
            throw new Error('Game has ended');
        }

        // Validate minimum players
        if (game.status === 'in_progress' && game.players.length < game.settings.minPlayers) {
            throw new Error('Not enough players to continue the game');
        }

        // Validate player chips
        game.players.forEach(player => {
            if (player.chips < 0) {
                throw new Error(`Player ${player.name} has negative chips`);
            }
        });

        // Validate deck
        if (game.deck.length < 0) {
            throw new Error('Invalid deck state: negative number of cards');
        }

        // Validate pot
        if (game.pot < 0) {
            throw new Error('Invalid pot state: negative pot value');
        }

        // Validate dealer rotation
        if (game.status === 'in_progress' && game.dealerIndex >= game.players.length) {
            throw new Error('Invalid dealer index');
        }

        // Validate dealer rotation tracking
        this.validateDealerRotation(game);
    }

    /**
     * Validate dealer rotation consistency
     */
    private validateDealerRotation(game: GameState): void {
        if (game.status === 'in_progress') {
            // Check that the current dealer index is valid
            if (game.dealerIndex < 0 || game.dealerIndex >= game.players.length) {
                throw new Error('Invalid dealer index');
            }

            // Check that the number of dealers used matches the round number
            if (game.dealersUsed.size > game.roundNumber) {
                throw new Error('Dealer tracking inconsistency: more dealers used than rounds played');
            }

            // Check that no player has been dealer more than once
            const dealerCounts = new Map<string, number>();
            game.dealersUsed.forEach(playerId => {
                dealerCounts.set(playerId, (dealerCounts.get(playerId) || 0) + 1);
            });

            for (const [playerId, count] of dealerCounts) {
                if (count > 1) {
                    const player = game.players.find(p => p.id === playerId);
                    throw new Error(`Player ${player?.name || playerId} has been dealer more than once`);
                }
            }
        }
    }

    /**
     * Validate that a player can join the game
     */
    validatePlayerCanJoin(game: GameState, playerId: string): void {
        this.playerManager.validatePlayerCanJoin(game, playerId);
    }

    /**
     * Validate that the game can be started
     */
    validateGameCanStart(game: GameState, anteAmount: number): void {
        if (game.status === 'in_progress') {
            throw new Error('Game already in progress');
        }

        if (game.players.length < game.settings.minPlayers) {
            throw new Error('Not enough players to start the game');
        }

        // Validate all players have enough chips for ante (first round)
        this.playerManager.validatePlayersHaveEnoughChips(game);
    }

    /**
     * Validate phase transitions
     */
    validatePhaseTransition(game: GameState, currentPhase: GamePhase, nextPhase: GamePhase): void {
        if (!PHASE_TRANSITIONS[currentPhase]?.includes(nextPhase)) {
            throw new Error(`Invalid phase transition from ${currentPhase} to ${nextPhase}`);
        }

        // Validate phase completion requirements
        switch (currentPhase) {
            case 'selection':
                if (!this.playerManager.allPlayersHaveSelected(game)) {
                    throw new Error('All players must select cards before proceeding');
                }
                break;
            case 'improve':
                if (!this.playerManager.allActivePlayersCompletedImprovement(game)) {
                    throw new Error('All active players must complete improvement');
                }
                break;
        }
    }

    /**
     * Transition to a new phase
     */
    transitionToPhase(game: GameState, newPhase: GamePhase): void {
        this.validatePhaseTransition(game, game.currentPhase, newPhase);
        game.currentPhase = newPhase;
        this.eventEmitter.emitGameStateUpdated(game);
    }

    /**
     * Handle phase timeouts with automatic actions
     */
    handlePhaseTimeout(game: GameState): void {
        switch (game.currentPhase) {
            case 'selection':
                this.handleSelectionTimeout(game);
                break;
            case 'first_betting':
                this.handleBettingTimeout(game);
                break;
            case 'second_betting':
                this.handleBettingTimeout(game);
                break;
            case 'improve':
                this.handleImproveTimeout(game);
                break;
        }
        this.eventEmitter.emitGameStateUpdated(game);
    }

    private handleSelectionTimeout(game: GameState): void {
        // Auto-select first card for inactive players
        game.players.forEach(player => {
            if (player.isActive && player.selectedCards.length === 0 && player.hand.length > 0) {
                player.selectedCards = [player.hand[0]];
                player.hand = player.hand.slice(1);
            }
        });
        if (this.playerManager.allPlayersHaveSelected(game)) {
            this.transitionToPhase(game, 'first_betting');
        }
    }

    private handleBettingTimeout(game: GameState): void {
        // Auto-fold inactive players who haven't acted
        game.players.forEach(player => {
            if (player.isActive && !player.hasActed) {
                player.isActive = false;
                player.hand = [];
                player.selectedCards = [];
            }
        });
    }

    private handleImproveTimeout(game: GameState): void {
        // Auto-complete improvement for inactive players
        game.players.forEach(player => {
            if (player.isActive && player.hand.length > 0) {
                player.selectedCards = [...player.selectedCards, ...player.hand];
                player.hand = [];
            }
        });
        if (this.playerManager.allActivePlayersCompletedImprovement(game)) {
            this.transitionToPhase(game, 'reveal');
        }
    }

    /**
     * Check if the game should end
     */
    shouldEndGame(game: GameState): boolean {
        // Game ends when each player has dealt once
        const allPlayersHaveDealt = game.players.every(player => game.dealersUsed.has(player.id));
        const correctRoundNumber = game.roundNumber >= game.players.length;
        return allPlayersHaveDealt && correctRoundNumber;
    }

    /**
     * Check if the game should end after the current round completes
     */
    shouldEndGameAfterRound(game: GameState): boolean {
        const allPlayersHaveDealt = game.players.every(player => game.dealersUsed.has(player.id));
        const willBeCorrectRoundNumber = (game.roundNumber + 1) >= game.players.length;
        return allPlayersHaveDealt && willBeCorrectRoundNumber;
    }

    /**
     * Reset game state for a new round
     */
    resetGameStateForNewRound(game: GameState): void {
        game.pot = 0;
        game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
        game.roundNumber++;
        game.currentPhase = 'round_end';
        game.currentDiceRoll = null;
        game.targetNumber = null;
        game.preferredSuit = null;

        // Reset betting phase fields
        game.bettingPhaseStarted = false;
        game.bettingRoundComplete = false;

        // Reset player state
        this.resetPlayerStateForNewRound(game);
    }

    /**
     * Reset player state for a new round
     */
    private resetPlayerStateForNewRound(game: GameState): void {
        this.playerManager.resetPlayerStateForNewRound(game);
    }

    /**
     * Clean up game state when game ends
     */
    cleanupGameState(game: GameState): void {
        game.status = 'ended';
        game.currentPhase = 'setup';
        game.pot = 0;
        game.deck = [];
        game.currentDiceRoll = null;
        game.targetNumber = null;
        game.preferredSuit = null;

        game.players.forEach(player => {
            player.hand = [];
            player.selectedCards = [];
            player.isActive = false;
            player.hasActed = false;
            player.bettingAction = null;
        });
    }

    /**
     * Get dealer rotation information for debugging and validation
     */
    getDealerRotationInfo(game: GameState): {
        currentDealer: string;
        dealersUsed: string[];
        playersNotDealt: string[];
        roundNumber: number;
        totalPlayers: number;
        gameShouldEnd: boolean;
    } {
        const currentDealer = game.players[game.dealerIndex];
        const dealersUsed = Array.from(game.dealersUsed);
        const playersNotDealt = game.players
            .filter(player => !game.dealersUsed.has(player.id))
            .map(player => player.name);

        return {
            currentDealer: currentDealer.name,
            dealersUsed: dealersUsed.map(playerId => {
                const player = game.players.find(p => p.id === playerId);
                return player?.name || playerId;
            }),
            playersNotDealt: playersNotDealt,
            roundNumber: game.roundNumber,
            totalPlayers: game.players.length,
            gameShouldEnd: this.shouldEndGame(game)
        };
    }
} 