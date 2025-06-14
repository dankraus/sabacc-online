import React from 'react';
import { Player } from '@/types';

interface PlayerListProps {
  players: Player[];
  calculateHandValue: (cards: Array<{ value: number }>) => number;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  calculateHandValue
}) => {
  if (players.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--color-accent-gold)' }}>
          Other Players
        </h3>
        <div className="text-center py-6 text-muted">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-sm">Waiting for other players to join...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--color-accent-gold)' }}>
        Other Players ({players.length})
      </h3>
      
      <div className="space-y-3">
        {players.map((player) => {
          const handValue = calculateHandValue(player.hand);
          const connectionStatus = player.isConnected ? 'Connected' : 'Disconnected';
          
          return (
            <div
              key={player.id}
              className={`
                p-3 rounded-lg border transition-all
                ${player.isConnected 
                  ? 'bg-black/20 border-white/10' 
                  : 'bg-red-900/10 border-red-500/20'
                }
              `}
            >
              {/* Player Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      player.isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-medium">{player.name}</span>
                  {player.isDealer && (
                    <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded-full border border-yellow-400/30">
                      Dealer
                    </span>
                  )}
                </div>
                
                <span className={`text-xs ${
                  player.isConnected ? 'text-green-400' : 'text-red-400'
                }`}>
                  {connectionStatus}
                </span>
              </div>

              {/* Player Stats */}
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-muted text-xs">Credits</div>
                  <div className="font-medium">{player.credits}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted text-xs">Bet</div>
                  <div className="font-medium">{player.bet || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted text-xs">Cards</div>
                  <div className="font-medium">{player.hand.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted text-xs">Value</div>
                  <div className={`font-medium ${
                    handValue === 23 ? 'text-green-400' :
                    handValue > 23 ? 'text-red-400' :
                    'text-white'
                  }`}>
                    {handValue}
                  </div>
                </div>
              </div>

              {/* Hand Status Indicators */}
              <div className="mt-2 flex flex-wrap gap-1">
                {handValue === 23 && (
                  <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded-full">
                    Pure Sabacc
                  </span>
                )}
                {handValue > 23 && (
                  <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded-full">
                    Bust
                  </span>
                )}
                {handValue < 0 && (
                  <span className="text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded-full">
                    Negative
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;