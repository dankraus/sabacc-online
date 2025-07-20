import { Server } from 'socket.io';
import { GameState, Player, GameSettings, DEFAULT_GAME_SETTINGS, GamePhase } from '../../shared/types/game';
import { createDeck, shuffle, rollDice, handleSabaccShift, determineWinner } from '../../shared/types/gameUtils';
import { BettingManager } from './BettingManager';
import { GameStateManager } from './GameStateManager';

// Game constants
const GAME_CONSTANTS = {
    ANTE_AMOUNT: 5,
    CONTINUE_COST: 2,
    CARDS_PER_HAND: 5,
    ROUND_END_DELAY_MS: 3000
} as const;



export class GameManager {
    private games: Map<string, GameState>;
    private io: Server;
    private bettingManager: BettingManager;
    private gameStateManager: GameStateManager;

    constructor(io: Server) {
        this.games = new Map();
        this.io = io;
        this.bettingManager = new BettingManager(io);
        this.gameStateManager = new GameStateManager(io);
    }

    private getGameOrThrow(gameId: string): GameState {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        return game;
    }

    private getPlayerOrThrow(game: GameState, playerId: string): Player {
        const player = game.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        return player;
    }



    /**
     * Get dealer rotation information for debugging and validation
     */
    getDealerRotationInfo(gameId: string): {
        currentDealer: string;
        dealersUsed: string[];
        playersNotDealt: string[];
        roundNumber: number;
        totalPlayers: number;
        gameShouldEnd: boolean;
    } {
        const game = this.getGameOrThrow(gameId);
        return this.gameStateManager.getDealerRotationInfo(game);
    }



    private validatePhaseTransition(game: GameState, currentPhase: GamePhase, nextPhase: GamePhase): void {
        this.gameStateManager.validatePhaseTransition(game, currentPhase, nextPhase);
    }



    private createNewGame(gameId: string): GameState {
        const game: GameState = {
            id: gameId,
            status: 'waiting',
            currentPhase: 'setup',
            players: [],
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
            continueCost: GAME_CONSTANTS.CONTINUE_COST,
            bettingRoundComplete: false,
            bettingPhaseStarted: false,
            dealersUsed: new Set<string>()
        };
        this.games.set(gameId, game);
        return game;
    }

    private createPlayer(playerId: string, playerName: string, startingChips: number): Player {
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

    joinGame(gameId: string, playerName: string, playerId: string): GameState {
        let game = this.games.get(gameId);

        if (!game) {
            game = this.createNewGame(gameId);
        }

        // Validate game state
        this.gameStateManager.validateGameState(game);
        this.gameStateManager.validatePlayerCanJoin(game, playerId);

        // Check if game is full
        if (game.players.length >= game.settings.maxPlayers) {
            throw new Error('Game is full');
        }

        // Add player
        const player = this.createPlayer(playerId, playerName, game.settings.startingChips);
        game.players.push(player);

        // Notify all players
        this.io.to(gameId).emit('gameStateUpdated', game);
        this.io.to(gameId).emit('playerJoined', player);

        return game;
    }

    leaveGame(gameId: string, playerId: string): void {
        const game = this.getGameOrThrow(gameId);

        const playerIndex = game.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            throw new Error('Player not found in game');
        }

        const playerName = game.players[playerIndex].name;
        game.players.splice(playerIndex, 1);

        if (game.players.length === 0) {
            // Remove game if no players left
            this.games.delete(gameId);
        } else {
            // Notify remaining players
            this.io.to(gameId).emit('gameStateUpdated', game);
            this.io.to(gameId).emit('playerLeft', playerName);
        }
    }

    getGameState(gameId: string): GameState {
        return this.getGameOrThrow(gameId);
    }

    getGameByPlayerId(playerId: string): GameState | null {
        for (const game of this.games.values()) {
            if (game.players.some(p => p.id === playerId)) {
                return game;
            }
        }
        return null;
    }

    handleDisconnect(playerId: string): void {
        // Find game containing this player
        for (const [gameId, game] of this.games.entries()) {
            const player = game.players.find(p => p.id === playerId);
            if (player) {
                this.leaveGame(gameId, playerId);
                break;
            }
        }
    }

    private collectAnte(game: GameState): void {
        // Validate all players have enough chips for ante
        game.players.forEach(player => {
            if (player.chips < GAME_CONSTANTS.ANTE_AMOUNT) {
                throw new Error(`Player ${player.name} does not have enough chips for ante`);
            }
        });

        // Collect ante from all players
        game.players.forEach(player => {
            player.chips -= GAME_CONSTANTS.ANTE_AMOUNT;
        });
        game.pot += GAME_CONSTANTS.ANTE_AMOUNT * game.players.length;
    }

    startGame(gameId: string, dealerId?: string): void {
        const game = this.getGameOrThrow(gameId);
        this.gameStateManager.validateGameState(game);
        this.gameStateManager.validateGameCanStart(game, GAME_CONSTANTS.ANTE_AMOUNT);

        const dealer = game.players[game.dealerIndex];
        if (dealerId && dealer.id !== dealerId) {
            throw new Error('Only the dealer can start the game');
        }

        // Track that this player is now dealer
        game.dealersUsed.add(dealer.id);

        game.status = 'in_progress';
        this.validatePhaseTransition(game, game.currentPhase, 'initial_roll');
        game.currentPhase = 'initial_roll';
        game.deck = shuffle(createDeck());
        game.roundNumber = 1;

        // Deal initial hands
        game.players.forEach(player => {
            player.hand = game.deck.splice(0, GAME_CONSTANTS.CARDS_PER_HAND);
            player.selectedCards = [];
            player.isActive = true;
            player.hasActed = false;
            player.bettingAction = null;
        });

        // Collect ante for the first round
        this.collectAnte(game);

        this.io.to(gameId).emit('gameStateUpdated', game);
    }

