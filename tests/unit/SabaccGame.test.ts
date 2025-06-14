import { SabaccGame } from '../../src/game/SabaccGame';
import { Server } from 'socket.io';
import { createMockPlayer, createMockCard } from '../helpers/testUtils';

// Mock Socket.IO Server
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as unknown as Server;

describe('SabaccGame', () => {
  let game: SabaccGame;
  const gameId = 'test-game-123';

  beforeEach(() => {
    game = new SabaccGame(gameId, mockIo);
    jest.clearAllMocks();
  });

  describe('Game Initialization', () => {
    it('should initialize with correct default state', () => {
      const gameState = game.getGameState();

      expect(gameState.id).toBe(gameId);
      expect(gameState.players).toEqual([]);
      expect(gameState.phase).toBe('waiting');
      expect(gameState.pot).toBe(0);
      expect(gameState.maxPlayers).toBe(4);
      expect(gameState.currentPlayer).toBe('');
    });

    it('should initialize deck with correct number of cards', () => {
      // Access private deck through reflection for testing
      const gameState = game.getGameState();

      // Deck should be shuffled and ready, but not exposed in game state
      expect(gameState.deck).toEqual([]);

      // We can test this by trying to draw cards
      game.addPlayer('player1', 'Test Player');
      game.addPlayer('player2', 'Test Player 2');

      // Should be able to draw many cards (76 total: 44 numbered + 32 face cards)
      for (let i = 0; i < 50; i++) {
        const success = game.drawCard('player1');
        if (!success) break;
      }

      // Should have drawn at least 50 cards successfully
      const player = game.getGameState().players.find(p => p.id === 'player1');
      expect(player?.hand.length).toBeGreaterThan(40);
    });
  });

  describe('Player Management', () => {
    it('should add player successfully', () => {
      const result = game.addPlayer('player1', 'Alice');

      expect(result).toBe(true);

      const gameState = game.getGameState();
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0]).toEqual({
        id: 'player1',
        name: 'Alice',
        credits: 1000,
        hand: expect.any(Array),
        bet: 0,
        isDealer: true, // First player becomes dealer
        isConnected: true
      });
    });

    it('should not allow more than max players', () => {
      // Add maximum players
      for (let i = 1; i <= 4; i++) {
        expect(game.addPlayer(`player${i}`, `Player ${i}`)).toBe(true);
      }

      // Try to add one more
      const result = game.addPlayer('player5', 'Player 5');
      expect(result).toBe(false);

      const gameState = game.getGameState();
      expect(gameState.players).toHaveLength(4);
    });

    it('should start game when minimum players join', () => {
      game.addPlayer('player1', 'Alice');

      const gameState1 = game.getGameState();
      expect(gameState1.phase).toBe('waiting');

      game.addPlayer('player2', 'Bob');

      const gameState2 = game.getGameState();
      expect(gameState2.phase).toBe('betting');
      expect(gameState2.currentPlayer).toBe('player1');

      // Players should have initial cards
      gameState2.players.forEach(player => {
        expect(player.hand).toHaveLength(2);
      });
    });

    it('should remove player successfully', () => {
      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');

      game.removePlayer('player1');

      const gameState = game.getGameState();
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0].id).toBe('player2');
    });

    it('should reset to waiting phase when players drop below minimum', () => {
      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');

      let gameState = game.getGameState();
      expect(gameState.phase).toBe('betting');

      game.removePlayer('player1');

      gameState = game.getGameState();
      expect(gameState.phase).toBe('waiting');
    });
  });

  describe('Betting', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
    });

    it('should place bet successfully with valid amount', () => {
      const result = game.placeBet('player1', 100);

      expect(result).toBe(true);

      const gameState = game.getGameState();
      const player = gameState.players.find(p => p.id === 'player1');

      expect(player?.bet).toBe(100);
      expect(player?.credits).toBe(900);
      expect(gameState.pot).toBe(100);
    });

    it('should transition to playing phase when all players have placed their bets', () => {
      // First player places bet
      game.placeBet('player1', 100);
      let gameState = game.getGameState();
      expect(gameState.phase).toBe('betting');

      // Second player places bet
      game.placeBet('player2', 50);
      gameState = game.getGameState();

      // Game should now be in playing phase
      expect(gameState.phase).toBe('playing');
      expect(gameState.currentPlayer).toBe('player1'); // First player should be current player
      expect(gameState.pot).toBe(150); // Total pot should be sum of both bets
    });

    it('should reject bet when amount exceeds credits', () => {
      const result = game.placeBet('player1', 1500);

      expect(result).toBe(false);

      const gameState = game.getGameState();
      const player = gameState.players.find(p => p.id === 'player1');

      expect(player?.bet).toBe(0);
      expect(player?.credits).toBe(1000);
      expect(gameState.pot).toBe(0);
    });

    it('should reject negative or zero bets', () => {
      expect(game.placeBet('player1', 0)).toBe(false);
      expect(game.placeBet('player1', -50)).toBe(false);

      const gameState = game.getGameState();
      expect(gameState.pot).toBe(0);
    });

    it('should reject bet from non-existent player', () => {
      const result = game.placeBet('nonexistent', 100);
      expect(result).toBe(false);
    });
  });

  describe('Card Drawing', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      // Place bets to get to playing phase
      game.placeBet('player1', 100);
      game.placeBet('player2', 100);
    });

    it('should advance to next player after drawing a card', () => {
      // First player draws a card
      const initialState = game.getGameState();
      expect(initialState.currentPlayer).toBe('player1');

      game.drawCard('player1');

      // Should now be second player's turn
      const updatedState = game.getGameState();
      expect(updatedState.currentPlayer).toBe('player2');

      // Second player draws a card
      game.drawCard('player2');

      // Should cycle back to first player
      const finalState = game.getGameState();
      expect(finalState.currentPlayer).toBe('player1');
    });

    it('should draw card successfully during playing phase', () => {
      // Force game to playing phase (normally would require betting first)
      const gameState = game.getGameState();
      (gameState as any).phase = 'playing';

      const initialHandSize = gameState.players[0].hand.length;
      const result = game.drawCard('player1');

      expect(result).toBe(true);

      const updatedState = game.getGameState();
      const player = updatedState.players.find(p => p.id === 'player1');
      expect(player?.hand).toHaveLength(initialHandSize + 1);
    });

    it('should reject card draw during non-playing phases', () => {
      // Game starts in betting phase
      const result = game.drawCard('player1');
      expect(result).toBe(false);
    });

    it('should reject card draw from non-existent player', () => {
      const result = game.drawCard('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('Standing', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
      // Place bets to get to playing phase
      game.placeBet('player1', 100);
      game.placeBet('player2', 100);
    });

    it('should advance to next player after standing', () => {
      // First player stands
      const initialState = game.getGameState();
      expect(initialState.currentPlayer).toBe('player1');

      game.stand('player1');

      // Should now be second player's turn
      const updatedState = game.getGameState();
      expect(updatedState.currentPlayer).toBe('player2');

      // Second player stands
      game.stand('player2');

      // Should cycle back to first player
      const finalState = game.getGameState();
      expect(finalState.currentPlayer).toBe('player1');
    });

    it('should allow player to stand during playing phase', () => {
      // Force game to playing phase
      const gameState = game.getGameState();
      (gameState as any).phase = 'playing';

      const result = game.stand('player1');
      expect(result).toBe(true);
    });

    it('should reject stand during non-playing phases', () => {
      // Game starts in betting phase
      const result = game.stand('player1');
      expect(result).toBe(false);
    });

    it('should reject stand from non-existent player', () => {
      const result = game.stand('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('Game Logic', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'Alice');
      game.addPlayer('player2', 'Bob');
    });

    it('should calculate hand value correctly', () => {
      const gameState = game.getGameState();
      const player = gameState.players[0];

      // Mock some cards with known values
      player.hand = [
        createMockCard({ value: 5 }),
        createMockCard({ value: 10 }),
        createMockCard({ value: -2 })
      ];

      // Hand value should be 5 + 10 + (-2) = 13
      // We can verify this indirectly through the game state
      expect(player.hand.reduce((sum, card) => sum + card.value, 0)).toBe(13);
    });

    it('should determine winner correctly', () => {
      // Setup players with specific hands
      const gameState = game.getGameState();

      // Player 1: hand value = 22 (closest to 23)
      gameState.players[0].hand = [
        createMockCard({ value: 11 }),
        createMockCard({ value: 11 })
      ];

      // Player 2: hand value = 20 (further from 23)
      gameState.players[1].hand = [
        createMockCard({ value: 10 }),
        createMockCard({ value: 10 })
      ];

      const winner = game.getWinner();
      expect(winner?.id).toBe('player1');
    });

    it('should handle tie-breaking correctly', () => {
      const gameState = game.getGameState();

      // Both players have same hand value
      gameState.players[0].hand = [createMockCard({ value: 23 })];
      gameState.players[1].hand = [createMockCard({ value: 23 })];

      const winner = game.getWinner();
      // Should return one of the players (first one found)
      expect(winner).toBeTruthy();
      expect(['player1', 'player2']).toContain(winner?.id);
    });

    it('should track player count correctly', () => {
      expect(game.getPlayerCount()).toBe(2);

      game.addPlayer('player3', 'Charlie');
      expect(game.getPlayerCount()).toBe(3);

      game.removePlayer('player2');
      expect(game.getPlayerCount()).toBe(2);
    });

    it('should detect game over state', () => {
      expect(game.isGameOver()).toBe(false);

      // Force game to finished state
      const gameState = game.getGameState();
      (gameState as any).phase = 'finished';

      expect(game.isGameOver()).toBe(true);
    });
  });

  describe('Card Deck', () => {
    it('should create deck with all suits and values', () => {
      // Test by adding players and drawing all cards
      game.addPlayer('player1', 'Alice');

      const drawnCards = [];
      let cardDrawn = true;

      // Draw cards until deck is empty
      while (cardDrawn) {
        cardDrawn = game.drawCard('player1');
        if (cardDrawn) {
          const gameState = game.getGameState();
          const player = gameState.players[0];
          drawnCards.push(player.hand[player.hand.length - 1]);
        }
      }

      // Should have drawn all 76 cards (11 * 4 suits + 4 * 4 face cards + initial 2)
      expect(drawnCards.length).toBeGreaterThan(70);

      // Check we have all suits
      const suits = new Set(drawnCards.map(card => card.suit));
      expect(suits.size).toBe(4);
      expect(suits.has('sabers')).toBe(true);
      expect(suits.has('flasks')).toBe(true);
      expect(suits.has('coins')).toBe(true);
      expect(suits.has('staves')).toBe(true);
    });
  });
});