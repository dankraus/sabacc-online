import { Server } from 'socket.io';
import { GameState, Player, GameSettings, DEFAULT_GAME_SETTINGS, GamePhase } from '../../shared/types/game';
import { createDeck, shuffle, rollDice, handleSabaccShift, determineWinner } from '../../shared/types/gameUtils';

export class GameManager {
    private games: Map<string, GameState>;
    private io: Server;

    constructor(io: Server) {
        this.games = new Map();
        this.io = io;
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

    joinGame(gameId: string, playerName: string, playerId: string): GameState {
        let game = this.games.get(gameId);

        if (!game) {
            // Create new game
            game = {
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
                dealerIndex: 0
            };
            this.games.set(gameId, game);
        }

        // Check if game is full
        if (game.players.length >= game.settings.maxPlayers) {
            throw new Error('Game is full');
        }

        // Add player
        const player: Player = {
            id: playerId,
            name: playerName,
            chips: game.settings.startingChips,
            hand: [],
            selectedCards: [],
            isActive: true
        };

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

    startGame(gameId: string, dealerId?: string): void {
        const game = this.getGameOrThrow(gameId);
        if (game.players.length < game.settings.minPlayers) throw new Error('Not enough players to start the game');
        const dealer = game.players[game.dealerIndex];
        if (dealerId && dealer.id !== dealerId) throw new Error('Only the dealer can start the game');

        if (game.status === 'in_progress') {
            throw new Error('Game already in progress');
        }

        game.status = 'in_progress';
        game.currentPhase = 'initial_roll';
        game.deck = shuffle(createDeck());
        game.roundNumber = 1;
        // Dealer index remains the same for the round

        // Deal initial hands
        game.players.forEach(player => {
            player.hand = game.deck.splice(0, 5);
            player.selectedCards = [];
            player.isActive = true;
        });

        // Add ante to pot
        const ante = 5;
        game.players.forEach(player => {
            player.chips -= ante;
        });
        game.pot += ante * game.players.length;

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
        }

        this.io.to(gameId).emit('gameStateUpdated', game);
    }

    handleSabaccShift(gameId: string): void {
        const game = this.getGameOrThrow(gameId);

        game.players.forEach(player => {
            // Identify unselected cards
            const unselectedCards = player.hand.filter(card => !player.selectedCards.includes(card));
            const numCardsToDraw = unselectedCards.length;
            // Remove unselected cards from hand
            player.hand = player.selectedCards.slice();
            // Draw new cards equal to number discarded
            handleSabaccShift(player, numCardsToDraw, game.deck);
        });

        game.currentPhase = 'improve';
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

    fold(gameId: string, playerId: string): void {
        const game = this.getGameOrThrow(gameId);
        if (game.currentPhase !== 'first_betting' && game.currentPhase !== 'improve') {
            throw new Error('Cannot fold in current phase');
        }
        const player = this.getPlayerOrThrow(game, playerId);
        if (!player.isActive) throw new Error('Player is not active');

        player.isActive = false;
        player.hand = [];
        player.selectedCards = [];

        const activePlayers = game.players.filter(p => p.isActive);
        if (activePlayers.length === 1) {
            (game as any)._pendingWinner = activePlayers[0].id;
        }
        this.io.to(gameId).emit('gameStateUpdated', game);
    }

    placeBet(gameId: string, playerId: string, amount: number): void {
        const game = this.getGameOrThrow(gameId);
        if (game.currentPhase !== 'first_betting' && game.currentPhase !== 'improve') {
            throw new Error('Cannot bet in current phase');
        }
        const player = this.getPlayerOrThrow(game, playerId);
        if (!player.isActive) throw new Error('Player is not active');
        if (amount > player.chips) throw new Error('Insufficient chips for bet');

        player.chips -= amount;
        game.pot += amount;
        this.io.to(gameId).emit('gameStateUpdated', game);
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

        // Reset game state for next round
        game.pot = 0;
        game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
        game.roundNumber++;
        game.currentPhase = 'setup';
        game.deck = shuffle(createDeck());
        game.currentDiceRoll = null;
        game.targetNumber = null;
        game.preferredSuit = null;
        game.players.forEach(player => {
            player.hand = [];
            player.selectedCards = [];
            player.isActive = true;
        });

        this.io.to(gameId).emit('gameStateUpdated', game);
        this.io.to(gameId).emit('roundEnded', {
            winner: winner.name,
            pot: game.pot,
            tiebreakerUsed
        });
    }
} 