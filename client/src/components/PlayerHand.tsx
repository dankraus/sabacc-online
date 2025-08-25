import React from 'react'
import { Card } from '../types/game'

interface PlayerHandProps {
  cards: Card[]
  selectedCardIndices: number[]
  currentPhase: string
  onCardClick: (index: number) => void
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardIndices,
  currentPhase,
  onCardClick
}) => {
  // Calculate total value of all cards in hand
  const totalHandValue = cards.reduce((sum, card) => sum + card.value, 0)
  const renderCard = (card: Card, index: number, isSelected: boolean = false) => {
    const cardColor = card.isWild ? 'purple' : card.color
    const cardValue = card.value
    const cardSuit = card.isWild ? '★' : card.suit

    // Create visual representation of the suit
    const renderSuitVisual = () => {
      if (card.isWild) {
        return <div className="card-suit-wild">★</div>
      }
      
      switch (card.suit) {
        case 'Circle':
          return <div className="card-suit-circle">●</div>
        case 'Triangle':
          return <div className="card-suit-triangle">▲</div>
        case 'Square':
          return <div className="card-suit-square">■</div>
        default:
          return <div className="card-suit-unknown">?</div>
      }
    }

    return (
      <div
        key={index}
        data-testid={`player-hand-card-${index}`}
        className={`player-hand-card ${isSelected ? 'selected' : ''} ${card.isWild ? 'wild-card' : 'regular-card'}`}
        onClick={() => onCardClick(index)}
        style={{
          width: '60px',
          height: '90px',
          border: `2px solid ${isSelected ? 'var(--imperial-accent)' : 'var(--imperial-gray)'}`,
          borderRadius: '8px',
          backgroundColor: cardColor === 'red' ? '#8B0000' : cardColor === 'green' ? '#006400' : '#4B0082',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: currentPhase === 'card_selection' ? 'pointer' : 'default',
          margin: '0 4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          boxShadow: isSelected ? '0 0 10px var(--imperial-accent)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <div className="card-suit" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
          {renderSuitVisual()}
        </div>
        <div className="card-value" style={{ fontSize: '1rem' }}>
          {cardValue > 0 ? `+${cardValue}` : cardValue}
        </div>
      </div>
    )
  }

  return (
    <div className="player-hand-container" style={{ 
      border: '2px solid var(--imperial-accent)', 
      borderRadius: '8px', 
      padding: '1rem',
      backgroundColor: 'rgba(51, 51, 51, 0.3)'
    }}>
      <h3 className="player-hand-title" style={{ color: 'var(--imperial-accent)', marginBottom: '1rem', textAlign: 'center' }}>
        Your Hand
      </h3>
      
      {/* Total Hand Value Display */}
      <div className="player-hand-total" style={{ 
        textAlign: 'center', 
        marginBottom: '1rem', 
        padding: '0.5rem',
        backgroundColor: 'rgba(51, 51, 51, 0.8)',
        borderRadius: '4px',
        border: '1px solid var(--imperial-accent)'
      }}>
        <div className="player-hand-total-label" style={{ 
          fontSize: '0.8rem', 
          color: 'white', 
          marginBottom: '0.25rem',
          fontWeight: 'bold'
        }}>
          Total Value:
        </div>
        <div className="player-hand-total-value" style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'bold', 
          color: totalHandValue > 0 ? '#51cf66' : totalHandValue < 0 ? '#ff6b6b' : 'var(--imperial-accent)' 
        }}>
          {totalHandValue > 0 ? `+${totalHandValue}` : totalHandValue}
        </div>
      </div>
      
      <div className="player-hand-cards" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        {cards.map((card, index) => 
          renderCard(card, index, selectedCardIndices.includes(index))
        )}
      </div>
      {currentPhase === 'card_selection' && (
        <div className="player-hand-instruction" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--imperial-gray)' }}>
          Click cards to select them for your hand
        </div>
      )}
    </div>
  )
}

export default PlayerHand
