import { createDeck, shuffle, calculateScore, countPreferredSuit, isGameReadyToStart } from '../gameUtils';
import { Card, Suit, DEFAULT_GAME_SETTINGS } from '../game';

describe('Game Utilities', () => {
    describe('createDeck', () => {
        it('should create a deck with correct number of cards', () => {
            const deck = createDeck();
            // 30 red + 30 green + 2 wild zero cards
            expect(deck).toHaveLength(62);
        });

        it('should create cards with correct values', () => {
            const deck = createDeck();

            // Check red cards (-10 to -1)
            const redCards = deck.filter(card => card.color === 'red');
            expect(redCards).toHaveLength(30); // 10 values * 3 suits
            redCards.forEach(card => {
                expect(card.value).toBeLessThan(0);
                expect(card.value).toBeGreaterThanOrEqual(-10);
            });

            // Check green cards (1 to 10)
            const greenCards = deck.filter(card => card.color === 'green' && !card.isWild);
            expect(greenCards).toHaveLength(30); // 10 values * 3 suits
            greenCards.forEach(card => {
                expect(card.value).toBeGreaterThan(0);
                expect(card.value).toBeLessThanOrEqual(10);
            });

            // Check zero cards (wild, not part of any suit)
            const zeroCards = deck.filter(card => card.isWild);
            expect(zeroCards).toHaveLength(2);
            zeroCards.forEach(card => {
                expect(card.value).toBe(0);
                expect(card.isWild).toBe(true);
                expect(card.suit).toBeUndefined();
            });
        });
    });

    describe('shuffle', () => {
        it('should maintain array length', () => {
            const array = [1, 2, 3, 4, 5];
            const shuffled = shuffle(array);
            expect(shuffled).toHaveLength(array.length);
        });

        it('should contain all original elements', () => {
            const array = [1, 2, 3, 4, 5];
            const shuffled = shuffle(array);
            expect(shuffled.sort()).toEqual(array.sort());
        });

        it('should not be in the same order as original', () => {
            const array = [1, 2, 3, 4, 5];
            const shuffled = shuffle(array);
            // Note: This test could theoretically fail if shuffle returns original order
            // but probability is very low
            expect(shuffled).not.toEqual(array);
        });
    });

    describe('calculateScore', () => {
        it('should calculate correct score', () => {
            const cards: Card[] = [
                { suit: 'Circle', value: 5, color: 'green', isWild: false },
                { suit: 'Circle', value: -3, color: 'red', isWild: false },
                { suit: undefined as any, value: 0, color: 'green', isWild: true }
            ];
            const targetNumber = 5;
            expect(calculateScore(cards, targetNumber)).toBe(3); // |(5 + -3 + 0) - 5| = 3
        });

        it('should handle empty selection', () => {
            expect(calculateScore([], 5)).toBe(5); // |0 - 5| = 5
        });
    });

    describe('countPreferredSuit', () => {
        it('should count cards of preferred suit', () => {
            const cards: Card[] = [
                { suit: 'Circle', value: 5, color: 'green', isWild: false },
                { suit: 'Triangle', value: -3, color: 'red', isWild: false },
                { suit: undefined as any, value: 0, color: 'green', isWild: true }
            ];
            expect(countPreferredSuit(cards, 'Circle')).toBe(2); // One Circle + one wild
        });

        it('should count wild cards as any suit', () => {
            const cards: Card[] = [
                { suit: undefined as any, value: 0, color: 'green', isWild: true },
                { suit: undefined as any, value: 0, color: 'green', isWild: true }
            ];
            expect(countPreferredSuit(cards, 'Square')).toBe(2); // Both wild cards count
        });
    });

    describe('isGameReadyToStart', () => {
        it('should return true when player count is within limits', () => {
            expect(isGameReadyToStart(DEFAULT_GAME_SETTINGS.minPlayers, DEFAULT_GAME_SETTINGS)).toBe(true);
            expect(isGameReadyToStart(DEFAULT_GAME_SETTINGS.maxPlayers, DEFAULT_GAME_SETTINGS)).toBe(true);
        });

        it('should return false when player count is outside limits', () => {
            expect(isGameReadyToStart(DEFAULT_GAME_SETTINGS.minPlayers - 1, DEFAULT_GAME_SETTINGS)).toBe(false);
            expect(isGameReadyToStart(DEFAULT_GAME_SETTINGS.maxPlayers + 1, DEFAULT_GAME_SETTINGS)).toBe(false);
        });
    });
}); 