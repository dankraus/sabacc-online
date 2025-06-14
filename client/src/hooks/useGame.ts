import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, GameError, LoadingState } from '@/types';
import { useSocket } from './useSocket';

interface UseGameOptions {
  autoJoin?: boolean;
  gameId?: string;
  playerName?: string;
}

export const useGame = (options: UseGameOptions = {}) => {
  const { autoJoin = false, gameId, playerName } = options;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false });
  const [gameError, setGameError] = useState<GameError | null>(null);
  const [hasJoinedGame, setHasJoinedGame] = useState(false);

  const { emit, on, off, isConnected, error: connectionError } = useSocket();

  // Set up socket event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Game state updates
    const unsubGameState = on('game-state-update', (newGameState: GameState) => {
      setGameState(newGameState);
      setLoading({ isLoading: false });

      // Update current player ID if we're in the game
      if (playerName && newGameState.players) {
        const currentPlayer = newGameState.players.find(p => p.name === playerName);
        if (currentPlayer) {
          setCurrentPlayerId(currentPlayer.id);
        }
      }
    });

    // Game over
    const unsubGameOver = on('game-over', ({ winner, finalState }) => {
      setGameState(finalState);
      setLoading({ isLoading: false });
      // Could add game over notification here
    });

    // Error handling
    const unsubError = on('error', ({ message }) => {
      setGameError({
        message,
        type: 'game'
      });
      setLoading({ isLoading: false });
    });

    // Player events
    const unsubPlayerJoined = on('player-joined', ({ playerId, playerName: joinedPlayerName }) => {
      // Could add player joined notification
    });

    const unsubPlayerLeft = on('player-left', ({ playerId }) => {
      // Could add player left notification
    });

    if (unsubGameState) unsubscribers.push(unsubGameState);
    if (unsubGameOver) unsubscribers.push(unsubGameOver);
    if (unsubError) unsubscribers.push(unsubError);
    if (unsubPlayerJoined) unsubscribers.push(unsubPlayerJoined);
    if (unsubPlayerLeft) unsubscribers.push(unsubPlayerLeft);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [on, off, playerName]);

  // Auto-join game if options provided
  useEffect(() => {
    if (autoJoin && gameId && playerName && isConnected && !hasJoinedGame) {
      joinGame(gameId, playerName);
    }
  }, [autoJoin, gameId, playerName, isConnected, hasJoinedGame]);

  // Game actions
  const joinGame = useCallback((gameId: string, playerName: string) => {
    if (!isConnected) {
      setGameError({
        message: 'Cannot join game: not connected to server',
        type: 'connection'
      });
      return;
    }

    setLoading({ isLoading: true, message: 'Joining game...' });
    setGameError(null);

    emit('player-join', { gameId, playerName });
    setHasJoinedGame(true);
  }, [isConnected, emit]);

  const leaveGame = useCallback(() => {
    if (!isConnected) return;

    setLoading({ isLoading: true, message: 'Leaving game...' });
    emit('leave-game');

    // Reset local state
    setGameState(null);
    setCurrentPlayerId(null);
    setHasJoinedGame(false);
    setLoading({ isLoading: false });
  }, [isConnected, emit]);

  const placeBet = useCallback((amount: number) => {
    if (!isConnected || !gameState) {
      setGameError({
        message: 'Cannot place bet: not in a game',
        type: 'game'
      });
      return;
    }

    if (gameState.phase !== 'betting') {
      setGameError({
        message: 'Cannot place bet: not in betting phase',
        type: 'game'
      });
      return;
    }

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) {
      setGameError({
        message: 'Cannot place bet: player not found',
        type: 'game'
      });
      return;
    }

    if (amount > currentPlayer.credits || amount <= 0) {
      setGameError({
        message: 'Invalid bet amount',
        type: 'validation'
      });
      return;
    }

    setGameError(null);
    emit('place-bet', { amount });
  }, [isConnected, gameState, emit]);

  const drawCard = useCallback(() => {
    if (!isConnected || !gameState) {
      setGameError({
        message: 'Cannot draw card: not in a game',
        type: 'game'
      });
      return;
    }

    if (gameState.phase !== 'playing') {
      setGameError({
        message: 'Cannot draw card: not in playing phase',
        type: 'game'
      });
      return;
    }

    setGameError(null);
    emit('draw-card');
  }, [isConnected, gameState, emit]);

  const stand = useCallback(() => {
    if (!isConnected || !gameState) {
      setGameError({
        message: 'Cannot stand: not in a game',
        type: 'game'
      });
      return;
    }

    if (gameState.phase !== 'playing') {
      setGameError({
        message: 'Cannot stand: not in playing phase',
        type: 'game'
      });
      return;
    }

    setGameError(null);
    emit('stand');
  }, [isConnected, gameState, emit]);

  // Helper functions
  const getCurrentPlayer = useCallback((): Player | null => {
    if (!gameState || !currentPlayerId) return null;
    return gameState.players.find(p => p.id === currentPlayerId) || null;
  }, [gameState, currentPlayerId]);

  const getOtherPlayers = useCallback((): Player[] => {
    if (!gameState || !currentPlayerId) return [];
    return gameState.players.filter(p => p.id !== currentPlayerId);
  }, [gameState, currentPlayerId]);

  const isCurrentPlayerTurn = useCallback((): boolean => {
    if (!gameState || !currentPlayerId) return false;
    return gameState.currentPlayer === currentPlayerId;
  }, [gameState, currentPlayerId]);

  const calculateHandValue = useCallback((cards: Array<{ value: number }>): number => {
    return cards.reduce((sum, card) => sum + card.value, 0);
  }, []);

  const canPlaceBet = useCallback((): boolean => {
    if (!gameState || gameState.phase !== 'betting') return false;
    const currentPlayer = getCurrentPlayer();
    return !!(currentPlayer && currentPlayer.credits > 0);
  }, [gameState, getCurrentPlayer]);

  const canDrawCard = useCallback((): boolean => {
    return !!(gameState && gameState.phase === 'playing' && isCurrentPlayerTurn());
  }, [gameState, isCurrentPlayerTurn]);

  const canStand = useCallback((): boolean => {
    return !!(gameState && gameState.phase === 'playing' && isCurrentPlayerTurn());
  }, [gameState, isCurrentPlayerTurn]);

  // Clear errors
  const clearGameError = useCallback(() => {
    setGameError(null);
  }, []);

  // Combine errors
  const error = gameError || connectionError;

  return {
    // State
    gameState,
    currentPlayer: getCurrentPlayer(),
    otherPlayers: getOtherPlayers(),
    currentPlayerId,
    loading,
    error,
    hasJoinedGame,
    isConnected,

    // Actions
    joinGame,
    leaveGame,
    placeBet,
    drawCard,
    stand,

    // Helpers
    isCurrentPlayerTurn: isCurrentPlayerTurn(),
    calculateHandValue,
    canPlaceBet: canPlaceBet(),
    canDrawCard: canDrawCard(),
    canStand: canStand(),
    clearGameError
  };
};