    rollDice(gameId: string): void {
        const game = this.getGameOrThrow(gameId);

        const diceRoll = rollDice();
        game.currentDiceRoll = diceRoll;
        game.targetNumber = diceRoll.goldValue;
        game.preferredSuit = diceRoll.silverSuit;
        game.currentPhase = 'selection';

        this.io.to(gameId).emit('gameStateUpdated', game);
    }

    selectCards(gameId: string, playerId: string, selectedCardIndices: number[]): void {
        const game = this.getGameOrThrow(gameId);
        const player = this.getPlayerOrThrow(game, playerId);

        player.selectedCards = selectedCardIndices.map(index => player.hand[index]);
        player.hand = player.hand.filter((_, index) => !selectedCardIndices.includes(index));

        // Check if all players have selected
        const allSelected = game.players.every(p => p.selectedCards.length > 0);
        if (allSelected) {
            game.currentPhase = 'first_betting';
            // Start betting phase
            this.bettingManager.startBettingPhase(game);
        }

        this.io.to(gameId).emit('gameStateUpdated', game);
    }

    handleSabaccShift(gameId: string): void {
        const game = this.getGameOrThrow(gameId);

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

        game.currentPhase = 'second_betting';
        // Start second betting phase after Sabacc Shift
        this.bettingManager.startBettingPhase(game);
        this.io.to(gameId).emit('gameStateUpdated', game);
    }

    improveCards(gameId: string, playerId: string, cardsToAdd: number[]): void {
        const game = this.getGameOrThrow(gameId);
        if (game.currentPhase !== 'improve') {
            throw new Error('Cannot improve cards in current phase');
        }

        const player = this.getPlayerOrThrow(game, playerId);
        if (!player.isActive) throw new Error('Player is not active');

        // Validate card indices
        if (!cardsToAdd.every(index => index >= 0 && index < player.hand.length)) {
            throw new Error('Invalid card indices');
        }

        // Add selected cards to player's selection
        const cardsToAddToSelection = cardsToAdd.map(index => player.hand[index]);
        player.selectedCards = [...player.selectedCards, ...cardsToAddToSelection];

        // Remove added cards from hand
        player.hand = player.hand.filter((_, index) => !cardsToAdd.includes(index));

        // Check if all players have completed improvement
        const allPlayersDone = game.players.every(p => !p.isActive || p.hand.length === 0);
        if (allPlayersDone) {
            game.currentPhase = 'reveal';
        }

        this.io.to(gameId).emit('gameStateUpdated', game);
    }



    // Betting methods delegated to BettingManager

    continuePlaying(gameId: string, playerId: string): void {
        const game = this.getGameOrThrow(gameId);
        this.bettingManager.continuePlaying(game, playerId);
    }

    fold(gameId: string, playerId: string): void {
        const game = this.getGameOrThrow(gameId);
        this.bettingManager.fold(game, playerId);
    }

    handlePhaseTimeout(gameId: string): void {
        const game = this.getGameOrThrow(gameId);
        this.gameStateManager.handlePhaseTimeout(game);
    }



    private determineGameWinner(game: GameState): Player {
        // Find player with most chips
        let winner = game.players[0];
        for (let i = 1; i < game.players.length; i++) {
            if (game.players[i].chips > winner.chips) {
                winner = game.players[i];
            }
        }
        return winner;
    }



    endRound(gameId: string): void {
        const game = this.getGameOrThrow(gameId);
        if (game.targetNumber === null || game.preferredSuit === null) {
            throw new Error('Cannot end round: target number or preferred suit not set');
        }
        const activePlayers = game.players.filter(p => p.isActive);
        let winner;
        let tiebreakerUsed = false;

        if ((game as any)._pendingWinner) {
            winner = game.players.find(p => p.id === (game as any)._pendingWinner);
            delete (game as any)._pendingWinner;
        } else if (activePlayers.length === 1) {
            winner = activePlayers[0];
        } else {
            const result = determineWinner(activePlayers, game.targetNumber, game.preferredSuit, game.deck);
            winner = result.winner;
            tiebreakerUsed = result.tiebreakerUsed;
        }

        if (!winner) throw new Error('No winner could be determined');

        // Award pot to winner
        winner.chips += game.pot;

        // Check if game should end
        if (this.gameStateManager.shouldEndGameAfterRound(game)) {
            const gameWinner = this.determineGameWinner(game);
            this.gameStateManager.cleanupGameState(game);
            this.io.to(gameId).emit('gameEnded', {
                winner: gameWinner.name,
                finalChips: gameWinner.chips,
                allPlayers: game.players.map(p => ({
                    name: p.name,
                    finalChips: p.chips
                }))
            });
        } else {
            // Reset game state for next round
            this.gameStateManager.resetGameStateForNewRound(game);
            game.deck = shuffle(createDeck());

            // Collect ante for the next round
            this.collectAnte(game);

            // Transition to setup phase after a short delay
            setTimeout(() => {
                game.currentPhase = 'setup';
                game.status = 'waiting';
                this.io.to(gameId).emit('gameStateUpdated', game);
            }, GAME_CONSTANTS.ROUND_END_DELAY_MS);
        }

        this.io.to(gameId).emit('gameStateUpdated', game);
        this.io.to(gameId).emit('roundEnded', {
            winner: winner.name,
            pot: game.pot,
            tiebreakerUsed
        });
    }
} 