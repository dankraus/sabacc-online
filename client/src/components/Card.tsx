import React from 'react';
import { Card as CardType, CardSuit } from '@/types';

interface CardProps {
  card: CardType;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const getSuitSymbol = (suit: CardSuit): string => {
  const symbols = {
    sabers: '⚔️',
    flasks: '🧪',
    coins: '🪙',
    staves: '🔮'
  };
  return symbols[suit];
};

const getSuitColor = (suit: CardSuit): string => {
  const colors = {
    sabers: 'var(--color-sabers)',
    flasks: 'var(--color-flasks)',
    coins: 'var(--color-coins)',
    staves: 'var(--color-staves)'
  };
  return colors[suit];
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  size = 'medium',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-16 h-24 text-xs',
    medium: 'w-20 h-28 text-sm',
    large: 'w-24 h-36 text-base'
  };

  const cardStyle = {
    background: `linear-gradient(135deg, ${getSuitColor(card.suit)}20, ${getSuitColor(card.suit)}40)`,
    borderColor: getSuitColor(card.suit),
    color: '#ffffff'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        border-2 rounded-lg p-2 
        flex flex-col justify-between
        shadow-md transition-all duration-200
        hover:scale-105 hover:shadow-lg
        ${className}
      `}
      style={cardStyle}
    >
      {/* Top corner */}
      <div className="flex justify-between items-start">
        <div className="text-lg leading-none">
          {getSuitSymbol(card.suit)}
        </div>
        <div className="font-bold text-lg leading-none">
          {Math.abs(card.value)}
        </div>
      </div>

      {/* Center symbol */}
      <div className="text-center text-2xl">
        {getSuitSymbol(card.suit)}
      </div>

      {/* Bottom corner (rotated) */}
      <div className="flex justify-between items-end rotate-180">
        <div className="text-lg leading-none">
          {getSuitSymbol(card.suit)}
        </div>
        <div className="font-bold text-lg leading-none">
          {Math.abs(card.value)}
        </div>
      </div>

      {/* Value indicator for negative cards */}
      {card.value < 0 && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
          -
        </div>
      )}
    </div>
  );
};

export default Card;