import { Server, Socket } from 'socket.io';

export type Suit = 'Circle' | 'Triangle' | 'Square';
export type CardColor = 'red' | 'green';
export type GamePhase =
    | 'setup'
    | 'initial_roll'
    | 'selection'
    | 'first_betting'
    | 'sabacc_shift'
    | 'improve'
    | 'reveal'
    | 'round_end';
export type GameStatus = 'waiting' | 'in_progress' | 'completed';

export interface Card {
    suit?: Suit; // null for zero cards
    value: number; // -10 to +10, 0 for wild cards
    color?: CardColor; // null for zero cards
    isWild: boolean; // true for zero cards
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
    startingChips: 100,
    isTournamentRules: true
};

export interface DiceRoll {
    goldValue: number;
    silverSuit: Suit;
}

export interface GameState {
    id: string;
    status: 'waiting' | 'in_progress' | 'ended';
    currentPhase: GamePhase;
    players: Player[];
    deck: Card[];
    settings: GameSettings;
    currentPlayer: string | null;
    pot: number;
    lastAction: string | null;
    currentDiceRoll: DiceRoll | null;
    targetNumber: number | null;
    preferredSuit: Suit | null;
    roundNumber: number;
    dealerIndex: number;
}

// Socket.IO event types
export interface ServerToClientEvents {
    gameStateUpdated: (state: GameState) => void;
    playerJoined: (player: Player) => void;
    playerLeft: (playerId: string) => void;
    errorOccurred: (message: string) => void;
    chatMessageReceived: (message: { playerId: string; text: string; timestamp: number }) => void;
}

export interface ClientToServerEvents {
    gameJoined: (data: { gameId: string; playerName: string }) => void;
    gameLeft: (gameId: string) => void;
    chatMessageSent: (message: string) => void;
}

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>; 