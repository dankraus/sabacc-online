export interface Card {
  id: string;
  suit: 'sabers' | 'flasks' | 'coins' | 'staves';
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
  phase: 'waiting' | 'betting' | 'playing' | 'finished';
  pot: number;
  deck: Card[];
  winner?: string;
  maxPlayers: number;
}

export interface GameEvents {
  'player-join': { gameId: string; playerName: string };
  'player-leave': void;
  'place-bet': { amount: number };
  'draw-card': void;
  'stand': void;
  'game-state-update': GameState;
  'game-over': { winner: string; finalState: GameState };
  'error': { message: string };
}