import { Server } from 'socket.io';
import { GameState, Player, GameSettings, DEFAULT_GAME_SETTINGS, GamePhase } from '../../shared/types/game';
import { createDeck, shuffle } from '../../shared/types/gameUtils';
import { BettingManager } from './BettingManager';
import { GameStateManager } from './GameStateManager';
import { PlayerManager } from './PlayerManager';
import { RoundManager } from './RoundManager';

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
    private playerManager: PlayerManager;
    private roundManager: RoundManager;

    constructor(io: Server) {
        this.games = new Map();
        this.io = io;
        this.bettingManager = new BettingManager(io);
        this.gameStateManager = new GameStateManager(io);
        this.playerManager = new PlayerManager(io);
        this.roundManager = new RoundManager(io);
    }

    private getGameOrThrow(gameId: string): GameState {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        return game;
    }

    private getPlayerOrThrow(game: GameState, playerId: string): Player {
        return this.playerManager.getPlayerOrThrow(game, playerId);
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
        return this.roundManager.getDealerRotationInfo(game);
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
        return this.playerManager.createPlayer(playerId, playerName, startingChips);
    }

    joinGame(gameId: string, playerName: string, playerId: string): GameState {
        let game = this.games.get(gameId);

        if (!game) {
            game = this.createNewGame(gameId);
        }

        // Validate game state and player can join
        this.gameStateManager.validateGameState(game);
        this.playerManager.validatePlayerCanJoin(game, playerId);

        // Add player
        const player = this.createPlayer(playerId, playerName, game.settings.startingChips);
        this.playerManager.addPlayerToGame(game, player);

        return game;
    }

    leaveGame(gameId: string, playerId: string): void {
        const game = this.getGameOrThrow(gameId);

        this.playerManager.removePlayerFromGame(game, playerId);

        if (game.players.length === 0) {
            // Remove game if no players left
            this.games.delete(gameId);
        }
    }

    getGameState(gameId: string): GameState {
        return this.getGameOrThrow(gameId);
    }

    getGameByPlayerId(playerId: string): GameState | null {
        return this.playerManager.findGameByPlayerId(this.games, playerId);
    }

    handleDisconnect(playerId: string): void {
        this.playerManager.handlePlayerDisconnect(this.games, playerId);
    }



    startGame(gameId: string, dealerId?: string): void {
        const game = this.getGameOrThrow(gameId);
        this.roundManager.startNewRound(game, dealerId);
    }

    rollDice(gameId: string): void {
        const game = this.getGameOrThrow(gameId);
        this.roundManager.rollDiceForRound(game);
    }

    selectCards(gameId: string, playerId: string, selectedCardIndices: number[]): void {
        const game = this.getGameOrThrow(gameId);
        const player = this.getPlayerOrThrow(game, playerId);

        player.selectedCards = selectedCardIndices.map(index => player.hand[index]);
        player.hand = player.hand.filter((_, index) => !selectedCardIndices.includes(index));

        // Check if all players have selected
        const allSelected = this.playerManager.allPlayersHaveSelected(game);
        if (allSelected) {
            game.currentPhase = 'first_betting';
            // Start betting phase
            this.bettingManager.startBettingPhase(game);
        }

        this.io.to(gameId).emit('gameStateUpdated', game);
    }

    handleSabaccShift(gameId: string): void {
        const game = this.getGameOrThrow(gameId);

        this.playerManager.handleSabaccShiftForPlayers(game);

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
        this.playerManager.validateCardIndices(player, cardsToAdd);

        // Add selected cards to player's selection
        const cardsToAddToSelection = cardsToAdd.map(index => player.hand[index]);
        player.selectedCards = [...player.selectedCards, ...cardsToAddToSelection];

        // Remove added cards from hand
        player.hand = player.hand.filter((_, index) => !cardsToAdd.includes(index));

        // Check if all players have completed improvement
        const allPlayersDone = this.playerManager.allActivePlayersCompletedImprovement(game);
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







    endRound(gameId: string, immediateTransition: boolean = false): void {
        const game = this.getGameOrThrow(gameId);
        this.roundManager.endRound(game, immediateTransition);
    }
} 