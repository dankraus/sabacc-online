import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  ConnectionStatus, 
  GameError 
} from '@/types';

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const {
    url = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0
  });
  
  const [error, setError] = useState<GameError | null>(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    const socket = io(url, {
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        reconnectAttempts: 0
      }));
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        lastDisconnect: new Date()
      }));
      
      if (reason === 'io server disconnect') {
        setError({
          message: 'Server disconnected',
          type: 'connection'
        });
      }
    });

    socket.on('connect_error', (error) => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      
      setError({
        message: `Connection failed: ${error.message}`,
        type: 'connection'
      });
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnecting: true,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    });

    socket.io.on('reconnect', () => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        reconnectAttempts: 0
      }));
      setError(null);
    });

    socket.io.on('reconnect_failed', () => {
      setError({
        message: 'Failed to reconnect to server',
        type: 'connection'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [url, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay]);

  // Manual connection control
  const connect = useCallback(() => {
    if (!socketRef.current) {
      const socket = io(url, {
        reconnection,
        reconnectionAttempts,
        reconnectionDelay
      });
      socketRef.current = socket;
    } else if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
    
    setConnectionStatus(prev => ({ ...prev, isConnecting: true }));
  }, [url, reconnection, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  // Socket event emitters
  const emit = useCallback(<T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
    } else {
      setError({
        message: 'Cannot send message: not connected to server',
        type: 'connection'
      });
    }
  }, []);

  // Socket event listeners
  const on = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    handler: ServerToClientEvents[T]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      
      return () => {
        socketRef.current?.off(event, handler);
      };
    }
  }, []);

  const off = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    handler?: ServerToClientEvents[T]
  ) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    socket: socketRef.current,
    connectionStatus,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    clearError,
    isConnected: connectionStatus.isConnected,
    isConnecting: connectionStatus.isConnecting
  };
};