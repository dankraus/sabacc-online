import { useState } from 'react'
import IntroPage from './pages/IntroPage'
import CreateGame from './pages/CreateGame'
import JoinGame from './pages/JoinGame'
import LobbyPage from './pages/LobbyPage'
import GamePlay from './pages/GamePlay'

import { useGameSocket } from './hooks/useGameSocket'
import { Player, Card } from './types/game'

interface ChatMessage {
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

export type AppState = 'intro' | 'creating-game' | 'joining-game' | 'lobby' | 'gameplay'

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
  const [dealerIndex, setDealerIndex] = useState<number>(0)
  const [pot, setPot] = useState<number>(0)
  const [currentPhase, setCurrentPhase] = useState<string>('setup')
  const [targetNumber, setTargetNumber] = useState<number | null>(null)
  const [preferredSuit, setPreferredSuit] = useState<string | null>(null)
  const [currentPlayerHand, setCurrentPlayerHand] = useState<Card[]>([])

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
      // Update dealer index
      setDealerIndex(gameState.dealerIndex)
      // Update game state
      setPot(gameState.pot)
      setCurrentPhase(gameState.currentPhase)
      setTargetNumber(gameState.targetNumber)
      setPreferredSuit(gameState.preferredSuit)
      
      // Find current player's hand
      const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)
      if (currentPlayer) {
        setCurrentPlayerHand(currentPlayer.hand || [])
      }
      
      // For now, just transition to lobby state without starting the game
      // This allows testing the game creation without requiring multiple players
      if (appState === 'creating-game') {
        setAppState('lobby')
      }
    },
    onGameStarted: (data) => {
      console.log('Game started:', data)
      setAppState('gameplay')
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
    },
    onDiceRolled: (data) => {
      console.log('Dice rolled:', data)
      // The game state will be updated via onGameStateUpdated
    },
    onCardsSelected: (data) => {
      console.log('Cards selected:', data)
      // The game state will be updated via onGameStateUpdated
    },
    onCardsImproved: (data) => {
      console.log('Cards improved:', data)
      // The game state will be updated via onGameStateUpdated
    },
    onRoundEnded: (data) => {
      console.log('Round ended:', data)
      // The game state will be updated via onGameStateUpdated
    },
    onGameEnded: (data) => {
      console.log('Game ended:', data)
      // Could show a game over screen or return to lobby
      setAppState('lobby')
    }
  })

  const handleCreateGame = (name: string) => {
    setPlayerName(name)
    setAppState('creating-game')
    setConnectionError('')
    setPlayers([]) // Reset players list
    setChatMessages([]) // Reset chat messages
    setDealerIndex(0) // Reset dealer index
    setPot(0) // Reset pot
    setCurrentPhase('setup') // Reset phase
    setTargetNumber(null) // Reset target number
    setPreferredSuit(null) // Reset preferred suit
    setCurrentPlayerHand([]) // Reset current player hand
    
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
    setDealerIndex(0) // Reset dealer index
    setPot(0) // Reset pot
    setCurrentPhase('setup') // Reset phase
    setTargetNumber(null) // Reset target number
    setPreferredSuit(null) // Reset preferred suit
    setCurrentPlayerHand([]) // Reset current player hand
    
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
    setDealerIndex(0) // Reset dealer index
    setPot(0) // Reset pot
    setCurrentPhase('setup') // Reset phase
    setTargetNumber(null) // Reset target number
    setPreferredSuit(null) // Reset preferred suit
    setCurrentPlayerHand([]) // Reset current player hand
  }

  const handleStartGame = () => {
    emit('startGame', { gameId })
  }

  const handleSendChatMessage = (message: string) => {
    emit('chatMessageSent', message)
  }

  const handleRollDice = () => {
    emit('rollDice', gameId)
  }

  const handleSelectCards = (selectedCardIndices: number[]) => {
    emit('selectCards', { gameId, selectedCardIndices })
  }

  const handleContinuePlaying = () => {
    emit('continuePlaying', gameId)
  }

  const handleFold = () => {
    emit('fold', gameId)
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
      
      {appState === 'gameplay' && (
        <GamePlay
          gameId={gameId}
          players={players}
          currentPlayerId={currentPlayerId}
          pot={pot}
          currentPhase={currentPhase}
          targetNumber={targetNumber}
          preferredSuit={preferredSuit}
          currentPlayerHand={currentPlayerHand}
          dealerIndex={dealerIndex}
          hostId={hostId}
          chatMessages={chatMessages}
          onLeaveGame={handleBackToIntro}
          onRollDice={handleRollDice}
          onSelectCards={handleSelectCards}
          onContinuePlaying={handleContinuePlaying}
          onFold={handleFold}
          onSendChatMessage={handleSendChatMessage}
        />
      )}
    </div>
  )
}

export default App