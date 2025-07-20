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
    // Draw new cards equal to number discarded during Sabacc Shift
    // This function is called AFTER unselected cards have been discarded
    const newCards = deck.splice(0, numCardsToDraw);
    player.hand = [...player.hand, ...newCards];
}

export function canImproveSelection(player: Player): boolean {
    return player.hand.length > 0;
}

// Chance cube values (1-6)
export function rollChanceCube(): number {
    return Math.floor(Math.random() * 6) + 1;
}

// Draw highest card for tiebreaker
export function drawTiebreakerCard(player: Player, deck: Card[]): Card {
    const drawnCard = deck.splice(0, 1)[0];
    player.hand.push(drawnCard);
    return drawnCard;
}

// Compare cards for tiebreaker
export function compareCards(card1: Card, card2: Card): number {
    // Absolute value comparison
    const absValue1 = Math.abs(card1.value);
    const absValue2 = Math.abs(card2.value);

    if (absValue1 !== absValue2) {
        return absValue1 - absValue2; // Higher absolute value wins
    }

    // If absolute values are equal, positive values win over negative
    if (card1.value !== card2.value) {
        return card1.value - card2.value;
    }

    // If values are equal, compare suits (arbitrary order)
    const suitOrder = { 'Circle': 0, 'Triangle': 1, 'Square': 2 };
    return (suitOrder[card1.suit!] || 0) - (suitOrder[card2.suit!] || 0);
}

export function determineWinner(players: Player[], targetNumber: number, preferredSuit: Suit, deck: Card[]): { winner: Player, tiebreakerUsed: boolean } {
    if (!players || players.length === 0) {
        throw new Error('No winner could be determined');
    }
    let winningPlayers = [players[0]];
    let bestScore = calculateScore(players[0].selectedCards, targetNumber);
    let bestSuitCount = countPreferredSuit(players[0].selectedCards, preferredSuit);

    // First pass: find players with best score
    for (let i = 1; i < players.length; i++) {
        const player = players[i];
        const score = calculateScore(player.selectedCards, targetNumber);
        const suitCount = countPreferredSuit(player.selectedCards, preferredSuit);

        if (score < bestScore) {
            winningPlayers = [player];
            bestScore = score;
            bestSuitCount = suitCount;
        } else if (score === bestScore) {
            if (suitCount > bestSuitCount) {
                winningPlayers = [player];
                bestSuitCount = suitCount;
            } else if (suitCount === bestSuitCount) {
                winningPlayers.push(player);
            }
        }
    }

    // If only one winner, return immediately
    if (winningPlayers.length === 1) {
        return { winner: winningPlayers[0], tiebreakerUsed: false };
    }

    // First tiebreaker: Highest card draw
    const drawnCards = new Map<Player, Card>();
    winningPlayers.forEach(player => {
        drawnCards.set(player, drawTiebreakerCard(player, deck));
    });

    // Find highest card
    let highestCardPlayer = winningPlayers[0];
    let highestCard = drawnCards.get(highestCardPlayer)!;

    for (let i = 1; i < winningPlayers.length; i++) {
        const player = winningPlayers[i];
        const card = drawnCards.get(player)!;
        if (compareCards(card, highestCard) > 0) {
            highestCard = card;
            highestCardPlayer = player;
        }
    }

    const tiedPlayers = winningPlayers.filter(player =>
        compareCards(drawnCards.get(player)!, highestCard) === 0
    );

    if (tiedPlayers.length === 1) {
        return { winner: highestCardPlayer, tiebreakerUsed: true };
    }

    // If still tied, use chance cube
    let highestRoll = 0;
    let chanceCubeWinner = tiedPlayers[0];

    for (const player of tiedPlayers) {
        const roll = rollChanceCube();
        if (roll > highestRoll) {
            highestRoll = roll;
            chanceCubeWinner = player;
        }
    }

    return { winner: chanceCubeWinner, tiebreakerUsed: true };
} 