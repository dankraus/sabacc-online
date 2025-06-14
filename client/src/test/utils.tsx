import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { GameState, Player, Card } from '@/types';

// Mock Socket.IO client
export const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
  io: {
    on: vi.fn(),
    off: vi.fn()
  }
};

// Mock implementation of Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

// Custom render function
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-card-1',
  suit: 'sabers',
  value: 5,
  name: '5 of sabers',
  ...overrides
});

export const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-123',
  name: 'Test Player',
  credits: 1000,
  hand: [],
  bet: 0,
  isDealer: false,
  isConnected: true,
  ...overrides
});

export const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  id: 'game-123',
  players: [],
  currentPlayer: '',
  phase: 'waiting',
  pot: 0,
  deck: [],
  maxPlayers: 4,
  ...overrides
});

// Helper functions for testing
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const createMockGameStateWithPlayers = (playerCount: number = 2): GameState => {
  const players = Array.from({ length: playerCount }, (_, i) => 
    createMockPlayer({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      isDealer: i === 0
    })
  );

  return createMockGameState({
    players,
    currentPlayer: players[0]?.id || '',
    phase: playerCount >= 2 ? 'betting' : 'waiting'
  });
};

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SERVER_URL: 'http://localhost:3001'
  }
});

// Setup for testing hooks
export const mockUseSocket = {
  socket: mockSocket,
  connectionStatus: {
    isConnected: true,
    isConnecting: false,
    reconnectAttempts: 0
  },
  error: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  clearError: vi.fn(),
  isConnected: true,
  isConnecting: false
};

export const mockUseGame = {
  gameState: null,
  currentPlayer: null,
  otherPlayers: [],
  currentPlayerId: null,
  loading: { isLoading: false },
  error: null,
  hasJoinedGame: false,
  isConnected: true,
  joinGame: vi.fn(),
  leaveGame: vi.fn(),
  placeBet: vi.fn(),
  drawCard: vi.fn(),
  stand: vi.fn(),
  isCurrentPlayerTurn: false,
  calculateHandValue: vi.fn((cards) => cards.reduce((sum: number, card: any) => sum + card.value, 0)),
  canPlaceBet: false,
  canDrawCard: false,
  canStand: false,
  clearGameError: vi.fn()
};

// Mock timers helper
export const advanceTimers = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await waitForNextTick();
};