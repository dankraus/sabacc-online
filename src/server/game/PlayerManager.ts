import { Server } from 'socket.io';
import { GameState, Player, GameSettings, DEFAULT_GAME_SETTINGS } from '../../shared/types/game';
import { handleSabaccShift } from '../../shared/types/gameUtils';

// Player-related constants
const PLAYER_CONSTANTS = {
    ANTE_AMOUNT: 5,
    CARDS_PER_HAND: 5
} as const;

export class PlayerManager {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    /**
     * Create a new player with default state
     */
    createPlayer(playerId: string, playerName: string, startingChips: number): Player {
        return {
            id: playerId,
            name: playerName,
            chips: startingChips,
            hand: [],
            selectedCards: [],
            isActive: true,
            hasActed: false,
            bettingAction: null
        };
    }

    /**
     * Validate that a player can join a game
     */
    validatePlayerCanJoin(game: GameState, playerId: string): void {
        // Check if player is already in the game
        if (game.players.some(p => p.id === playerId)) {
            throw new Error('Player is already in the game');
        }

        // Check if game is full
        if (game.players.length >= game.settings.maxPlayers) {
            throw new Error('Game is full');
        }

        // Check if game is in progress
        if (game.status === 'in_progress') {
            throw new Error('Cannot join game in progress');
        }
    }

    /**
     * Add a player to a game
     */
    addPlayerToGame(game: GameState, player: Player): void {
        game.players.push(player);

        // Notify all players
        this.io.to(game.id).emit('gameStateUpdated', game);
        this.io.to(game.id).emit('playerJoined', player);
    }

    /**
     * Remove a player from a game
     */
    removePlayerFromGame(game: GameState, playerId: string): string {
        const playerIndex = game.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            throw new Error('Player not found in game');
        }

        const playerName = game.players[playerIndex].name;
        game.players.splice(playerIndex, 1);

        // Notify remaining players
        this.io.to(game.id).emit('gameStateUpdated', game);
        this.io.to(game.id).emit('playerLeft', playerName);

        return playerName;
    }

    /**
     * Find a player in a game
     */
    findPlayer(game: GameState, playerId: string): Player | undefined {
        return game.players.find(p => p.id === playerId);
    }

    /**
     * Get a player or throw an error if not found
     */
    getPlayerOrThrow(game: GameState, playerId: string): Player {
        const player = this.findPlayer(game, playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        return player;
    }

    /**
     * Find a game that contains a specific player
     */
    findGameByPlayerId(games: Map<string, GameState>, playerId: string): GameState | null {
        for (const game of games.values()) {
            if (game.players.some(p => p.id === playerId)) {
                return game;
            }
        }
        return null;
    }

    /**
     * Handle player disconnection
     */
    handlePlayerDisconnect(games: Map<string, GameState>, playerId: string): void {
        // Find game containing this player
        for (const [gameId, game] of games.entries()) {
            const player = this.findPlayer(game, playerId);
            if (player) {
                this.removePlayerFromGame(game, playerId);

                // Remove game if no players left
                if (game.players.length === 0) {
                    games.delete(gameId);
                }
                break;
            }
        }
    }

    /**
     * Validate that all players have enough chips for ante
     */
    validatePlayersHaveEnoughChips(game: GameState): void {
        game.players.forEach(player => {
            if (player.chips < PLAYER_CONSTANTS.ANTE_AMOUNT) {
                throw new Error(`Player ${player.name} does not have enough chips for ante`);
            }
        });
    }

    /**
     * Collect ante from all players
     */
    collectAnte(game: GameState): void {
        this.validatePlayersHaveEnoughChips(game);

        // Collect ante from all players
        game.players.forEach(player => {
            player.chips -= PLAYER_CONSTANTS.ANTE_AMOUNT;
        });
        game.pot += PLAYER_CONSTANTS.ANTE_AMOUNT * game.players.length;
    }

    /**
     * Deal initial hands to all players
     */
    dealInitialHands(game: GameState): void {
        game.players.forEach(player => {
            player.hand = game.deck.splice(0, PLAYER_CONSTANTS.CARDS_PER_HAND);
            player.selectedCards = [];
            player.isActive = true;
            player.hasActed = false;
            player.bettingAction = null;
        });
    }

    /**
     * Reset player state for a new round
     */
    resetPlayerStateForNewRound(game: GameState): void {
        game.players.forEach(player => {
            player.hand = [];
            player.selectedCards = [];
            player.isActive = true;
            player.hasActed = false;
            player.bettingAction = null;
        });
    }

    /**
     * Handle Sabacc Shift for all players
     */
    handleSabaccShiftForPlayers(game: GameState): void {
        game.players.forEach(player => {
            // Step 1: Identify unselected cards that need to be discarded
            const unselectedCards = player.hand.filter(card => !player.selectedCards.includes(card));
            const numCardsToDiscard = unselectedCards.length;

            // Step 2: Discard unselected cards (remove them from hand)
            // Players must discard unselected cards before drawing new ones
            player.hand = player.selectedCards.slice();

            // Step 3: Draw new cards equal to number discarded
            handleSabaccShift(player, numCardsToDiscard, game.deck);
        });
    }

    /**
     * Validate card selection indices
     */
    validateCardIndices(player: Player, cardIndices: number[]): void {
        if (!cardIndices.every(index => index >= 0 && index < player.hand.length)) {
            throw new Error('Invalid card indices');
        }
    }

    /**
     * Check if all players have selected cards
     */
    allPlayersHaveSelected(game: GameState): boolean {
        return game.players.every(p => p.selectedCards.length > 0);
    }

    /**
     * Check if all active players have completed improvement
     */
    allActivePlayersCompletedImprovement(game: GameState): boolean {
        return game.players.every(p => !p.isActive || p.hand.length === 0);
    }

    /**
     * Get active players
     */
    getActivePlayers(game: GameState): Player[] {
        return game.players.filter(p => p.isActive);
    }

    /**
     * Determine game winner (player with most chips)
     */
    determineGameWinner(game: GameState): Player {
        let winner = game.players[0];
        for (let i = 1; i < game.players.length; i++) {
            if (game.players[i].chips > winner.chips) {
                winner = game.players[i];
            }
        }
        return winner;
    }

    /**
     * Award pot to winner
     */
    awardPotToWinner(game: GameState, winner: Player): void {
        winner.chips += game.pot;
    }
} 