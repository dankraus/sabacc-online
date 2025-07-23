import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ChatWindow from '../ChatWindow'

describe('ChatWindow', () => {
  const mockMessages = [
    {
      playerId: 'player1',
      playerName: 'Luke',
      text: 'Hello there!',
      timestamp: Date.now() - 1000
    },
    {
      playerId: 'player2',
      playerName: 'Leia',
      text: 'General Kenobi!',
      timestamp: Date.now()
    }
  ]

  const defaultProps = {
    messages: mockMessages,
    currentPlayerId: 'player1',
    onSendMessage: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chat messages correctly', () => {
    render(<ChatWindow {...defaultProps} />)
    
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
    expect(screen.getByText('General Kenobi!')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument() // Current player shows as "You"
    expect(screen.getByText('Leia')).toBeInTheDocument()
  })

  it('shows "You" for current player messages', () => {
    render(<ChatWindow {...defaultProps} />)
    
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('displays timestamps in correct format', () => {
    render(<ChatWindow {...defaultProps} />)
    
    // Check that timestamps are displayed (they should be in HH:MM format)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/)
    expect(timeElements.length).toBeGreaterThan(0)
  })

  it('sends message when send button is clicked', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)
    
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('sends message when Enter is pressed', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' })
    
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('does not send empty messages', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const sendButton = screen.getByText('Send')
    
    fireEvent.click(sendButton)
    
    expect(defaultProps.onSendMessage).not.toHaveBeenCalled()
  })

  it('disables send button for empty messages', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when message is typed', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    
    expect(sendButton).not.toBeDisabled()
  })

  it('shows empty state when no messages', () => {
    render(<ChatWindow {...defaultProps} messages={[]} />)
    
    expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument()
  })

  it('respects max length limit', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    const longMessage = 'a'.repeat(201)
    
    fireEvent.change(textarea, { target: { value: longMessage } })
    
    // The textarea should have the maxLength attribute set
    expect(textarea).toHaveAttribute('maxlength', '200')
  })

  it('clears input after sending message', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)
    
    expect(textarea).toHaveValue('')
  })
}) 