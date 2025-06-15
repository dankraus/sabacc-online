import { createDeck, shuffle, calculateScore, countPreferredSuit, isGameReadyToStart, rollDice, handleSabaccShift, canImproveSelection, determineWinner, compareCards } from '../gameUtils';
import { Card, Suit, CardColor, DEFAULT_GAME_SETTINGS, Player } from '../game';

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
        it('should shuffle an array', () => {
            const array = [1, 2, 3, 4, 5];
            const shuffled = shuffle(array);
            expect(shuffled).toHaveLength(array.length);
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

        it('should calculate score correctly for a selection of cards', () => {
            const cards: Card[] = [
                { suit: 'Circle', value: 5, color: 'green', isWild: false },
                { suit: 'Triangle', value: -3, color: 'red', isWild: false }
            ];
            expect(calculateScore(cards, 0)).toBe(2);
        });

        it('should handle wild cards correctly', () => {
            const cards: Card[] = [
                { suit: undefined, value: 0, color: 'green', isWild: true },
                { suit: 'Circle', value: 1, color: 'green', isWild: false }
            ];
            expect(calculateScore(cards, 0)).toBe(1);
        });

        it('should handle wild cards in score calculation', () => {
            const cards: Card[] = [
                { value: 0, isWild: true },
                { suit: 'Triangle', value: -3, color: 'red', isWild: false }
            ];
            expect(calculateScore(cards, 0)).toBe(3);
        });
    });

    describe('countPreferredSuit', () => {
        it('should count cards of a preferred suit', () => {
            const cards: Card[] = [
                { suit: 'Circle', value: 5, color: 'green', isWild: false },
                { suit: 'Circle', value: -3, color: 'red', isWild: false }
            ];
            expect(countPreferredSuit(cards, 'Circle')).toBe(2);
        });

        it('should count wild cards as part of the preferred suit', () => {
            const cards: Card[] = [
                { value: 0, isWild: true },
                { value: 0, isWild: true }
            ];
            expect(countPreferredSuit(cards, 'Circle')).toBe(2);
            expect(countPreferredSuit(cards, 'Square')).toBe(2);
            expect(countPreferredSuit(cards, 'Triangle')).toBe(2);
        });

        it('should count cards of preferred suit correctly', () => {
            const cards: Card[] = [
                { suit: 'Circle', value: 1, color: 'green', isWild: false },
                { suit: 'Triangle', value: 2, color: 'green', isWild: false },
                { suit: 'Square', value: 3, color: 'green', isWild: false }
            ];
            expect(countPreferredSuit(cards, 'Circle')).toBe(1);
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

    describe('rollDice', () => {
        it('should return a valid dice roll', () => {
            const diceRoll = rollDice();
            expect(diceRoll).toHaveProperty('goldValue');
            expect(diceRoll).toHaveProperty('silverSuit');
            expect([0, 5, -5, 10, -10]).toContain(diceRoll.goldValue);
            expect(['Circle', 'Triangle', 'Square']).toContain(diceRoll.silverSuit);
        });
    });

    describe('handleSabaccShift', () => {
        it('should add new cards to player hand when numCardsToDraw > 0', () => {
            const player: Player = {
                id: '1',
                name: 'Player',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true
            };
            const deck: Card[] = [
                { suit: 'Circle', value: 1, color: 'green', isWild: false },
                { suit: 'Triangle', value: 2, color: 'green', isWild: false }
            ];
            handleSabaccShift(player, 2, deck);
            expect(player.hand.length).toBe(2);
            expect(deck.length).toBe(0);
        });
        it('should not change hand if numCardsToDraw is 0', () => {
            const player: Player = {
                id: '1',
                name: 'Player',
                chips: 100,
                hand: [{ suit: 'Circle', value: 1, color: 'green', isWild: false }],
                selectedCards: [],
                isActive: true
            };
            const deck: Card[] = [
                { suit: 'Triangle', value: 2, color: 'green', isWild: false }
            ];
            handleSabaccShift(player, 0, deck);
            expect(player.hand).toHaveLength(1);
            expect(deck).toHaveLength(1);
        });
    });

    describe('canImproveSelection', () => {
        it('should return true if player has cards in hand', () => {
            const player: Player = {
                id: '1',
                name: 'Player',
                chips: 100,
                hand: [{ suit: 'Circle', value: 1, color: 'green', isWild: false }],
                selectedCards: [],
                isActive: true
            };
            expect(canImproveSelection(player)).toBe(true);
        });
        it('should return false if player has no cards in hand', () => {
            const player: Player = {
                id: '1',
                name: 'Player',
                chips: 100,
                hand: [],
                selectedCards: [],
                isActive: true
            };
            expect(canImproveSelection(player)).toBe(false);
        });
    });

    describe('determineWinner', () => {
        it('should return the player with the best score and suit count', () => {
            const players: Player[] = [
                {
                    id: '1',
                    name: 'Player 1',
                    chips: 100,
                    hand: [],
                    selectedCards: [{ suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false }],
                    isActive: true
                },
                {
                    id: '2',
                    name: 'Player 2',
                    chips: 100,
                    hand: [],
                    selectedCards: [{ suit: 'Triangle' as Suit, value: 4, color: 'green' as CardColor, isWild: false }],
                    isActive: true
                }
            ];

            // wins on score, not suit count
            const result = determineWinner(players, 0, 'Circle', []);
            expect(result.winner).toBe(players[1]);
            expect(result.tiebreakerUsed).toBe(false);
        });

        it('should use highest card draw for tiebreaker', () => {
            const players: Player[] = [
                {
                    id: '1',
                    name: 'Player 1',
                    chips: 100,
                    hand: [],
                    selectedCards: [{ suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false }],
                    isActive: true
                },
                {
                    id: '2',
                    name: 'Player 2',
                    chips: 100,
                    hand: [],
                    selectedCards: [{ suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false }],
                    isActive: true
                }
            ];

            const deck: Card[] = [
                { suit: 'Circle' as Suit, value: 8, color: 'green' as CardColor, isWild: false },
                { suit: 'Circle' as Suit, value: 6, color: 'green' as CardColor, isWild: false }
            ];

            const result = determineWinner(players, 0, 'Circle', deck);
            expect(result.tiebreakerUsed).toBe(true);
            expect(result.winner).toBe(players[0]); // Player 1 gets the 8
        });

        it('should use chance cube for final tiebreaker', () => {
            const players: Player[] = [
                {
                    id: '1',
                    name: 'Player 1',
                    chips: 100,
                    hand: [],
                    selectedCards: [{ suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false }],
                    isActive: true
                },
                {
                    id: '2',
                    name: 'Player 2',
                    chips: 100,
                    hand: [],
                    selectedCards: [{ suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false }],
                    isActive: true
                }
            ];

            const deck: Card[] = [
                { suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false },
                { suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false }
            ];

            // Mock chance cube roll
            const originalRandom = Math.random;
            Math.random = () => 0.8; // This will make Player 2 win with a roll of 5

            const result = determineWinner(players, 0, 'Circle', deck);
            expect(result.tiebreakerUsed).toBe(true);
            expect(result.winner).toBe(players[1]); // Player 2 wins on chance cube

            // Restore Math.random
            Math.random = originalRandom;
        });

        it('should handle wild cards in suit count', () => {
            const players: Player[] = [
                {
                    id: '1',
                    name: 'Player 1',
                    chips: 100,
                    hand: [],
                    selectedCards: [
                        { suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false },
                        { suit: undefined, value: 0, color: undefined, isWild: true }
                    ],
                    isActive: true
                },
                {
                    id: '2',
                    name: 'Player 2',
                    chips: 100,
                    hand: [],
                    selectedCards: [
                        { suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false },
                        { suit: 'Circle' as Suit, value: -3, color: 'red' as CardColor, isWild: false }
                    ],
                    isActive: true
                }
            ];

            const result = determineWinner(players, 0, 'Circle', []);
            expect(result.winner).toBe(players[0]); // Player 1 wins with wild card counting as Circle
            expect(result.tiebreakerUsed).toBe(false);
        });
    });

    describe('Card Comparison', () => {
        it('should compare cards by absolute value', () => {
            const card1: Card = { suit: 'Circle' as Suit, value: -8, color: 'red' as CardColor, isWild: false };
            const card2: Card = { suit: 'Circle' as Suit, value: 6, color: 'green' as CardColor, isWild: false };
            expect(compareCards(card1, card2)).toBeGreaterThan(0); // -8 wins over 6
        });

        it('should prefer positive values when absolute values are equal', () => {
            const card1: Card = { suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false };
            const card2: Card = { suit: 'Circle' as Suit, value: -5, color: 'red' as CardColor, isWild: false };
            expect(compareCards(card1, card2)).toBeGreaterThan(0); // 5 wins over -5
        });

        it('should compare suits when values are equal', () => {
            const card1: Card = { suit: 'Square' as Suit, value: 5, color: 'green' as CardColor, isWild: false };
            const card2: Card = { suit: 'Circle' as Suit, value: 5, color: 'green' as CardColor, isWild: false };
            expect(compareCards(card1, card2)).toBeGreaterThan(0); // Square wins over Circle
        });
    });
}); 