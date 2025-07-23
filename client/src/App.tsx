import { useState } from 'react'
import IntroPage from './pages/IntroPage'
import CreateGame from './pages/CreateGame'
import JoinGame from './pages/JoinGame'
import LobbyPage from './pages/LobbyPage'
import StatusPanel from './components/StatusPanel'
import ImperialButton from './components/ImperialButton'
import PlayerList from './components/PlayerList'
import { useGameSocket } from './hooks/useGameSocket'
import { Player } from './types/game'

export type AppState = 'intro' | 'creating-game' | 'joining-game' | 'lobby'

function App() {
  const [appState, setAppState] = useState<AppState>('intro')
  const [gameId, setGameId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [connectionError, setConnectionError] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [maxPlayers] = useState<number>(6) // From DEFAULT_GAME_SETTINGS

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
      // Update players list from game state
      setPlayers(gameState.players)
      
      // For now, just transition to lobby state without starting the game
      // This allows testing the game creation without requiring multiple players
      if (appState === 'creating-game') {
        setAppState('lobby')
      }
    },
    onGameStarted: (data) => {
      console.log('Game started:', data)
      setAppState('lobby')
    },
    onPlayerJoined: (player) => {
      console.log('Player joined:', player)
      setPlayers(prevPlayers => {
        // Check if player already exists to avoid duplicates
        if (prevPlayers.some(p => p.id === player.id)) {
          return prevPlayers
        }
        return [...prevPlayers, player]
      })
    },
    onPlayerLeft: (playerName) => {
      console.log('Player left:', playerName)
      setPlayers(prevPlayers => prevPlayers.filter(p => p.name !== playerName))
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
    setPlayers([]) // Reset players list
    
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
    setPlayers([]) // Reset players list
    
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
    setPlayers([]) // Reset players list
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
        <CreateGame
          gameId={gameId}
          playerName={playerName}
          connectionError={connectionError}
          onCancel={handleBackToIntro}
        />
      )}
      
      {appState === 'joining-game' && (
        <JoinGame
          gameId={gameId}
          playerName={playerName}
          players={players}
          maxPlayers={maxPlayers}
          connectionError={connectionError}
          onCancel={handleBackToIntro}
        />
      )}
      
      {appState === 'lobby' && (
        <LobbyPage
          gameId={gameId}
          playerName={playerName}
          players={players}
          maxPlayers={maxPlayers}
          onLeaveGame={handleBackToIntro}
          onStartGame={handleStartGame}
        />
      )}
    </div>
  )
}

export default App