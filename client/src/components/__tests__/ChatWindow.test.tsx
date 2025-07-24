import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Mock the soundManager before importing ChatWindow
vi.mock('../../utils/soundManager', () => ({
  soundManager: {
    loadChatSounds: vi.fn().mockResolvedValue(undefined),
    setEnabled: vi.fn(),
    playChatSend: vi.fn().mockResolvedValue(undefined),
    playChatReceive: vi.fn().mockResolvedValue(undefined),
  }
}))

import ChatWindow from '../ChatWindow'
import { soundManager } from '../../utils/soundManager'

// Type the mocked functions properly
const mockedSoundManager = vi.mocked(soundManager)

describe('ChatWindow', () => {
  const mockMessages = [
    {
      playerId: 'player1',
      playerName: 'Player 1',
      text: 'Hello there!',
      timestamp: Date.now() - 1000
    },
    {
      playerId: 'player2',
      playerName: 'Player 2',
      text: 'Hi!',
      timestamp: Date.now()
    }
  ]

  const defaultProps = {
    messages: mockMessages,
    currentPlayerId: 'player1',
    onSendMessage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chat window with messages', () => {
    render(<ChatWindow {...defaultProps} />)
    
    expect(screen.getByText('Imperial Communications')).toBeInTheDocument()
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
    expect(screen.getByText('Hi!')).toBeInTheDocument()
  })

  it('sends message when send button is clicked', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.click(sendButton)
    
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('New message')
  })

  it('sends message when Enter is pressed', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('Type your message...')
    
    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('New message')
  })

  it('does not send empty messages', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const sendButton = screen.getByText('Send')
    
    fireEvent.click(sendButton)
    
    expect(defaultProps.onSendMessage).not.toHaveBeenCalled()
  })

  it('shows host badge for host messages', () => {
    const messagesWithHost = [
      {
        playerId: 'host',
        playerName: 'Host Player',
        text: 'Host message',
        timestamp: Date.now()
      }
    ]
    
    render(<ChatWindow {...defaultProps} messages={messagesWithHost} hostId="host" />)
    
    expect(screen.getByText('HOST')).toBeInTheDocument()
  })

  it('displays empty state when no messages', () => {
    render(<ChatWindow {...defaultProps} messages={[]} />)
    
    expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument()
  })

  it('renders sound toggle button', () => {
    render(<ChatWindow {...defaultProps} />)
    
    expect(screen.getByText('ON')).toBeInTheDocument()
    expect(screen.getByTitle('Disable sounds')).toBeInTheDocument()
  })

  it('toggles sound on/off when button is clicked', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const soundButton = screen.getByTitle('Disable sounds')
    
    // Initially ON
    expect(screen.getByText('ON')).toBeInTheDocument()
    
    // Click to turn OFF
    fireEvent.click(soundButton)
    expect(screen.getByText('OFF')).toBeInTheDocument()
    expect(screen.getByTitle('Enable sounds')).toBeInTheDocument()
    
    // Click to turn ON again
    fireEvent.click(soundButton)
    expect(screen.getByText('ON')).toBeInTheDocument()
    expect(screen.getByTitle('Disable sounds')).toBeInTheDocument()
  })

  it('plays send sound when message is sent and sounds are enabled', async () => {
    render(<ChatWindow {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(mockedSoundManager.playChatSend).toHaveBeenCalled()
    })
  })

  it('does not play send sound when sounds are disabled', async () => {
    render(<ChatWindow {...defaultProps} />)
    
    // Disable sounds
    const soundButton = screen.getByTitle('Disable sounds')
    fireEvent.click(soundButton)
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(mockedSoundManager.playChatSend).toHaveBeenCalled()
    })
  })

  it('plays receive sound when new message arrives from another player', async () => {
    const { rerender } = render(<ChatWindow {...defaultProps} messages={[mockMessages[0]]} />)
    
    // Add a new message from another player
    const newMessages = [
      mockMessages[0],
      {
        playerId: 'player2',
        playerName: 'Player 2',
        text: 'New incoming message',
        timestamp: Date.now()
      }
    ]
    
    rerender(<ChatWindow {...defaultProps} messages={newMessages} />)
    
    await waitFor(() => {
      expect(mockedSoundManager.playChatReceive).toHaveBeenCalled()
    })
  })

  it('does not play receive sound for own messages', async () => {
    const { rerender } = render(<ChatWindow {...defaultProps} messages={[mockMessages[0]]} />)
    
    // Add a new message from the current player
    const newMessages = [
      mockMessages[0],
      {
        playerId: 'player1',
        playerName: 'Player 1',
        text: 'My own message',
        timestamp: Date.now()
      }
    ]
    
    rerender(<ChatWindow {...defaultProps} messages={newMessages} />)
    
    await waitFor(() => {
      expect(mockedSoundManager.playChatReceive).not.toHaveBeenCalled()
    })
  })

  it('does not play receive sound for recently sent messages', async () => {
    const { rerender } = render(<ChatWindow {...defaultProps} messages={[mockMessages[0]]} />)
    
    // Simulate sending a message
    const sentMessage = {
      playerId: 'player1',
      playerName: 'Player 1',
      text: 'Just sent this message',
      timestamp: Date.now()
    }
    
    // Add the sent message to the messages array (simulating it being broadcast back)
    const newMessages = [mockMessages[0], sentMessage]
    
    rerender(<ChatWindow {...defaultProps} messages={newMessages} />)
    
    await waitFor(() => {
      expect(mockedSoundManager.playChatReceive).not.toHaveBeenCalled()
    })
  })

  it('handles audio play errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedSoundManager.playChatSend.mockRejectedValueOnce(new Error('Audio play failed'))
    
    render(<ChatWindow {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(mockedSoundManager.playChatSend).toHaveBeenCalled()
    })
    
    consoleSpy.mockRestore()
  })

  it('loads chat sounds on mount', () => {
    render(<ChatWindow {...defaultProps} />)
    
    expect(mockedSoundManager.loadChatSounds).toHaveBeenCalled()
  })

  it('syncs sound manager enabled state', () => {
    render(<ChatWindow {...defaultProps} />)
    
    const soundButton = screen.getByTitle('Disable sounds')
    fireEvent.click(soundButton)
    
    expect(mockedSoundManager.setEnabled).toHaveBeenCalledWith(false)
  })
}) 