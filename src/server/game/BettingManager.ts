import { GameState, Player } from '../../shared/types/game';
import { GameEventEmitter } from './GameEventEmitter';

export class BettingManager {
    private eventEmitter: GameEventEmitter;

    constructor(eventEmitter: GameEventEmitter) {
        this.eventEmitter = eventEmitter;
    }

    startBettingPhase(game: GameState): void {
        game.bettingPhaseStarted = true;
        game.bettingRoundComplete = false;
        game.currentPlayer = game.players[game.dealerIndex].id;

        // Reset all players' betting state
        this.resetPlayerBettingState(game);

        this.eventEmitter.emitGameStateAndBettingPhaseStarted(game);
    }

    private resetPlayerBettingState(game: GameState): void {
        game.players.forEach(player => {
            player.hasActed = false;
            player.bettingAction = null;
        });
    }

    handleBettingPhaseCompletion(game: GameState): void {
        game.bettingRoundComplete = true;
        game.bettingPhaseStarted = false;

        // Transition to next phase based on current phase
        if (game.currentPhase === 'first_betting') {
            game.currentPhase = 'sabacc_shift';
        } else if (game.currentPhase === 'second_betting') {
            game.currentPhase = 'improve';
        }

        this.eventEmitter.emitGameStateAndBettingPhaseCompleted(game);
    }

    getNextPlayerToAct(game: GameState): Player | null {
        if (!game.bettingPhaseStarted || game.bettingRoundComplete) {
            return null;
        }

        // Find the next active player who hasn't acted yet
        let currentIndex = game.players.findIndex(p => p.id === game.currentPlayer);
        if (currentIndex === -1) {
            currentIndex = game.dealerIndex;
        }

        // Start from current player and go clockwise
        for (let i = 0; i < game.players.length; i++) {
            const playerIndex = (currentIndex + i) % game.players.length;
            const player = game.players[playerIndex];

            if (player.isActive && !player.hasActed) {
                return player;
            }
        }

        return null;
    }

    validateBettingAction(game: GameState, playerId: string): void {
        if (!game.bettingPhaseStarted) {
            throw new Error('Betting phase has not started');
        }

        if (game.bettingRoundComplete) {
            throw new Error('Betting phase is already complete');
        }

        const player = this.getPlayerOrThrow(game, playerId);

        if (!player.isActive) {
            throw new Error('Player is not active');
        }

        if (player.hasActed) {
            throw new Error('Player has already acted this betting phase');
        }

        // Check if it's this player's turn
        const nextPlayer = this.getNextPlayerToAct(game);
        if (!nextPlayer || nextPlayer.id !== playerId) {
            throw new Error('Not your turn to act');
        }
    }

    private getPlayerOrThrow(game: GameState, playerId: string): Player {
        const player = game.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        return player;
    }

    continuePlaying(game: GameState, playerId: string): void {
        this.validateBettingAction(game, playerId);

        const player = this.getPlayerOrThrow(game, playerId);

        // Validate sufficient chips
        if (player.chips < game.continueCost) {
            throw new Error('Insufficient chips to continue playing');
        }

        // Process continue action
        player.chips -= game.continueCost;
        game.pot += game.continueCost;
        player.hasActed = true;
        player.bettingAction = 'continue';

        // Move to next player
        const nextPlayer = this.getNextPlayerToAct(game);
        if (nextPlayer) {
            game.currentPlayer = nextPlayer.id;
        } else {
            // All players have acted
            this.handleBettingPhaseCompletion(game);
        }

        this.eventEmitter.emitGameStateAndPlayerActed(game, playerId, 'continue');
    }

    fold(game: GameState, playerId: string): void {
        this.validateBettingAction(game, playerId);

        const player = this.getPlayerOrThrow(game, playerId);

        // Process fold action
        player.isActive = false;
        player.hand = [];
        player.selectedCards = [];
        player.hasActed = true;
        player.bettingAction = 'fold';

        // Check for automatic win
        const activePlayers = game.players.filter(p => p.isActive);
        if (activePlayers.length === 1) {
            (game as any)._pendingWinner = activePlayers[0].id;
        }

        // Move to next player
        const nextPlayer = this.getNextPlayerToAct(game);
        if (nextPlayer) {
            game.currentPlayer = nextPlayer.id;
        } else {
            // All players have acted
            this.handleBettingPhaseCompletion(game);
        }

        this.eventEmitter.emitGameStateAndPlayerActed(game, playerId, 'fold');
    }
} 