import { useState } from 'react'
import ImperialButton from '../components/ImperialButton'
import ImperialInput from '../components/ImperialInput'

interface IntroPageProps {
  onCreateGame: (playerName: string) => void
  onJoinGame: (playerName: string, gameId: string) => void
}

const IntroPage: React.FC<IntroPageProps> = ({ onCreateGame, onJoinGame }) => {
  const [playerName, setPlayerName] = useState('')
  const [gameId, setGameId] = useState('')
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const [errors, setErrors] = useState<{ name?: string; gameId?: string }>({})

  const validateInputs = (name: string, id?: string) => {
    const newErrors: { name?: string; gameId?: string } = {}
    
    if (!name.trim()) {
      newErrors.name = 'Identification required for Imperial access'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Identification must be at least 2 characters'
    } else if (name.trim().length > 20) {
      newErrors.name = 'Identification must be 20 characters or less'
    }
    
    if (mode === 'join') {
      if (!id?.trim()) {
        newErrors.gameId = 'Game ID required for network access'
      } else if (id.trim().length < 4) {
        newErrors.gameId = 'Invalid game ID format'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateGame = () => {
    if (validateInputs(playerName)) {
      onCreateGame(playerName.trim())
    }
  }

  const handleJoinGame = () => {
    if (validateInputs(playerName, gameId)) {
      onJoinGame(playerName.trim(), gameId.trim().toUpperCase())
    }
  }

  const handleBack = () => {
    setMode('select')
    setErrors({})
  }

  if (mode === 'select') {
    return (
      <div className="intro-page">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 className="imperial-title">
            Imperial Sabacc Terminal
          </h1>
          
          <div className="control-panel" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="status-indicator status-indicator--online"></div>
              <span>Imperial Network Online</span>
            </div>
            
            <p style={{ 
              textAlign: 'center', 
              margin: '2rem 0',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              color: 'var(--imperial-accent)'
            }}>
              Access the Imperial Sabacc gaming network. Create a new session or join an existing game with proper clearance codes.
            </p>
            
            <div className="imperial-grid imperial-grid--2col" style={{ marginTop: '3rem' }}>
              <ImperialButton
                variant="primary"
                onClick={() => setMode('create')}
                style={{ 
                  padding: '1.5rem',
                  fontSize: '1.2rem',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <div>⚡</div>
                <div>Initialize New Game</div>
                <small style={{ opacity: 0.8, fontSize: '0.8rem' }}>Create Session</small>
              </ImperialButton>
              
              <ImperialButton
                variant="success"
                onClick={() => setMode('join')}
                style={{ 
                  padding: '1.5rem',
                  fontSize: '1.2rem',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <div>🔗</div>
                <div>Connect to Game</div>
                <small style={{ opacity: 0.8, fontSize: '0.8rem' }}>Join Session</small>
              </ImperialButton>
            </div>
          </div>
          
          <div style={{ 
            margin: '3rem auto',
            maxWidth: '500px',
            padding: '1rem',
            border: '1px solid var(--imperial-gray)',
            borderRadius: '4px',
            backgroundColor: 'rgba(51, 51, 51, 0.3)'
          }}>
            <h3 style={{ 
              color: 'var(--imperial-accent)', 
              marginBottom: '1rem',
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              System Information
            </h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--imperial-light-gray)' }}>
              Sabacc is the galaxy's most popular card game. Each game supports 2-6 players. 
              Use your tactical skills to achieve the perfect hand while managing the unpredictable Sabacc shift.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="intro-page">
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 className="imperial-title">
          {mode === 'create' ? 'Initialize New Game' : 'Connect to Game'}
        </h1>
        
        <div className="control-panel" style={{ maxWidth: '500px', margin: '2rem auto' }}>
          <ImperialInput
            label="Imperial Identification"
            value={playerName}
            onChange={setPlayerName}
            placeholder="Enter your call sign..."
            error={errors.name}
            maxLength={20}
          />
          
          {mode === 'join' && (
            <ImperialInput
              label="Game Session ID"
              value={gameId}
              onChange={(value) => setGameId(value.toUpperCase())}
              placeholder="Enter game ID..."
              error={errors.gameId}
              style={{ textTransform: 'uppercase' }}
            />
          )}
          
          <div className="imperial-grid imperial-grid--2col" style={{ marginTop: '2rem' }}>
            <ImperialButton
              variant="danger"
              onClick={handleBack}
            >
              ← Back
            </ImperialButton>
            
            <ImperialButton
              variant={mode === 'create' ? 'primary' : 'success'}
              onClick={mode === 'create' ? handleCreateGame : handleJoinGame}
              disabled={!playerName.trim() || (mode === 'join' && !gameId.trim())}
            >
              {mode === 'create' ? 'Initialize' : 'Connect'} →
            </ImperialButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntroPage