import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from '../useGame';
import { createMockGameState, createMockPlayer, mockUseSocket } from '@/test/utils';

// Mock the useSocket hook
vi.mock('../useSocket', () => ({
  useSocket: vi.fn(() => mockUseSocket)
}));

describe('useGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock socket state
    mockUseSocket.isConnected = true;
    mockUseSocket.error = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useGame());
      
      expect(result.current.gameState).toBeNull();
      expect(result.current.currentPlayer).toBeNull();
      expect(result.current.otherPlayers).toEqual([]);
      expect(result.current.currentPlayerId).toBeNull();
      expect(result.current.loading).toEqual({ isLoading: false });
      expect(result.current.error).toBeNull();
      expect(result.current.hasJoinedGame).toBe(false);
      expect(result.current.isConnected).toBe(true);
    });

    it('should auto-join game when options provided', () => {
      const options = {
        autoJoin: true,
        gameId: 'test-game',
        playerName: 'Alice'
      };
      
      renderHook(() => useGame(options));
      
      expect(mockUseSocket.emit).toHaveBeenCalledWith('join-game', {
        gameId: 'test-game',
        playerName: 'Alice'
      });
    });

    it('should not auto-join when not connected', () => {
      mockUseSocket.isConnected = false;
      
      const options = {
        autoJoin: true,
        gameId: 'test-game',
        playerName: 'Alice'
      };
      
      renderHook(() => useGame(options));
      
      expect(mockUseSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('game state management', () => {
    it('should update game state on game-state-update event', () => {
      const { result } = renderHook(() => useGame());
      const mockGameState = createMockGameState({
        id: 'test-game',
        players: [createMockPlayer({ name: 'Alice' })]
      });
      
      // Simulate game state update
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
        handler?.(mockGameState);
      });
      
      expect(result.current.gameState).toEqual(mockGameState);
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should update current player ID when player name matches', () => {
      const { result } = renderHook(() => useGame({ playerName: 'Alice' }));
      const player = createMockPlayer({ id: 'player-123', name: 'Alice' });
      const mockGameState = createMockGameState({
        players: [player]
      });
      
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
        handler?.(mockGameState);
      });
      
      expect(result.current.currentPlayerId).toBe('player-123');
      expect(result.current.currentPlayer).toEqual(player);
    });

    it('should handle game over event', () => {
      const { result } = renderHook(() => useGame());
      const finalState = createMockGameState({ phase: 'finished' });
      
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-over')?.[1];
        handler?.({ winner: 'Alice', finalState });
      });
      
      expect(result.current.gameState).toEqual(finalState);
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should handle error events', () => {
      const { result } = renderHook(() => useGame());
      
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'error')?.[1];
        handler?.({ message: 'Game error occurred' });
      });
      
      expect(result.current.error).toEqual({
        message: 'Game error occurred',
        type: 'game'
      });
      expect(result.current.loading.isLoading).toBe(false);
    });
  });

  describe('game actions', () => {
    describe('joinGame', () => {
      it('should join game when connected', () => {
        const { result } = renderHook(() => useGame());
        
        act(() => {
          result.current.joinGame('test-game', 'Alice');
        });
        
        expect(result.current.loading).toEqual({
          isLoading: true,
          message: 'Joining game...'
        });
        expect(result.current.hasJoinedGame).toBe(true);
        expect(mockUseSocket.emit).toHaveBeenCalledWith('join-game', {
          gameId: 'test-game',
          playerName: 'Alice'
        });
      });

      it('should set error when not connected', () => {
        mockUseSocket.isConnected = false;
        const { result } = renderHook(() => useGame());
        
        act(() => {
          result.current.joinGame('test-game', 'Alice');
        });
        
        expect(result.current.error).toEqual({
          message: 'Cannot join game: not connected to server',
          type: 'connection'
        });
        expect(mockUseSocket.emit).not.toHaveBeenCalled();
      });
    });

    describe('leaveGame', () => {
      it('should leave game when connected', () => {
        const { result } = renderHook(() => useGame());
        
        // First join a game
        act(() => {
          result.current.joinGame('test-game', 'Alice');
        });
        
        // Then leave
        act(() => {
          result.current.leaveGame();
        });
        
        expect(mockUseSocket.emit).toHaveBeenCalledWith('leave-game');
        expect(result.current.gameState).toBeNull();
        expect(result.current.currentPlayerId).toBeNull();
        expect(result.current.hasJoinedGame).toBe(false);
        expect(result.current.loading.isLoading).toBe(false);
      });
    });

    describe('placeBet', () => {
      it('should place bet when conditions are met', () => {
        const { result } = renderHook(() => useGame());
        const player = createMockPlayer({ credits: 1000 });
        const gameState = createMockGameState({
          phase: 'betting',
          players: [player]
        });
        
        // Set up game state
        act(() => {
          const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
          handler?.(gameState);
        });
        
        // Mock current player
        result.current.currentPlayerId = player.id;
        
        act(() => {
          result.current.placeBet(100);
        });
        
        expect(mockUseSocket.emit).toHaveBeenCalledWith('place-bet', { amount: 100 });
      });

      it('should set error when not in game', () => {
        const { result } = renderHook(() => useGame());
        
        act(() => {
          result.current.placeBet(100);
        });
        
        expect(result.current.error).toEqual({
          message: 'Cannot place bet: not in a game',
          type: 'game'
        });
      });

      it('should set error when not in betting phase', () => {
        const { result } = renderHook(() => useGame());
        const gameState = createMockGameState({ phase: 'playing' });
        
        act(() => {
          const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
          handler?.(gameState);
        });
        
        act(() => {
          result.current.placeBet(100);
        });
        
        expect(result.current.error).toEqual({
          message: 'Cannot place bet: not in betting phase',
          type: 'game'
        });
      });

      it('should validate bet amount', () => {
        const { result } = renderHook(() => useGame({ playerName: 'Alice' }));
        const player = createMockPlayer({ 
          id: 'player-123', 
          name: 'Alice', 
          credits: 100 
        });
        const gameState = createMockGameState({
          phase: 'betting',
          players: [player]
        });
        
        act(() => {
          const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
          handler?.(gameState);
        });
        
        // Try to bet more than available credits
        act(() => {
          result.current.placeBet(200);
        });
        
        expect(result.current.error).toEqual({
          message: 'Invalid bet amount',
          type: 'validation'
        });
      });
    });

    describe('drawCard', () => {
      it('should draw card when conditions are met', () => {
        const { result } = renderHook(() => useGame());
        const gameState = createMockGameState({ 
          phase: 'playing',
          currentPlayer: 'player-123'
        });
        
        act(() => {
          const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
          handler?.(gameState);
        });
        
        result.current.currentPlayerId = 'player-123';
        
        act(() => {
          result.current.drawCard();
        });
        
        expect(mockUseSocket.emit).toHaveBeenCalledWith('draw-card');
      });

      it('should set error when not in playing phase', () => {
        const { result } = renderHook(() => useGame());
        const gameState = createMockGameState({ phase: 'betting' });
        
        act(() => {
          const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
          handler?.(gameState);
        });
        
        act(() => {
          result.current.drawCard();
        });
        
        expect(result.current.error).toEqual({
          message: 'Cannot draw card: not in playing phase',
          type: 'game'
        });
      });
    });

    describe('stand', () => {
      it('should stand when conditions are met', () => {
        const { result } = renderHook(() => useGame());
        const gameState = createMockGameState({ 
          phase: 'playing',
          currentPlayer: 'player-123'
        });
        
        act(() => {
          const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
          handler?.(gameState);
        });
        
        result.current.currentPlayerId = 'player-123';
        
        act(() => {
          result.current.stand();
        });
        
        expect(mockUseSocket.emit).toHaveBeenCalledWith('stand');
      });

      it('should set error when not in playing phase', () => {
        const { result } = renderHook(() => useGame());
        const gameState = createMockGameState({ phase: 'waiting' });
        
        act(() => {
          const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
          handler?.(gameState);
        });
        
        act(() => {
          result.current.stand();
        });
        
        expect(result.current.error).toEqual({
          message: 'Cannot stand: not in playing phase',
          type: 'game'
        });
      });
    });
  });

  describe('helper functions', () => {
    it('should calculate hand value correctly', () => {
      const { result } = renderHook(() => useGame());
      const cards = [
        { value: 5 },
        { value: 10 },
        { value: -2 }
      ];
      
      const handValue = result.current.calculateHandValue(cards);
      expect(handValue).toBe(13);
    });

    it('should determine current player turn correctly', () => {
      const { result } = renderHook(() => useGame());
      const gameState = createMockGameState({
        currentPlayer: 'player-123'
      });
      
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
        handler?.(gameState);
      });
      
      result.current.currentPlayerId = 'player-123';
      
      expect(result.current.isCurrentPlayerTurn).toBe(true);
    });

    it('should determine other players correctly', () => {
      const { result } = renderHook(() => useGame({ playerName: 'Alice' }));
      const alice = createMockPlayer({ id: 'player-1', name: 'Alice' });
      const bob = createMockPlayer({ id: 'player-2', name: 'Bob' });
      const gameState = createMockGameState({
        players: [alice, bob]
      });
      
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
        handler?.(gameState);
      });
      
      expect(result.current.otherPlayers).toEqual([bob]);
    });

    it('should determine action permissions correctly', () => {
      const { result } = renderHook(() => useGame({ playerName: 'Alice' }));
      const player = createMockPlayer({ 
        id: 'player-1', 
        name: 'Alice',
        credits: 100
      });
      const gameState = createMockGameState({
        phase: 'betting',
        currentPlayer: 'player-1',
        players: [player]
      });
      
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'game-state-update')?.[1];
        handler?.(gameState);
      });
      
      expect(result.current.canPlaceBet).toBe(true);
      expect(result.current.canDrawCard).toBe(false);
      expect(result.current.canStand).toBe(false);
    });
  });

  describe('error management', () => {
    it('should clear game error', () => {
      const { result } = renderHook(() => useGame());
      
      // Set an error first
      act(() => {
        const handler = mockUseSocket.on.mock.calls.find(call => call[0] === 'error')?.[1];
        handler?.({ message: 'Test error' });
      });
      
      expect(result.current.error).not.toBeNull();
      
      // Clear the error
      act(() => {
        result.current.clearGameError();
      });
      
      expect(result.current.error).toBeNull();
    });

    it('should combine game and connection errors', () => {
      mockUseSocket.error = {
        message: 'Connection error',
        type: 'connection'
      };
      
      const { result } = renderHook(() => useGame());
      
      expect(result.current.error).toEqual({
        message: 'Connection error',
        type: 'connection'
      });
    });
  });
});