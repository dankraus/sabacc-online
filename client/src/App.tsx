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

interface ChatMessage {
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

export type AppState = 'intro' | 'creating-game' | 'joining-game' | 'lobby'

function App() {
  const [appState, setAppState] = useState<AppState>('intro')
  const [gameId, setGameId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [connectionError, setConnectionError] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [maxPlayers] = useState<number>(6) // From DEFAULT_GAME_SETTINGS
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')
  const [hostId, setHostId] = useState<string | null>(null)

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
  const { connect, disconnect, emit, socket } = useGameSocket({
    onConnect: () => {
      console.log('Connected to server')
      // Set the current player ID from the socket
      if (socket?.id) {
        setCurrentPlayerId(socket.id)
      }
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
      // Update host ID
      setHostId(gameState.hostId)
      
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
      
      // Transition to lobby state for joining players
      if (appState === 'joining-game') {
        setAppState('lobby')
      }
    },
    onPlayerLeft: (playerName) => {
      console.log('Player left:', playerName)
      setPlayers(prevPlayers => prevPlayers.filter(p => p.name !== playerName))
    },
    onChatMessageReceived: (data) => {
      console.log('Chat message received:', data)
      const player = players.find(p => p.id === data.playerId)
      if (player) {
        const newMessage: ChatMessage = {
          playerId: data.playerId,
          playerName: player.name,
          text: data.text,
          timestamp: data.timestamp
        }
        setChatMessages(prev => [...prev, newMessage])
      }
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
    setChatMessages([]) // Reset chat messages
    
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
    setChatMessages([]) // Reset chat messages
    
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
    setChatMessages([]) // Reset chat messages
    setCurrentPlayerId('') // Reset current player ID
    setHostId(null) // Reset host ID
  }

  const handleStartGame = () => {
    emit('startGame', { gameId })
  }

  const handleSendChatMessage = (message: string) => {
    emit('chatMessageSent', message)
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
          chatMessages={chatMessages}
          currentPlayerId={currentPlayerId}
          hostId={hostId}
          onLeaveGame={handleBackToIntro}
          onStartGame={handleStartGame}
          onSendChatMessage={handleSendChatMessage}
        />
      )}
    </div>
  )
}

export default App