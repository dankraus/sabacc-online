import React, { useState } from 'react'
import { Player, Card } from '../types/game'
import ImperialButton from '../components/ImperialButton'
import ChatWindow from '../components/ChatWindow'
import DiceDisplay from '../components/DiceDisplay'
import PlayerHand from '../components/PlayerHand'

interface ChatMessage {
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

// Define DiceRoll type for the component
interface DiceRoll {
  goldValue: number;
  silverSuit: 'Circle' | 'Triangle' | 'Square';
}

interface GamePlayProps {
  gameId: string
  players: Player[]
  currentPlayerId: string
  pot: number
  currentPhase: string
  targetNumber: number | null
  preferredSuit: string | null
  currentPlayerHand: Card[]
  dealerIndex: number
  hostId: string | null
  chatMessages: ChatMessage[]
  currentDiceRoll: DiceRoll | null
  isRollingDice: boolean
  onLeaveGame: () => void
  onSelectCards: (selectedCardIndices: number[]) => void
  onContinuePlaying: () => void
  onFold: () => void
  onSendChatMessage: (message: string) => void
}

const GamePlay: React.FC<GamePlayProps> = ({
  gameId,
  players,
  currentPlayerId,
  pot,
  currentPhase,
  targetNumber,
  preferredSuit,
  currentPlayerHand,
  dealerIndex,
  hostId,
  chatMessages,
  currentDiceRoll,
  isRollingDice,
  onLeaveGame,
  onSelectCards,
  onContinuePlaying,
  onFold,
  onSendChatMessage
}) => {
  const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([])

  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const isCurrentPlayerTurn = currentPlayer?.isActive && !currentPlayer?.hasActed

  const handleCardClick = (index: number) => {
    if (currentPhase === 'card_selection') {
      setSelectedCardIndices(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index)
        } else {
          return [...prev, index]
        }
      })
    }
  }

  const handleConfirmSelection = () => {
    if (selectedCardIndices.length > 0) {
      onSelectCards(selectedCardIndices)
      setSelectedCardIndices([])
    }
  }

  const renderPlayer = (player: Player, index: number) => {
    const isCurrentPlayer = player.id === currentPlayerId
    const isActive = player.isActive
    const hasActed = player.hasActed
    const isDealer = index === dealerIndex
    const isHost = player.id === hostId

    return (
      <div
        key={player.id}
        className={`player ${isCurrentPlayer ? 'current-player' : ''} ${!isActive ? 'folded' : ''}`}
        style={{
          padding: '1rem',
          border: `2px solid ${isCurrentPlayer ? 'var(--imperial-accent)' : 'var(--imperial-gray)'}`,
          borderRadius: '8px',
          backgroundColor: isCurrentPlayer ? 'rgba(255, 215, 0, 0.1)' : 'rgba(51, 51, 51, 0.3)',
          margin: '0.5rem',
          minWidth: '200px',
          textAlign: 'center',
          opacity: isActive ? 1 : 0.6
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {player.name} {isCurrentPlayer ? '(You)' : ''}
        </div>
        
        {/* Role Labels */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {isDealer && (
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: '#ffd700',
              color: '#000',
              padding: '0.1rem 0.3rem',
              borderRadius: '3px',
              fontWeight: 'bold'
            }}>
              DEALER
            </span>
          )}
          {isHost && (
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: '#4a90e2',
              color: '#fff',
              padding: '0.1rem 0.3rem',
              borderRadius: '3px',
              fontWeight: 'bold'
            }}>
              HOST
            </span>
          )}
        </div>
        
        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Chips: {player.chips}
        </div>
        {player.selectedCards && player.selectedCards.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--imperial-accent)' }}>
            Selected: {player.selectedCards.length} cards
          </div>
        )}
        {hasActed && (
          <div style={{ fontSize: '0.8rem', color: player.bettingAction === 'fold' ? '#ff6b6b' : '#51cf66' }}>
            {player.bettingAction === 'fold' ? 'Folded' : 'Continued'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="gameplay" style={{ padding: '1rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--imperial-accent)', margin: 0 }}>Game: {gameId}</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--imperial-gray)' }}>
            Phase: {currentPhase.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--imperial-accent)' }}>
            Pot: {pot} chips
          </div>
          {targetNumber !== null && (
            <div style={{ fontSize: '0.9rem', color: 'var(--imperial-gray)' }}>
              Target: {targetNumber > 0 ? `+${targetNumber}` : targetNumber}
            </div>
          )}
          {preferredSuit && (
            <div style={{ fontSize: '0.9rem', color: 'var(--imperial-gray)' }}>
              Suit: {preferredSuit}
            </div>
          )}
        </div>
        <ImperialButton variant="danger" onClick={onLeaveGame}>
          Leave Game
        </ImperialButton>
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {currentPhase === 'card_selection' && selectedCardIndices.length > 0 && (
          <ImperialButton variant="default" onClick={handleConfirmSelection}>
            Confirm Selection ({selectedCardIndices.length} cards)
          </ImperialButton>
        )}
        
        {currentPhase === 'betting' && isCurrentPlayerTurn && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <ImperialButton variant="default" onClick={onContinuePlaying}>
              Continue (2 chips)
            </ImperialButton>
            <ImperialButton variant="danger" onClick={onFold}>
              Fold
            </ImperialButton>
          </div>
        )}
      </div>

      {/* Dice Display - Show during setup, initial_roll, and when dice are rolled */}
      {(currentPhase === 'setup' || currentPhase === 'initial_roll' || currentDiceRoll !== null) && (
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <DiceDisplay 
            diceRoll={currentDiceRoll}
            isRolling={isRollingDice}
          />
        </div>
      )}

      {/* Main Game Area */}
      <div style={{ display: 'flex', flex: 1, gap: '1rem', marginBottom: '1rem' }}>
        {/* Left Side - Players and Hand */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Players Grid */}
          <div style={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {players.map((player, index) => renderPlayer(player, index))}
          </div>

          {/* Current Player's Hand */}
          {currentPlayerHand && currentPlayerHand.length > 0 && (
            <PlayerHand
              cards={currentPlayerHand}
              selectedCardIndices={selectedCardIndices}
              currentPhase={currentPhase}
              onCardClick={handleCardClick}
            />
          )}
        </div>

        {/* Right Side - Chat */}
        <div style={{ width: '350px' }}>
          <ChatWindow
            messages={chatMessages}
            currentPlayerId={currentPlayerId}
            onSendMessage={onSendChatMessage}
            hostId={hostId}
          />
        </div>
      </div>
    </div>
  )
}

export default GamePlay 