import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GamePlay from '../GamePlay'
import { Card } from '../../types/game'

// Mock the ImperialButton component
vi.mock('../../components/ImperialButton', () => ({
  default: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-testid={`button-${variant}`}>
      {children}
    </button>
  )
}))

describe('GamePlay', () => {
  const mockProps = {
    gameId: 'TEST123',
    players: [
      {
        id: 'player1',
        name: 'Player 1',
        chips: 100,
        hand: [],
        selectedCards: [],
        isActive: true,
        hasActed: false,
        bettingAction: null
      },
      {
        id: 'player2',
        name: 'Player 2',
        chips: 95,
        hand: [],
        selectedCards: [],
        isActive: true,
        hasActed: false,
        bettingAction: null
      }
    ],
    currentPlayerId: 'player1',
    pot: 10,
    currentPhase: 'setup',
    targetNumber: null,
    preferredSuit: null,
    currentPlayerHand: [
      {
        suit: 'Circle',
        value: 5,
        color: 'green',
        isWild: false
      },
      {
        suit: 'Triangle',
        value: -3,
        color: 'red',
        isWild: false
      }
    ] as Card[],
    dealerIndex: 0,
    hostId: 'player1',
    chatMessages: [],
    onLeaveGame: vi.fn(),
    onRollDice: vi.fn(),
    onSelectCards: vi.fn(),
    onContinuePlaying: vi.fn(),
    onFold: vi.fn(),
    onSendChatMessage: vi.fn()
  }

  it('renders game information correctly', () => {
    render(<GamePlay {...mockProps} />)
    
    expect(screen.getByText('Game: TEST123')).toBeInTheDocument()
    expect(screen.getByText('Phase: SETUP')).toBeInTheDocument()
    expect(screen.getByText('Pot: 10 chips')).toBeInTheDocument()
  })

  it('renders player information', () => {
    render(<GamePlay {...mockProps} />)
    
    expect(screen.getByText('Player 1 (You)')).toBeInTheDocument()
    expect(screen.getByText('Player 2')).toBeInTheDocument()
    expect(screen.getByText('Chips: 100')).toBeInTheDocument()
    expect(screen.getByText('Chips: 95')).toBeInTheDocument()
  })

  it('renders current player hand', () => {
    render(<GamePlay {...mockProps} />)
    
    expect(screen.getByText('Your Hand')).toBeInTheDocument()
    // Cards should be rendered with their values
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('-3')).toBeInTheDocument()
  })

  it('shows roll dice button in setup phase', () => {
    render(<GamePlay {...mockProps} />)
    
    expect(screen.getByTestId('button-default')).toBeInTheDocument()
    expect(screen.getByText('Roll Dice')).toBeInTheDocument()
  })

  it('shows leave game button', () => {
    render(<GamePlay {...mockProps} />)
    
    expect(screen.getByTestId('button-danger')).toBeInTheDocument()
    expect(screen.getByText('Leave Game')).toBeInTheDocument()
  })

  it('shows dealer and host labels', () => {
    render(<GamePlay {...mockProps} />)
    
    // Player 1 should be both dealer and host
    expect(screen.getByText('DEALER')).toBeInTheDocument()
    expect(screen.getByText('HOST')).toBeInTheDocument()
  })

  it('shows chat window', () => {
    render(<GamePlay {...mockProps} />)
    
    expect(screen.getByText('Imperial Communications')).toBeInTheDocument()
  })
}) 