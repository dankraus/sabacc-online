import { Server } from 'socket.io';
import { GameState, Player, GamePhase, DiceRoll, Suit, Card } from '../../shared/types/game';
import { createDeck, shuffle, rollDice, determineWinner } from '../../shared/types/gameUtils';
import { PlayerManager } from './PlayerManager';
import { GameStateManager } from './GameStateManager';

// Round-related constants
const ROUND_CONSTANTS = {
    ROUND_END_DELAY_MS: 3000,
    ANTE_AMOUNT: 5
} as const;

export class RoundManager {
    private io: Server;
    private playerManager: PlayerManager;
    private gameStateManager: GameStateManager;

    constructor(io: Server) {
        this.io = io;
        this.playerManager = new PlayerManager(io);
        this.gameStateManager = new GameStateManager(io);
    }

    /**
     * Start a new round (called when game begins)
     */
    startNewRound(game: GameState, dealerId?: string): void {
        this.gameStateManager.validateGameState(game);
        this.gameStateManager.validateGameCanStart(game, ROUND_CONSTANTS.ANTE_AMOUNT);

        const dealer = game.players[game.dealerIndex];
        if (dealerId && dealer.id !== dealerId) {
            throw new Error('Only the dealer can start the game');
        }

        // Track that this player is now dealer
        game.dealersUsed.add(dealer.id);

        game.status = 'in_progress';
        this.gameStateManager.validatePhaseTransition(game, game.currentPhase, 'initial_roll');
        game.currentPhase = 'initial_roll';
        game.deck = shuffle(createDeck());
        game.roundNumber = 1;

        // Deal initial hands
        this.playerManager.dealInitialHands(game);

        // Collect ante for the first round
        this.playerManager.collectAnte(game);

        this.io.to(game.id).emit('gameStateUpdated', game);
    }

    /**
     * Roll dice for the current round
     */
    rollDiceForRound(game: GameState): void {
        const diceRoll = rollDice();
        game.currentDiceRoll = diceRoll;
        game.targetNumber = diceRoll.goldValue;
        game.preferredSuit = diceRoll.silverSuit;
        game.currentPhase = 'selection';

        this.io.to(game.id).emit('gameStateUpdated', game);
    }

    /**
     * End the current round and handle winner determination
     */
    endRound(game: GameState, immediateTransition: boolean = false): void {
        if (game.targetNumber === null || game.preferredSuit === null) {
            throw new Error('Cannot end round: target number or preferred suit not set');
        }

        const activePlayers = this.playerManager.getActivePlayers(game);
        let winner;
        let tiebreakerUsed = false;

        if ((game as any)._pendingWinner) {
            winner = game.players.find(p => p.id === (game as any)._pendingWinner);
            delete (game as any)._pendingWinner;
        } else if (activePlayers.length === 1) {
            winner = activePlayers[0];
        } else {
            const result = this.determineRoundWinner(activePlayers, game.targetNumber, game.preferredSuit, game.deck);
            winner = result.winner;
            tiebreakerUsed = result.tiebreakerUsed;
        }

        if (!winner) throw new Error('No winner could be determined');

        // Award pot to winner
        this.playerManager.awardPotToWinner(game, winner);

        // Check if game should end
        if (this.gameStateManager.shouldEndGameAfterRound(game)) {
            const gameWinner = this.playerManager.determineGameWinner(game);
            this.gameStateManager.cleanupGameState(game);
            this.io.to(game.id).emit('gameEnded', {
                winner: gameWinner.name,
                finalChips: gameWinner.chips,
                allPlayers: game.players.map(p => ({
                    name: p.name,
                    finalChips: p.chips
                }))
            });
        } else {
            // Reset game state for next round
            this.resetForNextRound(game);

            // Collect ante for the next round
            this.playerManager.collectAnte(game);

            // Transition to setup phase
            if (immediateTransition) {
                // For tests, transition immediately
                game.currentPhase = 'setup';
                game.status = 'waiting';
                this.io.to(game.id).emit('gameStateUpdated', game);
            } else {
                // For production, transition after a short delay
                setTimeout(() => {
                    game.currentPhase = 'setup';
                    game.status = 'waiting';
                    this.io.to(game.id).emit('gameStateUpdated', game);
                }, ROUND_CONSTANTS.ROUND_END_DELAY_MS);
            }
        }

        this.io.to(game.id).emit('gameStateUpdated', game);
        this.io.to(game.id).emit('roundEnded', {
            winner: winner.name,
            pot: game.pot,
            tiebreakerUsed
        });
    }

    /**
     * Reset game state for the next round
     */
    private resetForNextRound(game: GameState): void {
        game.pot = 0;
        this.rotateDealer(game);
        game.roundNumber++;
        game.currentPhase = 'round_end';
        game.currentDiceRoll = null;
        game.targetNumber = null;
        game.preferredSuit = null;

        // Reset betting phase fields
        game.bettingPhaseStarted = false;
        game.bettingRoundComplete = false;

        // Reset player state
        this.playerManager.resetPlayerStateForNewRound(game);

        // Shuffle deck for next round
        game.deck = shuffle(createDeck());
    }

    /**
     * Rotate dealer to the next player
     */
    private rotateDealer(game: GameState): void {
        game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
        const newDealer = game.players[game.dealerIndex];
        game.dealersUsed.add(newDealer.id);
    }

    /**
     * Determine the winner of the current round
     */
    private determineRoundWinner(activePlayers: Player[], targetNumber: number, preferredSuit: Suit, deck: Card[]): {
        winner: Player;
        tiebreakerUsed: boolean;
    } {
        return determineWinner(activePlayers, targetNumber, preferredSuit, deck);
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
            gameShouldEnd: this.gameStateManager.shouldEndGame(game)
        };
    }

    /**
     * Check if the game should end based on dealer rotation
     */
    shouldEndGame(game: GameState): boolean {
        return this.gameStateManager.shouldEndGame(game);
    }

    /**
     * Check if the game should end after the current round completes
     */
    shouldEndGameAfterRound(game: GameState): boolean {
        return this.gameStateManager.shouldEndGameAfterRound(game);
    }

    /**
     * Validate dealer rotation consistency
     */
    validateDealerRotation(game: GameState): void {
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
} 