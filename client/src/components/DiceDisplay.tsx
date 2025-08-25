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

  const getDieBackground = (isGold: boolean) => {
    if (isGold) {
      return 'linear-gradient(135deg, #ffd700 0%, #ffed4e 30%, #ffd700 70%, #b8860b 100%)';
    } else {
      return 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 30%, #c0c0c0 70%, #708090 100%)';
    }
  };

  const getDieShadow = (isGold: boolean) => {
    if (isGold) {
      return '0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.3)';
    } else {
      return '0 0 20px rgba(192, 192, 192, 0.6), inset 0 0 20px rgba(192, 192, 192, 0.3)';
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
                  <div 
            className="dice die--gold"
            data-testid="gold-die"
          style={{
            background: getDieBackground(true),
            boxShadow: getDieShadow(true),
            transform: 'perspective(1000px) rotateX(15deg) rotateY(-15deg)',
            border: '3px solid #b8860b',
            position: 'relative'
          }}
        >
          {/* Die face with dots/pips */}
          <div className="die__face" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            position: 'relative',
            justifyContent: 'space-between',
            padding: '0.5rem 0'
          }}>
            <div 
              className="die__value"
              style={{ 
                color: '#8B4513',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                fontSize: '3.5rem',
                fontWeight: '900',
                textAlign: 'center',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0',
                flex: '1'
              }}
            >
              {diceRoll ? diceRoll.goldValue : '?'}
            </div>
            {/* Add some decorative elements to make it look more like a die */}
            <div className="die__decorations">
              <div className="die__corner" style={{ top: '8px', left: '8px' }}></div>
              <div className="die__corner" style={{ top: '8px', right: '8px' }}></div>
              <div className="die__corner" style={{ bottom: '8px', left: '8px' }}></div>
              <div className="die__corner" style={{ bottom: '8px', right: '8px' }}></div>
              {/* Add some subtle inner shadows for depth */}
              <div style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                right: '2px',
                bottom: '2px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                pointerEvents: 'none'
              }}></div>
            </div>
          </div>
        </div>

        {/* Silver Suit Die */}
        <div 
          className="dice die--silver"
          style={{
            background: getDieBackground(false),
            boxShadow: getDieShadow(false),
            transform: 'perspective(1000px) rotateX(15deg) rotateY(15deg)',
            border: '3px solid #708090',
            position: 'relative'
          }}
        >
          {/* Die face with suit symbol */}
                      <div className="die__face" data-testid="silver-die" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            position: 'relative',
            justifyContent: 'space-between',
            padding: '0.5rem 0'
          }}>
            <div 
              className="die__value die__value--suit"
              style={{ 
                color: 'rgb(47, 79, 79)',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                fontSize: '4rem',
                fontWeight: '900',
                textAlign: 'center',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0',
                flex: '1'
              }}
            >
              {diceRoll ? getSuitSymbol(diceRoll.silverSuit) : '?'}
            </div>
            {/* Add some decorative elements to make it look more like a die */}
            <div className="die__decorations">
              <div className="die__corner" style={{ top: '8px', left: '8px' }}></div>
              <div className="die__corner" style={{ top: '8px', right: '8px' }}></div>
              <div className="die__corner" style={{ bottom: '8px', left: '8px' }}></div>
              <div className="die__corner" style={{ bottom: '8px', right: '8px' }}></div>
              {/* Add some subtle inner shadows for depth */}
              <div style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                right: '2px',
                bottom: '2px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                pointerEvents: 'none'
              }}></div>
            </div>
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
