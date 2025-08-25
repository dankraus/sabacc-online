import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import PlayerHand from '../PlayerHand'
import { Card } from '../../types/game'

describe('PlayerHand', () => {
  const mockCards: Card[] = [
    { suit: 'Circle', value: 5, color: 'green', isWild: false },
    { suit: 'Triangle', value: -3, color: 'red', isWild: false },
    { suit: undefined, value: 0, color: undefined, isWild: true },
    { suit: 'Circle', value: -8, color: 'red', isWild: false },
    { suit: 'Square', value: 7, color: 'green', isWild: false }
  ]

  const defaultProps = {
    cards: mockCards,
    selectedCardIndices: [],
    currentPhase: 'card_selection',
    onCardClick: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the hand title', () => {
    render(<PlayerHand {...defaultProps} />)
    expect(screen.getByText('Your Hand')).toBeInTheDocument()
  })

  it('renders the total hand value', () => {
    render(<PlayerHand {...defaultProps} />)
    expect(screen.getByText('Total Value:')).toBeInTheDocument()
    // 5 + (-3) + 0 + (-8) + 7 = 1
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('displays correct total for negative hand value', () => {
    const negativeCards: Card[] = [
      { suit: 'Circle', value: -5, color: 'red', isWild: false },
      { suit: 'Triangle', value: -3, color: 'red', isWild: false },
      { suit: 'Square', value: -2, color: 'red', isWild: false }
    ]
    const props = {
      ...defaultProps,
      cards: negativeCards
    }
    
    render(<PlayerHand {...props} />)
    // -5 + (-3) + (-2) = -10
    expect(screen.getByText('-10')).toBeInTheDocument()
  })

  it('displays correct total for zero hand value', () => {
    const zeroCards: Card[] = [
      { suit: 'Circle', value: 5, color: 'green', isWild: false },
      { suit: 'Triangle', value: -5, color: 'red', isWild: false },
      { suit: undefined, value: 0, color: undefined, isWild: true }
    ]
    const props = {
      ...defaultProps,
      cards: zeroCards
    }
    
    render(<PlayerHand {...props} />)
    // 5 + (-5) + 0 = 0
    const totalValueElement = screen.getByText('0', { selector: '.player-hand-total-value' })
    expect(totalValueElement).toBeInTheDocument()
  })

  it('displays correct total for empty hand', () => {
    const props = {
      ...defaultProps,
      cards: []
    }
    
    render(<PlayerHand {...props} />)
    expect(screen.getByText('Total Value:')).toBeInTheDocument()
    const totalValueElement = screen.getByText('0', { selector: '.player-hand-total-value' })
    expect(totalValueElement).toBeInTheDocument()
  })

  it('renders all cards in the hand', () => {
    render(<PlayerHand {...defaultProps} />)
    const cards = screen.getAllByTestId(/player-hand-card/)
    expect(cards).toHaveLength(5)
  })

  it('renders cards with correct class names', () => {
    render(<PlayerHand {...defaultProps} />)
    
    // Check for regular cards
    const regularCards = screen.getAllByTestId(/player-hand-card/)
    expect(regularCards[0]).toHaveClass('player-hand-card', 'regular-card')
    expect(regularCards[1]).toHaveClass('player-hand-card', 'regular-card')
    expect(regularCards[2]).toHaveClass('player-hand-card', 'wild-card')
    expect(regularCards[3]).toHaveClass('player-hand-card', 'regular-card')
    expect(regularCards[4]).toHaveClass('player-hand-card', 'regular-card')
  })

  it('renders suit symbols visually instead of text', () => {
    render(<PlayerHand {...defaultProps} />)
    
    // Check for visual suit representations
    expect(screen.getAllByText('●')).toHaveLength(2) // Circle (appears twice)
    expect(screen.getByText('▲')).toBeInTheDocument() // Triangle
    expect(screen.getByText('■')).toBeInTheDocument() // Square
    expect(screen.getByText('★')).toBeInTheDocument() // Wild card
  })

  it('renders card values correctly', () => {
    render(<PlayerHand {...defaultProps} />)
    
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('-3')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('-8')).toBeInTheDocument()
    expect(screen.getByText('+7')).toBeInTheDocument()
  })

  it('applies selected class to selected cards', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedCardIndices: [0, 2]
    }
    
    render(<PlayerHand {...propsWithSelection} />)
    const cards = screen.getAllByTestId(/player-hand-card/)
    
    expect(cards[0]).toHaveClass('selected')
    expect(cards[1]).not.toHaveClass('selected')
    expect(cards[2]).toHaveClass('selected')
    expect(cards[3]).not.toHaveClass('selected')
    expect(cards[4]).not.toHaveClass('selected')
  })

  it('calls onCardClick when a card is clicked', () => {
    const mockOnCardClick = vi.fn()
    const props = {
      ...defaultProps,
      onCardClick: mockOnCardClick
    }
    
    render(<PlayerHand {...props} />)
    const cards = screen.getAllByTestId(/player-hand-card/)
    
    fireEvent.click(cards[0])
    expect(mockOnCardClick).toHaveBeenCalledWith(0)
    
    fireEvent.click(cards[2])
    expect(mockOnCardClick).toHaveBeenCalledWith(2)
  })

  it('shows instruction text during card selection phase', () => {
    render(<PlayerHand {...defaultProps} />)
    expect(screen.getByText('Click cards to select them for your hand')).toBeInTheDocument()
  })

  it('does not show instruction text during other phases', () => {
    const props = {
      ...defaultProps,
      currentPhase: 'betting'
    }
    
    render(<PlayerHand {...props} />)
    expect(screen.queryByText('Click cards to select them for your hand')).not.toBeInTheDocument()
  })

  it('renders empty hand gracefully', () => {
    const props = {
      ...defaultProps,
      cards: []
    }
    
    render(<PlayerHand {...props} />)
    expect(screen.getByText('Your Hand')).toBeInTheDocument()
    expect(screen.queryByTestId(/player-hand-card/)).not.toBeInTheDocument()
  })

  it('applies correct cursor style based on phase', () => {
    // During card selection phase
    const { rerender } = render(<PlayerHand {...defaultProps} />)
    let cards = screen.getAllByTestId(/player-hand-card/)
    expect(cards[0]).toHaveStyle({ cursor: 'pointer' })
    
    // During other phases
    rerender(<PlayerHand {...defaultProps} currentPhase="betting" />)
    cards = screen.getAllByTestId(/player-hand-card/)
    expect(cards[0]).toHaveStyle({ cursor: 'default' })
  })

  it('renders cards with correct background colors', () => {
    render(<PlayerHand {...defaultProps} />)
    const cards = screen.getAllByTestId(/player-hand-card/)
    
    // Green card
    expect(cards[0]).toHaveStyle({ backgroundColor: '#006400' })
    // Red card
    expect(cards[1]).toHaveStyle({ backgroundColor: '#8B0000' })
    // Wild card (purple)
    expect(cards[2]).toHaveStyle({ backgroundColor: '#4B0082' })
    // Red card
    expect(cards[3]).toHaveStyle({ backgroundColor: '#8B0000' })
    // Green card
    expect(cards[4]).toHaveStyle({ backgroundColor: '#006400' })
  })
})
