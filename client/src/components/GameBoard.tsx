import React from 'react';
import { GameState, Player, LoadingState, GameError } from '@/types';
import { GameStatus } from './GameStatus';
import { PlayerHand } from './PlayerHand';
import { PlayerList } from './PlayerList';
import { GameActions } from './GameActions';

interface GameBoardProps {
  gameState: GameState;
  gameId: string;
  playerName: string;
  currentPlayer: Player | null;
  otherPlayers: Player[];
  isCurrentPlayerTurn: boolean;
  canPlaceBet: boolean;
  canDrawCard: boolean;
  canStand: boolean;
  onLeaveGame: () => void;
  onPlaceBet: (amount: number) => void;
  onDrawCard: () => void;
  onStand: () => void;
  loading: LoadingState;
  error: GameError | null;
  onClearError: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  gameId,
  playerName,
  currentPlayer,
  otherPlayers,
  isCurrentPlayerTurn,
  canPlaceBet,
  canDrawCard,
  canStand,
  onLeaveGame,
  onPlaceBet,
  onDrawCard,
  onStand,
  loading,
  error,
  onClearError
}) => {
  const calculateHandValue = (cards: Array<{ value: number }>): number => {
    return cards.reduce((sum, card) => sum + card.value, 0);
  };

  return (
    <div className="game-board h-full flex flex-col">
      {/* Header */}
      <header className="bg-black/30 border-b border-white/10 p-4">
        <div className="container flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>
              Sabacc Online
            </h1>
            <p className="text-sm text-muted">
              Game: {gameId} • Player: {playerName}
            </p>
          </div>
          
          <button
            onClick={onLeaveGame}
            className="btn btn-secondary"
            disabled={loading.isLoading}
          >
            Leave Game
          </button>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="container mt-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-400 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300 text-sm">{error.message}</p>
              </div>
              <button
                onClick={onClearError}
                className="text-red-400 hover:text-red-300 transition text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <main className="flex-1 container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Sidebar - Game Status */}
          <div className="lg:col-span-1">
            <GameStatus 
              gameState={gameState}
              isCurrentPlayerTurn={isCurrentPlayerTurn}
            />
            
            {/* Other Players */}
            <div className="mt-6">
              <PlayerList 
                players={otherPlayers}
                calculateHandValue={calculateHandValue}
              />
            </div>
          </div>

          {/* Center - Current Player */}
          <div className="lg:col-span-2 flex flex-col">
            {currentPlayer ? (
              <>
                <PlayerHand
                  player={currentPlayer}
                  calculateHandValue={calculateHandValue}
                  isCurrentTurn={isCurrentPlayerTurn}
                />
                
                <div className="mt-6">
                  <GameActions
                    gamePhase={gameState.phase}
                    currentPlayer={currentPlayer}
                    isCurrentPlayerTurn={isCurrentPlayerTurn}
                    canPlaceBet={canPlaceBet}
                    canDrawCard={canDrawCard}
                    canStand={canStand}
                    onPlaceBet={onPlaceBet}
                    onDrawCard={onDrawCard}
                    onStand={onStand}
                    loading={loading}
                  />
                </div>
              </>
            ) : (
              <div className="card text-center">
                <p className="text-muted">Loading player data...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GameBoard;