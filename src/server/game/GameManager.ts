import { Server } from 'socket.io';
import { GameState, Player, GameSettings, DEFAULT_GAME_SETTINGS, GamePhase } from '../../shared/types/game';
import { createDeck, shuffle, rollDice, handleSabaccShift, determineWinner } from '../../shared/types/gameUtils';
import { BettingManager } from './BettingManager';

// Game constants
const GAME_CONSTANTS = {
    ANTE_AMOUNT: 5,
    CONTINUE_COST: 2,
    CARDS_PER_HAND: 5,
    ROUND_END_DELAY_MS: 3000
} as const;

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

export class GameManager {
    private games: Map<string, GameState>;
    private io: Server;
    private bettingManager: BettingManager;

    constructor(io: Server) {
        this.games = new Map();
        this.io = io;
        this.bettingManager = new BettingManager(io);
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

    private validateGameState(game: GameState): void {
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

    private validateDealerRotation(game: GameState): void {
        // Validate that dealer rotation is consistent
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

    private validatePlayerCanJoin(game: GameState, playerId: string): void {
        // Check if player is already in the game
        if (game.players.some(p => p.id === playerId)) {
            throw new Error('Player is already in the game');
        }

        // Note: Ante validation is done per round, not when joining
    }

    private validateGameCanStart(game: GameState): void {
        if (game.status === 'in_progress') {
            throw new Error('Game already in progress');
        }

        if (game.players.length < game.settings.minPlayers) {
            throw new Error('Not enough players to start the game');
        }

        // Validate all players have enough chips for ante (first round)
        game.players.forEach(player => {
            if (player.chips < GAME_CONSTANTS.ANTE_AMOUNT) {
                throw new Error(`Player ${player.name} does not have enough chips for ante`);
            }
        });
    }

    private validatePhaseTransition(game: GameState, currentPhase: GamePhase, nextPhase: GamePhase): void {
        if (!PHASE_TRANSITIONS[currentPhase]?.includes(nextPhase)) {
            throw new Error(`Invalid phase transition from ${currentPhase} to ${nextPhase}`);
        }

        // Validate phase completion requirements
        switch (currentPhase) {
            case 'selection':
                if (!game.players.every(p => p.selectedCards.length > 0)) {
                    throw new Error('All players must select cards before proceeding');
                }
                break;
            case 'improve':
                if (!game.players.every(p => !p.isActive || p.hand.length === 0)) {
                    throw new Error('All active players must complete improvement');
                }
                break;
        }
    }

    private handlePhaseTimeout(game: GameState): void {
        switch (game.currentPhase) {
            case 'selection':
                // Auto-select first card for inactive players
                game.players.forEach(player => {
                    if (player.isActive && player.selectedCards.length === 0 && player.hand.length > 0) {
                        player.selectedCards = [player.hand[0]];
                        player.hand = player.hand.slice(1);
                    }
                });
                if (game.players.every(p => p.selectedCards.length > 0)) {
                    game.currentPhase = 'first_betting';
                }
                break;
            case 'first_betting':
                // Auto-fold inactive players who haven't acted
                game.players.forEach(player => {
                    if (player.isActive && !player.hasActed) {
                        player.isActive = false;
                        player.hand = [];
                        player.selectedCards = [];
                    }
                });
                break;
            case 'second_betting':
                // Auto-fold inactive players who haven't acted in second betting
                game.players.forEach(player => {
                    if (player.isActive && !player.hasActed) {
                        player.isActive = false;
                        player.hand = [];
                        player.selectedCards = [];
                    }
                });
                break;
            case 'improve':
                // Auto-complete improvement for inactive players
                game.players.forEach(player => {
                    if (player.isActive && player.hand.length > 0) {
                        player.selectedCards = [...player.selectedCards, ...player.hand];
                        player.hand = [];
                    }
                });
                if (game.players.every(p => !p.isActive || p.hand.length === 0)) {
                    game.currentPhase = 'reveal';
                }
                break;
        }
        this.io.to(game.id).emit('gameStateUpdated', game);
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
        this.validateGameState(game);
        this.validatePlayerCanJoin(game, playerId);

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
        this.validateGameState(game);
        this.validateGameCanStart(game);

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

    private shouldEndGame(game: GameState): boolean {
        // Game ends when each player has dealt once
        // Validate that all players have been dealer exactly once
        const allPlayersHaveDealt = game.players.every(player => game.dealersUsed.has(player.id));
        const correctRoundNumber = game.roundNumber >= game.players.length;

        // Both conditions must be true for the game to end
        return allPlayersHaveDealt && correctRoundNumber;
    }

    private shouldEndGameAfterRound(game: GameState): boolean {
        // Check if the game should end after the current round completes
        // This accounts for the fact that roundNumber will be incremented after this check
        const allPlayersHaveDealt = game.players.every(player => game.dealersUsed.has(player.id));
        const willBeCorrectRoundNumber = (game.roundNumber + 1) >= game.players.length;

        return allPlayersHaveDealt && willBeCorrectRoundNumber;
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

    private cleanupGameState(game: GameState): void {
        // Reset all game state
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
            // Reset betting fields
            player.hasActed = false;
            player.bettingAction = null;
        });
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
        if (this.shouldEndGameAfterRound(game)) {
            const gameWinner = this.determineGameWinner(game);
            this.cleanupGameState(game);
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
            game.pot = 0;
            game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
            game.roundNumber++;
            game.currentPhase = 'round_end';
            game.deck = shuffle(createDeck());
            game.currentDiceRoll = null;
            game.targetNumber = null;
            game.preferredSuit = null;
            // Reset betting phase fields
            game.bettingPhaseStarted = false;
            game.bettingRoundComplete = false;
            game.players.forEach(player => {
                player.hand = [];
                player.selectedCards = [];
                player.isActive = true;
                // Reset betting fields
                player.hasActed = false;
                player.bettingAction = null;
            });

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