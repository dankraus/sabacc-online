import React from 'react';
import { Player } from '@/types';
import { Card } from './Card';

interface PlayerHandProps {
  player: Player;
  calculateHandValue: (cards: Array<{ value: number }>) => number;
  isCurrentTurn: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  calculateHandValue,
  isCurrentTurn
}) => {
  const handValue = calculateHandValue(player.hand);
  const distanceFrom23 = Math.abs(23 - handValue);
  
  // Determine hand status
  const getHandStatus = () => {
    if (handValue === 23) return { text: 'Perfect Sabacc!', color: 'text-green-400' };
    if (handValue > 23) return { text: 'Bust!', color: 'text-red-400' };
    if (handValue < 0) return { text: 'Negative Hand', color: 'text-orange-400' };
    return { text: `${distanceFrom23} from 23`, color: 'text-blue-400' };
  };

  const handStatus = getHandStatus();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>
            Your Hand
          </h3>
          {isCurrentTurn && (
            <p className="text-sm text-green-400 font-medium">
              Your turn
            </p>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold">
            {handValue}
          </div>
          <div className={`text-sm ${handStatus.color}`}>
            {handStatus.text}
          </div>
        </div>
      </div>

      {/* Player Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-black/20 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-muted">Credits</div>
          <div className="font-semibold text-lg">{player.credits}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted">Current Bet</div>
          <div className="font-semibold text-lg">{player.bet}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted">Cards</div>
          <div className="font-semibold text-lg">{player.hand.length}</div>
        </div>
      </div>

      {/* Cards */}
      {player.hand.length > 0 ? (
        <div className="flex flex-wrap gap-3 justify-center">
          {player.hand.map((card, index) => (
            <Card 
              key={`${card.id}-${index}`} 
              card={card} 
              size="large"
              className="transform transition-all duration-300 hover:scale-110"
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted">
          <div className="text-4xl mb-2">🎴</div>
          <p>No cards yet</p>
        </div>
      )}

      {/* Special indicators */}
      <div className="mt-4 flex justify-center gap-2">
        {player.isDealer && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-400/30">
            Dealer
          </span>
        )}
        {handValue === 23 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-400/30">
            Pure Sabacc
          </span>
        )}
        {handValue > 23 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-400/30">
            Bust
          </span>
        )}
      </div>
    </div>
  );
};

export default PlayerHand;