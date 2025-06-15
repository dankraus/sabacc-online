import { Server, Socket } from 'socket.io';

export type Suit = 'Circle' | 'Triangle' | 'Square';
export type CardColor = 'red' | 'green';
export type GamePhase = 'setup' | 'betting' | 'drawing' | 'discarding' | 'shifting' | 'final_bet' | 'showdown';
export type GameStatus = 'waiting' | 'in_progress' | 'completed';

export interface Card {
    suit?: Suit;
    value: number;  // -10 to +10, 0 for wild cards
    color: CardColor;
    isWild: boolean;  // true for zero cards
}

export interface Player {
    id: string;
    name: string;
    chips: number;
    hand: Card[];
    selectedCards: Card[];
    isActive: boolean;
}

export interface GameSettings {
    minPlayers: number;
    maxPlayers: number;
    startingChips: number;
    isTournamentRules: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
    minPlayers: 2,
    maxPlayers: 6,
    startingChips: 10,
    isTournamentRules: true
};

export interface GameState {
    id: string;
    status: GameStatus;
    currentPhase: GamePhase;
    players: Player[];
    deck: Card[];
    settings: GameSettings;
    currentPlayer: string | null;
    pot: number;
    lastAction: string | null;
}

// Socket.IO event types
export interface ServerToClientEvents {
    gameStateUpdated: (state: GameState) => void;
    playerJoined: (player: Player) => void;
    playerLeft: (playerName: string) => void;
    errorOccurred: (message: string) => void;
    chatMessageReceived: (message: { player: string; text: string; timestamp: number }) => void;
}

export interface ClientToServerEvents {
    gameJoined: (gameId: string, playerName: string) => void;
    gameLeft: () => void;
    chatMessageSent: (message: string) => void;
}

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>; 