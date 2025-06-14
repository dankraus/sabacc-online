import React, { useState } from 'react';
import { GameLobby } from '@/components/GameLobby';
import { GameBoard } from '@/components/GameBoard';
import { useGame } from '@/hooks';
import '@/styles/globals.css';

export const App: React.FC = () => {
  const [gameId, setGameId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  
  const {
    gameState,
    hasJoinedGame,
    joinGame,
    leaveGame,
    placeBet,
    drawCard,
    stand,
    loading,
    error,
    isConnected,
    currentPlayer,
    otherPlayers,
    isCurrentPlayerTurn,
    canPlaceBet,
    canDrawCard,
    canStand,
    clearGameError
  } = useGame();

  const handleJoinGame = (gameId: string, playerName: string) => {
    setGameId(gameId);
    setPlayerName(playerName);
    joinGame(gameId, playerName);
  };

  const handleLeaveGame = () => {
    leaveGame();
    setGameId('');
    setPlayerName('');
  };

  return (
    <div className="app h-full">
      {!hasJoinedGame || !gameState ? (
        <GameLobby
          onJoinGame={handleJoinGame}
          loading={loading}
          error={error}
          isConnected={isConnected}
          onClearError={clearGameError}
        />
      ) : (
        <GameBoard
          gameState={gameState}
          gameId={gameId}
          playerName={playerName}
          currentPlayer={currentPlayer}
          otherPlayers={otherPlayers}
          isCurrentPlayerTurn={isCurrentPlayerTurn}
          canPlaceBet={canPlaceBet}
          canDrawCard={canDrawCard}
          canStand={canStand}
          onLeaveGame={handleLeaveGame}
          onPlaceBet={placeBet}
          onDrawCard={drawCard}
          onStand={stand}
          loading={loading}
          error={error}
          onClearError={clearGameError}
        />
      )}
    </div>
  );
};

export default App;