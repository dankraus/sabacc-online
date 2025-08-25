import React from 'react';

// Define the type locally for the component
interface DiceRoll {
  goldValue: number;
  silverSuit: 'Circle' | 'Triangle' | 'Square';
}

interface DiceDisplayProps {
  diceRoll: DiceRoll | null;
  isRolling?: boolean;
  className?: string;
}

const DiceDisplay: React.FC<DiceDisplayProps> = ({
  diceRoll,
  isRolling = false,
  className = ''
}) => {
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'Circle':
        return '●';
      case 'Triangle':
        return '▲';
      case 'Square':
        return '■';
      default:
        return suit;
    }
  };

  const getSuitColor = (suit: string) => {
    switch (suit) {
      case 'Circle':
        return 'var(--imperial-blue)';
      case 'Triangle':
        return 'var(--imperial-green)';
      case 'Square':
        return 'var(--imperial-red)';
      default:
        return 'var(--imperial-white)';
    }
  };

  return (
    <div className={`dice-display ${className}`}>
      <div className="dice-display__header">
        <h3 className="dice-display__title">Dice Roll</h3>
        {isRolling && (
          <div className="dice-display__rolling-indicator">
            <span className="rolling-text">Rolling...</span>
          </div>
        )}
      </div>
      
      <div className="dice-display__container">
        {/* Gold Value Die */}
        <div className="dice die--gold">
          <div className="die__label">Gold</div>
          <div className="die__value">
            {diceRoll ? diceRoll.goldValue : '?'}
          </div>
        </div>

        {/* Silver Suit Die */}
        <div className="dice die--silver">
          <div className="die__label">Silver</div>
          <div 
            className="die__value die__value--suit"
            style={{ 
              color: diceRoll ? getSuitColor(diceRoll.silverSuit) : 'var(--imperial-white)'
            }}
          >
            {diceRoll ? getSuitSymbol(diceRoll.silverSuit) : '?'}
          </div>
          <div className="die__suit-name">
            {diceRoll ? diceRoll.silverSuit : 'Unknown'}
          </div>
        </div>
      </div>

      {diceRoll && (
        <div className="dice-display__summary">
          <div className="summary__item">
            <span className="summary__label">Target Number:</span>
            <span className="summary__value">{diceRoll.goldValue}</span>
          </div>
          <div className="summary__item">
            <span className="summary__label">Preferred Suit:</span>
            <span 
              className="summary__value"
              style={{ color: getSuitColor(diceRoll.silverSuit) }}
            >
              {diceRoll.silverSuit}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiceDisplay;
