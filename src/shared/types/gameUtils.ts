import { Card, Suit, CardColor, GameSettings, DiceRoll, Player } from './game';

export const SUITS: Suit[] = ['Circle', 'Triangle', 'Square'];
export const CARD_COLORS: CardColor[] = ['red', 'green'];

// Create a new deck of cards
export function createDeck(): Card[] {
    const deck: Card[] = [];

    // Create regular cards (-10 to -1 for red, 1 to 10 for green)
    SUITS.forEach(suit => {
        // Red cards: -10 to -1
        for (let value = -10; value <= -1; value++) {
            deck.push({
                suit,
                value,
                color: 'red',
                isWild: false
            });
        }
        // Green cards: 1 to 10
        for (let value = 1; value <= 10; value++) {
            deck.push({
                suit,
                value,
                color: 'green',
                isWild: false
            });
        }
    });

    // Add two zero cards (wild cards, not part of any suit)
    for (let i = 0; i < 2; i++) {
        deck.push({
            suit: undefined as any, // Not part of any suit
            value: 0,
            color: undefined as any,
            isWild: true
        });
    }

    return deck;
}

// Shuffle an array using Fisher-Yates algorithm
export function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Calculate the score of a selection of cards
export function calculateScore(cards: Card[], targetNumber: number): number {
    const total = cards.reduce((sum, card) => sum + card.value, 0);
    return Math.abs(total - targetNumber);
}

// Count cards of preferred suit in a selection
export function countPreferredSuit(cards: Card[], preferredSuit: Suit): number {
    return cards.filter(card => (card.suit === preferredSuit || card.isWild)).length;
}

// Check if a game is ready to start
export function isGameReadyToStart(players: number, settings: GameSettings): boolean {
    return players >= settings.minPlayers && players <= settings.maxPlayers;
}

// Dice roll values
const GOLD_DIE_VALUES = [0, 0, 5, -5, 10, -10];
const SILVER_DIE_SUITS: Suit[] = ['Circle', 'Triangle', 'Square'];

export function rollDice(): DiceRoll {
    const goldValue = GOLD_DIE_VALUES[Math.floor(Math.random() * GOLD_DIE_VALUES.length)];
    const silverSuit = SILVER_DIE_SUITS[Math.floor(Math.random() * SILVER_DIE_SUITS.length)];
    return { goldValue, silverSuit };
}

export function handleSabaccShift(player: Player, numCardsToDraw: number, deck: Card[]): void {
    // Draw new cards equal to number discarded
    const newCards = deck.splice(0, numCardsToDraw);
    player.hand = [...player.hand, ...newCards];
}

export function canImproveSelection(player: Player): boolean {
    return player.hand.length > 0;
}

export function determineWinner(players: Player[], targetNumber: number, preferredSuit: Suit): Player {
    let winningPlayer = players[0];
    let bestScore = calculateScore(winningPlayer.selectedCards, targetNumber);
    let bestSuitCount = countPreferredSuit(winningPlayer.selectedCards, preferredSuit);

    for (let i = 1; i < players.length; i++) {
        const player = players[i];
        const score = calculateScore(player.selectedCards, targetNumber);
        const suitCount = countPreferredSuit(player.selectedCards, preferredSuit);

        /* istanbul ignore next */
        if (score < bestScore || (score === bestScore && suitCount > bestSuitCount)) {
            winningPlayer = player;
            bestScore = score;
            bestSuitCount = suitCount;
        }
    }

    return winningPlayer;
} 