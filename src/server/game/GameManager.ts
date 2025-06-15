import { Server } from 'socket.io';
import { GameState, Player, GameSettings, DEFAULT_GAME_SETTINGS } from '../../shared/types/game';
import { createDeck, shuffle } from '../../shared/types/gameUtils';

export class GameManager {
    private games: Map<string, GameState>;
    private io: Server;

    constructor(io: Server) {
        this.games = new Map();
        this.io = io;
    }

    joinGame(gameId: string, playerName: string): GameState {
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
                lastAction: null
            };
            this.games.set(gameId, game);
        }

        // Check if game is full
        if (game.players.length >= game.settings.maxPlayers) {
            throw new Error('Game is full');
        }

        // Add player
        const player: Player = {
            id: `player-${Date.now()}`,
            name: playerName,
            chips: game.settings.startingChips,
            hand: [],
            selectedCards: [],
            isActive: true
        };

        game.players.push(player);

        // Check if game should start
        if (game.players.length >= game.settings.minPlayers) {
            game.status = 'in_progress';
            game.currentPhase = 'betting';
        }

        // Notify all players
        this.io.to(gameId).emit('gameStateUpdated', game);
        this.io.to(gameId).emit('playerJoined', player);

        return game;
    }

    leaveGame(gameId: string, playerName: string): void {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        const playerIndex = game.players.findIndex(p => p.name === playerName);
        if (playerIndex === -1) {
            throw new Error('Player not found in game');
        }

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
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        return game;
    }

    handleDisconnect(playerName: string): void {
        // Find game containing this player
        for (const [gameId, game] of this.games.entries()) {
            const player = game.players.find(p => p.name === playerName);
            if (player) {
                this.leaveGame(gameId, playerName);
                break;
            }
        }
    }
} 