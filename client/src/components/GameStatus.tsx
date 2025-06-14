import React from 'react';
import { GameState, GamePhase } from '@/types';

interface GameStatusProps {
  gameState: GameState;
  isCurrentPlayerTurn: boolean;
}

const getPhaseDisplay = (phase: GamePhase) => {
  const phaseMap = {
    waiting: { text: 'Waiting for Players', color: 'text-yellow-400', icon: '⏳' },
    betting: { text: 'Betting Phase', color: 'text-blue-400', icon: '💰' },
    playing: { text: 'Playing Phase', color: 'text-green-400', icon: '🎴' },
    finished: { text: 'Game Finished', color: 'text-purple-400', icon: '🏆' }
  };
  return phaseMap[phase];
};

export const GameStatus: React.FC<GameStatusProps> = ({
  gameState,
  isCurrentPlayerTurn
}) => {
  const phaseInfo = getPhaseDisplay(gameState.phase);
  const currentPlayerName = gameState.players.find(p => p.id === gameState.currentPlayer)?.name;

  return (
    <div className="card">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--color-accent-gold)' }}>
        Game Status
      </h3>
      
      <div className="space-y-4">
        {/* Current Phase */}
        <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
          <div className="text-2xl">{phaseInfo.icon}</div>
          <div>
            <div className={`font-medium ${phaseInfo.color}`}>
              {phaseInfo.text}
            </div>
            {gameState.phase !== 'waiting' && gameState.phase !== 'finished' && (
              <div className="text-sm text-muted">
                {isCurrentPlayerTurn ? (
                  <span className="text-green-400">Your turn</span>
                ) : currentPlayerName ? (
                  <span>{currentPlayerName}'s turn</span>
                ) : (
                  'Waiting...'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-black/10 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>
              {gameState.pot}
            </div>
            <div className="text-sm text-muted">Pot</div>
          </div>
          
          <div className="text-center p-3 bg-black/10 rounded-lg">
            <div className="text-2xl font-bold">
              {gameState.players.length}/{gameState.maxPlayers}
            </div>
            <div className="text-sm text-muted">Players</div>
          </div>
        </div>

        {/* Game Progress */}
        {gameState.phase !== 'waiting' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted">
              <span>Game Progress</span>
              <span>
                {gameState.phase === 'betting' ? 'Betting' :
                 gameState.phase === 'playing' ? 'Playing' :
                 gameState.phase === 'finished' ? 'Finished' : 'Unknown'}
              </span>
            </div>
            
            <div className="w-full bg-black/20 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  gameState.phase === 'betting' ? 'bg-blue-400 w-1/3' :
                  gameState.phase === 'playing' ? 'bg-green-400 w-2/3' :
                  gameState.phase === 'finished' ? 'bg-purple-400 w-full' :
                  'bg-gray-400 w-0'
                }`}
              />
            </div>
          </div>
        )}

        {/* Winner Display */}
        {gameState.phase === 'finished' && gameState.winner && (
          <div className="p-4 bg-purple-900/20 border border-purple-400/30 rounded-lg text-center">
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-bold text-lg text-purple-400">
              Game Winner
            </div>
            <div className="text-sm text-muted">
              {gameState.players.find(p => p.id === gameState.winner)?.name || 'Unknown Player'}
            </div>
          </div>
        )}

        {/* Waiting Message */}
        {gameState.phase === 'waiting' && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-sm text-muted">
              {gameState.players.length < 2 
                ? 'Waiting for more players to join...'
                : 'Game will start soon!'
              }
            </div>
            <div className="text-xs text-muted mt-1">
              Minimum 2 players required
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameStatus;