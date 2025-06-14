export type CardSuit = 'sabers' | 'flasks' | 'coins' | 'staves';
export type GamePhase = 'waiting' | 'betting' | 'playing' | 'finished';

export interface Card {
  id: string;
  suit: CardSuit;
  value: number;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  credits: number;
  hand: Card[];
  bet: number;
  isDealer: boolean;
  isConnected: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayer: string;
  phase: GamePhase;
  pot: number;
  deck: Card[];
  winner?: string;
  maxPlayers: number;
}

// Socket.IO event types
export interface ServerToClientEvents {
  'game-state-update': (gameState: GameState) => void;
  'game-over': (data: { winner: string; finalState: GameState }) => void;
  'error': (error: { message: string }) => void;
  'player-joined': (data: { playerId: string; playerName: string }) => void;
  'player-left': (data: { playerId: string }) => void;
}

export interface ClientToServerEvents {
  'player-join': (data: { gameId: string; playerName: string }) => void;
  'player-leave': () => void;
  'place-bet': (data: { amount: number }) => void;
  'draw-card': () => void;
  'stand': () => void;
}

// UI specific types
export interface GameError {
  message: string;
  type: 'connection' | 'game' | 'validation';
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastDisconnect?: Date;
  reconnectAttempts: number;
}