import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../useSocket';
import { mockSocket } from '@/test/utils';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock socket state
    mockSocket.connected = true;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default connection status', () => {
      const { result } = renderHook(() => useSocket({ autoConnect: false }));
      
      expect(result.current.connectionStatus).toEqual({
        isConnected: false,
        isConnecting: false,
        reconnectAttempts: 0
      });
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should auto-connect by default', () => {
      const { io } = require('socket.io-client');
      
      renderHook(() => useSocket());
      
      expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.objectContaining({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      }));
    });

    it('should use custom URL and options', () => {
      const { io } = require('socket.io-client');
      const customUrl = 'http://custom-server.com';
      
      renderHook(() => useSocket({
        url: customUrl,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      }));
      
      expect(io).toHaveBeenCalledWith(customUrl, expect.objectContaining({
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      }));
    });
  });

  describe('connection events', () => {
    it('should handle successful connection', () => {
      const { result } = renderHook(() => useSocket());
      
      // Simulate connection event
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
        connectHandler();
      });
      
      expect(result.current.connectionStatus.isConnected).toBe(true);
      expect(result.current.connectionStatus.isConnecting).toBe(false);
      expect(result.current.connectionStatus.reconnectAttempts).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should handle disconnection', () => {
      const { result } = renderHook(() => useSocket());
      
      // First connect
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
        connectHandler();
      });
      
      // Then disconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
        disconnectHandler('transport close');
      });
      
      expect(result.current.connectionStatus.isConnected).toBe(false);
      expect(result.current.connectionStatus.isConnecting).toBe(false);
      expect(result.current.connectionStatus.lastDisconnect).toBeInstanceOf(Date);
    });

    it('should handle server disconnect with error', () => {
      const { result } = renderHook(() => useSocket());
      
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
        disconnectHandler('io server disconnect');
      });
      
      expect(result.current.error).toEqual({
        message: 'Server disconnected',
        type: 'connection'
      });
    });

    it('should handle connection errors', () => {
      const { result } = renderHook(() => useSocket());
      const testError = new Error('Connection failed');
      
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
        errorHandler(testError);
      });
      
      expect(result.current.error).toEqual({
        message: 'Connection failed: Connection failed',
        type: 'connection'
      });
      expect(result.current.connectionStatus.reconnectAttempts).toBe(1);
    });
  });

  describe('reconnection events', () => {
    it('should handle reconnection attempts', () => {
      const { result } = renderHook(() => useSocket());
      
      act(() => {
        const reconnectAttemptHandler = mockSocket.io.on.mock.calls.find(call => call[0] === 'reconnect_attempt')[1];
        reconnectAttemptHandler();
      });
      
      expect(result.current.connectionStatus.isConnecting).toBe(true);
      expect(result.current.connectionStatus.reconnectAttempts).toBe(1);
    });

    it('should handle successful reconnection', () => {
      const { result } = renderHook(() => useSocket());
      
      // Simulate reconnect attempt first
      act(() => {
        const reconnectAttemptHandler = mockSocket.io.on.mock.calls.find(call => call[0] === 'reconnect_attempt')[1];
        reconnectAttemptHandler();
      });
      
      // Then successful reconnection
      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(call => call[0] === 'reconnect')[1];
        reconnectHandler();
      });
      
      expect(result.current.connectionStatus.isConnected).toBe(true);
      expect(result.current.connectionStatus.isConnecting).toBe(false);
      expect(result.current.connectionStatus.reconnectAttempts).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should handle failed reconnection', () => {
      const { result } = renderHook(() => useSocket());
      
      act(() => {
        const reconnectFailedHandler = mockSocket.io.on.mock.calls.find(call => call[0] === 'reconnect_failed')[1];
        reconnectFailedHandler();
      });
      
      expect(result.current.error).toEqual({
        message: 'Failed to reconnect to server',
        type: 'connection'
      });
    });
  });

  describe('manual connection control', () => {
    it('should allow manual connection', () => {
      const { result } = renderHook(() => useSocket({ autoConnect: false }));
      
      act(() => {
        result.current.connect();
      });
      
      // Should create new socket and set connecting state
      expect(result.current.connectionStatus.isConnecting).toBe(true);
    });

    it('should allow manual disconnection', () => {
      const { result } = renderHook(() => useSocket());
      
      act(() => {
        result.current.disconnect();
      });
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should emit events when connected', () => {
      mockSocket.connected = true;
      const { result } = renderHook(() => useSocket());
      
      act(() => {
        result.current.emit('join-game', { gameId: 'test', playerName: 'Alice' });
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('join-game', { gameId: 'test', playerName: 'Alice' });
    });

    it('should set error when emitting while disconnected', () => {
      mockSocket.connected = false;
      const { result } = renderHook(() => useSocket());
      
      act(() => {
        result.current.emit('join-game', { gameId: 'test', playerName: 'Alice' });
      });
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(result.current.error).toEqual({
        message: 'Cannot send message: not connected to server',
        type: 'connection'
      });
    });

    it('should register event listeners', () => {
      const { result } = renderHook(() => useSocket());
      const mockHandler = vi.fn();
      
      act(() => {
        result.current.on('game-state-update', mockHandler);
      });
      
      expect(mockSocket.on).toHaveBeenCalledWith('game-state-update', mockHandler);
    });

    it('should unregister event listeners', () => {
      const { result } = renderHook(() => useSocket());
      const mockHandler = vi.fn();
      
      act(() => {
        result.current.off('game-state-update', mockHandler);
      });
      
      expect(mockSocket.off).toHaveBeenCalledWith('game-state-update', mockHandler);
    });

    it('should return cleanup function from on()', () => {
      const { result } = renderHook(() => useSocket());
      const mockHandler = vi.fn();
      
      let cleanup: (() => void) | undefined;
      act(() => {
        cleanup = result.current.on('game-state-update', mockHandler);
      });
      
      expect(typeof cleanup).toBe('function');
      
      act(() => {
        cleanup?.();
      });
      
      expect(mockSocket.off).toHaveBeenCalledWith('game-state-update', mockHandler);
    });
  });

  describe('error management', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useSocket());
      
      // Set an error first
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
        errorHandler(new Error('Test error'));
      });
      
      expect(result.current.error).not.toBeNull();
      
      // Clear the error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should disconnect socket on unmount', () => {
      const { unmount } = renderHook(() => useSocket());
      
      unmount();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});