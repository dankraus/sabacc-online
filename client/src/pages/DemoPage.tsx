import React from 'react';
import DiceDisplayDemo from '../components/DiceDisplayDemo';
import ImperialButton from '../components/ImperialButton';

interface DemoPageProps {
  onBackToIntro?: () => void;
}

const DemoPage: React.FC<DemoPageProps> = ({ onBackToIntro }) => {
  return (
    <div className="app">
      <div className="control-panel" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 className="imperial-title">Sabacc UI Components Demo</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--imperial-accent)' }}>
          Interactive demonstration of the Imperial-themed UI components
        </p>
        
        <DiceDisplayDemo />
        
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <ImperialButton 
            variant="primary"
            onClick={onBackToIntro || (() => {
              // Fallback if onBackToIntro is not provided
              if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/';
              }
            })}
          >
            Back to Main App
          </ImperialButton>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;
