import React, { useState } from 'react';
import DiceDisplay from './DiceDisplay';

const DiceDisplayDemo: React.FC = () => {
  const [currentDiceRoll, setCurrentDiceRoll] = useState<{
    goldValue: number;
    silverSuit: 'Circle' | 'Triangle' | 'Square';
  } | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const sampleDiceRolls = [
    { goldValue: 7, silverSuit: 'Circle' as const },
    { goldValue: 3, silverSuit: 'Triangle' as const },
    { goldValue: 9, silverSuit: 'Square' as const },
    { goldValue: 1, silverSuit: 'Circle' as const },
    { goldValue: 5, silverSuit: 'Triangle' as const },
  ];

  const handleRollDice = () => {
    setIsRolling(true);
    setCurrentDiceRoll(null);
    
    // Simulate dice rolling
    setTimeout(() => {
      const randomRoll = sampleDiceRolls[Math.floor(Math.random() * sampleDiceRolls.length)];
      setCurrentDiceRoll(randomRoll);
      setIsRolling(false);
    }, 2000);
  };

  const handleSetSpecificRoll = (roll: typeof sampleDiceRolls[0]) => {
    setCurrentDiceRoll(roll);
    setIsRolling(false);
  };

  return (
    <div className="control-panel" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <h2 className="imperial-title">Dice Display Demo</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          className="imperial-button imperial-button--primary"
          onClick={handleRollDice}
          disabled={isRolling}
          style={{ marginRight: '1rem' }}
        >
          {isRolling ? 'Rolling...' : 'Roll Dice'}
        </button>
        
        <button 
          className="imperial-button"
          onClick={() => setCurrentDiceRoll(null)}
          disabled={isRolling}
        >
          Clear Dice
        </button>
      </div>

      <DiceDisplay 
        diceRoll={currentDiceRoll} 
        isRolling={isRolling}
      />

      <div style={{ marginTop: '2rem' }}>
        <h3 className="imperial-subtitle">Sample Dice Rolls</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {sampleDiceRolls.map((roll, index) => (
            <button
              key={index}
              className="imperial-button"
              onClick={() => handleSetSpecificRoll(roll)}
              disabled={isRolling}
              style={{ fontSize: '0.9rem' }}
            >
              Gold: {roll.goldValue}, Silver: {roll.silverSuit}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid var(--imperial-light-gray)', borderRadius: '4px' }}>
        <h3 className="imperial-subtitle">Component Features</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>• Displays both gold value die and silver suit die</li>
          <li style={{ marginBottom: '0.5rem' }}>• Shows rolling animation when dice are being rolled</li>
          <li style={{ marginBottom: '0.5rem' }}>• Color-coded suit symbols (● Circle, ▲ Triangle, ■ Square)</li>
          <li style={{ marginBottom: '0.5rem' }}>• Summary section with target number and preferred suit</li>
          <li style={{ marginBottom: '0.5rem' }}>• Responsive design for mobile devices</li>
          <li style={{ marginBottom: '0.5rem' }}>• Imperial-themed styling with hover effects</li>
        </ul>
      </div>
    </div>
  );
};

export default DiceDisplayDemo;
