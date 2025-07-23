import { useState } from 'react'
import IntroPage from './pages/IntroPage'
import StatusPanel from './components/StatusPanel'
import ImperialButton from './components/ImperialButton'
import { useGameSocket } from './hooks/useGameSocket'

export type AppState = 'intro' | 'creating-game' | 'joining-game' | 'in-game'

function App() {
  const [appState, setAppState] = useState<AppState>('intro')
  const [gameId, setGameId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [connectionError, setConnectionError] = useState<string>('')

  // Generate a unique game ID
  const generateGameId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Use the typed socket hook
  const { connect, disconnect, emit } = useGameSocket({
    onConnect: () => {
      console.log('Connected to server')
    },
    onConnectError: (error: any) => {
      console.error('Connection error:', error)
      setConnectionError('Failed to connect to Imperial Network')
      setAppState('intro')
    },
    onGameStateUpdated: (gameState) => {
      console.log('Game state updated:', gameState)
      // For now, just transition to in-game state without starting the game
      // This allows testing the game creation without requiring multiple players
      if (appState === 'creating-game') {
        setAppState('in-game')
      }
    },
    onGameStarted: (data) => {
      console.log('Game started:', data)
      setAppState('in-game')
    },
    onErrorOccurred: (message) => {
      console.error('Game error:', message)
      setConnectionError(message)
      setAppState('intro')
    }
  })

  const handleCreateGame = (name: string) => {
    setPlayerName(name)
    setAppState('creating-game')
    setConnectionError('')
    
    // Generate a unique game ID
    const newGameId = generateGameId()
    setGameId(newGameId)
    
    // Connect to socket and join the game
    connect()
    emit('gameJoined', { gameId: newGameId, playerName: name })
  }

  const handleJoinGame = (name: string, id: string) => {
    setPlayerName(name)
    setGameId(id)
    setAppState('joining-game')
    setConnectionError('')
    
    // Connect to socket and join the existing game
    connect()
    emit('gameJoined', { gameId: id, playerName: name })
  }

  const handleBackToIntro = () => {
    // Disconnect socket
    disconnect()
    
    setAppState('intro')
    setGameId('')
    setPlayerName('')
    setConnectionError('')
  }

  const handleStartGame = () => {
    emit('startGame', { gameId })
  }

  return (
    <div className="app">
      {appState === 'intro' && (
        <IntroPage 
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
        />
      )}
      
      {appState === 'creating-game' && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <StatusPanel 
            status={connectionError ? 'error' : 'waiting'}
            title="Initializing Game Session"
            message={connectionError || `Setting up Imperial Control Systems for ${playerName}`}
            style={{ margin: '2rem auto', maxWidth: '600px' }}
          >
            {!connectionError && (
              <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <div className="loading-spinner"></div>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  Game ID: {gameId}
                </p>
              </div>
            )}
            <ImperialButton
              variant="danger"
              onClick={handleBackToIntro}
            >
              Cancel Operation
            </ImperialButton>
          </StatusPanel>
        </div>
      )}
      
      {appState === 'joining-game' && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <StatusPanel 
            status={connectionError ? 'error' : 'waiting'}
            title={`Connecting to Game: ${gameId}`}
            message={connectionError || `Establishing connection for ${playerName} to Imperial Network`}
            style={{ margin: '2rem auto', maxWidth: '600px' }}
          >
            {!connectionError && (
              <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            )}
            <ImperialButton
              variant="danger"
              onClick={handleBackToIntro}
            >
              Cancel Connection
            </ImperialButton>
          </StatusPanel>
        </div>
      )}
      
      {appState === 'in-game' && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <StatusPanel 
            status="online"
            title="Game Session Active"
            message={`Welcome to the game, ${playerName}! Game ID: ${gameId}`}
            style={{ margin: '2rem auto', maxWidth: '600px' }}
          >
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <p>Game created successfully!</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
                Share this Game ID with other players: <strong>{gameId}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
                Game interface will be implemented here
              </p>
            </div>
            <div className="imperial-grid imperial-grid--2col" style={{ marginTop: '2rem' }}>
              <ImperialButton
                variant="danger"
                onClick={handleBackToIntro}
              >
                Leave Game
              </ImperialButton>
              <ImperialButton
                variant="primary"
                onClick={handleStartGame}
              >
                Start Game
              </ImperialButton>
            </div>
          </StatusPanel>
        </div>
      )}
    </div>
  )
}

export default App