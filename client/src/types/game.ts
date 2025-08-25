// Local type definitions for client-side use
export interface Card {
    suit?: string;
    value: number;
    color?: string;
    isWild: boolean;
}

export interface Player {
    id: string;
    name: string;
    chips: number;
    hand: Card[]; // Card[] - simplified for client
    selectedCards: Card[]; // Card[] - simplified for client
    isActive: boolean;
    hasActed: boolean;
    bettingAction: 'continue' | 'fold' | null;
}

export interface GameState {
    id: string;
    status: 'waiting' | 'in_progress' | 'ended';
    players: Player[];
    hostId: string | null;
} 