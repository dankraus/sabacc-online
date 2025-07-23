// Local type definitions for client-side use
export interface Player {
    id: string;
    name: string;
    chips: number;
    hand: any[]; // Card[] - simplified for client
    selectedCards: any[]; // Card[] - simplified for client
    isActive: boolean;
    hasActed: boolean;
    bettingAction: 'continue' | 'fold' | null;
} 