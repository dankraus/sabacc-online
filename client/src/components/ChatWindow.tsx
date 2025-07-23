import { useState, useRef, useEffect } from 'react'
import ImperialButton from './ImperialButton'
import ImperialInput from './ImperialInput'

interface ChatMessage {
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

interface ChatWindowProps {
  messages: ChatMessage[]
  currentPlayerId: string
  onSendMessage: (message: string) => void
  style?: React.CSSProperties
  hostId?: string | null
}

function ChatWindow({ messages, currentPlayerId, onSendMessage, style, hostId }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '400px',
        border: '1px solid #4a90e2',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        ...style
      }}
    >
      {/* Chat Header */}
      <div style={{
        padding: '0.75rem',
        borderBottom: '1px solid #4a90e2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#4a90e2',
          animation: 'pulse 2s infinite'
        }} />
        <span style={{ 
          color: '#4a90e2', 
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          Imperial Communications
        </span>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.9rem',
            fontStyle: 'italic'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.playerId === currentPlayerId
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                  gap: '0.25rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  {!isOwnMessage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>
                        {message.playerName}
                      </span>
                      {message.playerId === hostId && (
                        <span style={{
                          fontSize: '0.6rem',
                          backgroundColor: '#ffd700',
                          color: '#000',
                          padding: '0.1rem 0.2rem',
                          borderRadius: '2px',
                          fontWeight: 'bold'
                        }}>
                          HOST
                        </span>
                      )}
                    </div>
                  )}
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {isOwnMessage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>
                        You
                      </span>
                      {message.playerId === hostId && (
                        <span style={{
                          fontSize: '0.6rem',
                          backgroundColor: '#ffd700',
                          color: '#000',
                          padding: '0.1rem 0.2rem',
                          borderRadius: '2px',
                          fontWeight: 'bold'
                        }}>
                          HOST
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{
                  maxWidth: '80%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: isOwnMessage 
                    ? 'rgba(74, 144, 226, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${isOwnMessage ? '#4a90e2' : 'rgba(255, 255, 255, 0.2)'}`,
                  wordBreak: 'break-word'
                }}>
                  {message.text}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #4a90e2',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1 }}>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            maxLength={200}
            rows={2}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #4a90e2',
              borderRadius: '4px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>
        <ImperialButton
          variant="primary"
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          style={{ minWidth: '80px' }}
        >
          Send
        </ImperialButton>
      </div>
    </div>
  )
}

export default ChatWindow 