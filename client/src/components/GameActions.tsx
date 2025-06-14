import React, { useState } from 'react';
import { GamePhase, Player, LoadingState } from '@/types';

interface GameActionsProps {
  gamePhase: GamePhase;
  currentPlayer: Player;
  isCurrentPlayerTurn: boolean;
  canPlaceBet: boolean;
  canDrawCard: boolean;
  canStand: boolean;
  onPlaceBet: (amount: number) => void;
  onDrawCard: () => void;
  onStand: () => void;
  loading: LoadingState;
}

export const GameActions: React.FC<GameActionsProps> = ({
  gamePhase,
  currentPlayer,
  isCurrentPlayerTurn,
  canPlaceBet,
  canDrawCard,
  canStand,
  onPlaceBet,
  onDrawCard,
  onStand,
  loading
}) => {
  const [betAmount, setBetAmount] = useState<number>(10);

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setBetAmount(Math.max(0, Math.min(value, currentPlayer.credits)));
  };

  const handlePlaceBet = () => {
    if (betAmount > 0 && betAmount <= currentPlayer.credits) {
      onPlaceBet(betAmount);
    }
  };

  const getQuickBetAmounts = () => {
    const credits = currentPlayer.credits;
    const amounts = [
      Math.min(10, credits),
      Math.min(25, credits),
      Math.min(50, credits),
      Math.min(100, credits),
      credits // All in
    ].filter((amount, index, arr) => amount > 0 && arr.indexOf(amount) === index);
    
    return amounts;
  };

  // Phase-specific content
  const renderWaitingPhase = () => (
    <div className="card text-center">
      <div className="text-4xl mb-3">⏳</div>
      <h3 className="font-semibold mb-2">Waiting for Game to Start</h3>
      <p className="text-muted text-sm">
        The game will begin once all players are ready.
      </p>
    </div>
  );

  const renderBettingPhase = () => (
    <div className="card">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--color-accent-gold)' }}>
        Place Your Bet
      </h3>
      
      {!canPlaceBet ? (
        <div className="text-center py-6">
          <div className="text-2xl mb-2">⏰</div>
          <p className="text-muted">
            {currentPlayer.bet > 0 
              ? `You've already bet ${currentPlayer.bet} credits`
              : 'Waiting for your turn to bet'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current bet display */}
          {currentPlayer.bet > 0 && (
            <div className="bg-green-900/20 border border-green-400/30 rounded-lg p-3 text-center">
              <span className="text-green-400 text-sm">Current bet: {currentPlayer.bet} credits</span>
            </div>
          )}

          {/* Bet amount input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Bet Amount (1 - {currentPlayer.credits} credits)
            </label>
            <input
              type="number"
              min="1"
              max={currentPlayer.credits}
              value={betAmount}
              onChange={handleBetChange}
              className="input"
              disabled={loading.isLoading}
            />
          </div>

          {/* Quick bet buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Bets</label>
            <div className="flex flex-wrap gap-2">
              {getQuickBetAmounts().map((amount, index) => (
                <button
                  key={index}
                  onClick={() => setBetAmount(amount)}
                  className={`btn btn-secondary text-sm px-3 py-1 ${
                    betAmount === amount ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  disabled={loading.isLoading}
                >
                  {amount === currentPlayer.credits ? 'All In' : amount}
                </button>
              ))}
            </div>
          </div>

          {/* Place bet button */}
          <button
            onClick={handlePlaceBet}
            disabled={!canPlaceBet || betAmount <= 0 || betAmount > currentPlayer.credits || loading.isLoading}
            className="btn btn-primary w-full"
          >
            {loading.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Placing Bet...
              </div>
            ) : (
              `Bet ${betAmount} Credits`
            )}
          </button>
        </div>
      )}
    </div>
  );

  const renderPlayingPhase = () => (
    <div className="card">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--color-accent-gold)' }}>
        Your Turn
      </h3>
      
      {!isCurrentPlayerTurn ? (
        <div className="text-center py-6">
          <div className="text-2xl mb-2">⏰</div>
          <p className="text-muted">
            Waiting for other players to take their turn...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted mb-4">
            Choose your action. Remember: get as close to 23 as possible without going over!
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onDrawCard}
              disabled={!canDrawCard || loading.isLoading}
              className="btn btn-primary"
            >
              {loading.isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Drawing...
                </div>
              ) : (
                <>
                  🎴 Draw Card
                </>
              )}
            </button>
            
            <button
              onClick={onStand}
              disabled={!canStand || loading.isLoading}
              className="btn btn-secondary"
            >
              ✋ Stand
            </button>
          </div>

          {/* Hand advice */}
          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-3">
            <div className="text-sm text-blue-400">
              💡 <strong>Tip:</strong> Standing keeps your current hand value. 
              Drawing adds another card but risks going over 23!
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFinishedPhase = () => (
    <div className="card text-center">
      <div className="text-4xl mb-3">🏆</div>
      <h3 className="font-semibold mb-2">Game Finished!</h3>
      <p className="text-muted text-sm">
        The round is complete. Check the results above.
      </p>
    </div>
  );

  // Render based on current phase
  switch (gamePhase) {
    case 'waiting':
      return renderWaitingPhase();
    case 'betting':
      return renderBettingPhase();
    case 'playing':
      return renderPlayingPhase();
    case 'finished':
      return renderFinishedPhase();
    default:
      return (
        <div className="card text-center">
          <p className="text-muted">Unknown game phase</p>
        </div>
      );
  }
};

export default GameActions;