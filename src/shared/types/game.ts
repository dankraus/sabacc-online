import { Server, Socket } from 'socket.io';

export type Suit = 'Circle' | 'Triangle' | 'Square';
export type CardColor = 'red' | 'green';
export type GamePhase =
    | 'setup'
    | 'initial_roll'
    | 'selection'
    | 'first_betting'
    | 'sabacc_shift'
    | 'second_betting'
    | 'improve'
    | 'reveal'
    | 'round_end';
export type GameStatus = 'waiting' | 'in_progress' | 'completed';

// New betting action types
export type BettingAction = 'continue' | 'fold';

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
    hasActed: boolean; // Track if player has acted this betting phase
    bettingAction: BettingAction | null; // Track their choice
}

export interface GameSettings {
    minPlayers: number;
    maxPlayers: number;
    startingChips: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
    minPlayers: 2,
    maxPlayers: 6,
    startingChips: 100
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
    continueCost: number;
    bettingRoundComplete: boolean;
    bettingPhaseStarted: boolean;
    dealersUsed: Set<string>; // Track which players have been dealer
    hostId: string | null; // Track who created the game
}

// Base event type with common properties that all events receive
export interface BaseEvent {
    timestamp: number;
    sequenceNumber: number;
}

// Helper type to add BaseEvent properties to any type
type WithEventMetadata<T> = T & BaseEvent;

// Socket.IO event types with proper typing
export interface ServerToClientEvents {
    gameStateUpdated: (data: WithEventMetadata<GameState>) => void;
    playerJoined: (data: WithEventMetadata<Player>) => void;
    playerLeft: (data: WithEventMetadata<string>) => void;
    errorOccurred: (data: WithEventMetadata<string>) => void;
    chatMessageReceived: (data: WithEventMetadata<{ playerId: string; text: string; timestamp: number }>) => void;
    bettingPhaseStarted: (data: WithEventMetadata<string>) => void;
    playerActed: (data: WithEventMetadata<{ playerId: string; action: BettingAction }>) => void;
    bettingPhaseCompleted: (data: WithEventMetadata<string>) => void;
    gameStarted: (data: WithEventMetadata<string>) => void;
    diceRolled: (data: WithEventMetadata<{ gameId: string; diceRoll: DiceRoll }>) => void;
    cardsSelected: (data: WithEventMetadata<{ gameId: string; playerId: string }>) => void;
    cardsImproved: (data: WithEventMetadata<{ gameId: string; playerId: string }>) => void;
    roundEnded: (data: WithEventMetadata<{ winner: string; pot: number; tiebreakerUsed: boolean }>) => void;
    gameEnded: (data: WithEventMetadata<{ winner: string; finalChips: number; allPlayers: { name: string; finalChips: number }[] }>) => void;
}

export interface ClientToServerEvents {
    gameJoined: (data: { gameId: string; playerName: string }) => void;
    gameLeft: (gameId: string) => void;
    chatMessageSent: (message: string) => void;
    continuePlaying: (gameId: string) => void;
    fold: (gameId: string) => void;
    startGame: (data: { gameId: string; dealerId?: string }) => void;
    rollDice: (gameId: string) => void;
    selectCards: (data: { gameId: string; selectedCardIndices: number[] }) => void;
    improveCards: (data: { gameId: string; cardsToAdd: number[] }) => void;
    endRound: (gameId: string) => void;
}

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Event logging types
export interface GameEvent {
    id: string;
    gameId: string;
    type: string;
    timestamp: number;
    sequenceNumber: number;
    data: any;
    playerId?: string;
}

export interface EventLog {
    gameId: string;
    events: GameEvent[];
    lastSequenceNumber: number;
}

// Enhanced event types with timestamps and sequence numbers
export interface TimestampedEvent {
    timestamp: number;
    sequenceNumber: number;
} 