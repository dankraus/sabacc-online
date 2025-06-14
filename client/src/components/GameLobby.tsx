import React, { useState } from 'react';
import { LoadingState, GameError } from '@/types';

interface GameLobbyProps {
  onJoinGame: (gameId: string, playerName: string) => void;
  loading: LoadingState;
  error: GameError | null;
  isConnected: boolean;
  onClearError: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  onJoinGame,
  loading,
  error,
  isConnected,
  onClearError
}) => {
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameId.trim() || !playerName.trim()) {
      return;
    }
    
    onJoinGame(gameId.trim(), playerName.trim());
  };

  const handleInputChange = () => {
    if (error) {
      onClearError();
    }
  };

  const canJoin = isConnected && gameId.trim() && playerName.trim() && !loading.isLoading;

  return (
    <div className="game-lobby h-full flex items-center justify-center">
      <div className="container">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-accent-gold)' }}>
              Sabacc Online
            </h1>
            <p className="text-lg text-muted mb-4">
              The legendary card game from a galaxy far, far away
            </p>
            
            {/* Connection Status */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
              isConnected 
                ? 'bg-green-900/20 text-green-400' 
                : 'bg-red-900/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-red-400 mt-0.5">⚠️</div>
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-red-300 text-sm">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Join Game Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card">
              <div className="space-y-4">
                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium mb-2">
                    Player Name
                  </label>
                  <input
                    id="playerName"
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      handleInputChange();
                    }}
                    placeholder="Enter your name"
                    className="input"
                    maxLength={20}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="gameId" className="block text-sm font-medium mb-2">
                    Game ID
                  </label>
                  <input
                    id="gameId"
                    type="text"
                    value={gameId}
                    onChange={(e) => {
                      setGameId(e.target.value);
                      handleInputChange();
                    }}
                    placeholder="Enter game ID"
                    className="input"
                    maxLength={50}
                    required
                  />
                  <p className="text-xs text-muted mt-1">
                    Create a new game by entering any unique ID
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canJoin}
              className="btn btn-primary w-full"
            >
              {loading.isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {loading.message || 'Joining...'}
                </div>
              ) : (
                'Join Game'
              )}
            </button>
          </form>

          {/* Game Rules */}
          <div className="mt-8 card">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--color-accent-gold)' }}>
              How to Play Sabacc
            </h3>
            <ul className="text-sm text-muted space-y-1">
              <li>• Get as close to 23 as possible without going over</li>
              <li>• Place your bets during the betting phase</li>
              <li>• Draw cards or stand during the playing phase</li>
              <li>• Player closest to 23 wins the pot</li>
              <li>• Face cards have negative values</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;