import StatusPanel from '../components/StatusPanel'
import ImperialButton from '../components/ImperialButton'
import PlayerList from '../components/PlayerList'
import ChatWindow from '../components/ChatWindow'
import { Player } from '../types/game'

interface ChatMessage {
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

interface LobbyPageProps {
  gameId: string
  playerName: string
  players: Player[]
  maxPlayers: number
  chatMessages: ChatMessage[]
  currentPlayerId: string
  hostId: string | null
  onLeaveGame: () => void
  onStartGame: () => void
  onSendChatMessage: (message: string) => void
}

function LobbyPage({
  gameId,
  playerName,
  players,
  maxPlayers,
  chatMessages,
  currentPlayerId,
  hostId,
  onLeaveGame,
  onStartGame,
  onSendChatMessage
}: LobbyPageProps) {
  // Check if current player is the host
  const isHost = currentPlayerId === hostId
  
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px', 
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Main Game Info */}
        <div>
          <StatusPanel 
            status="online"
            title="Game Session Active"
            message={`Welcome to the game, ${playerName}! ${isHost ? 'You are the host.' : 'Waiting for the host to start the game.'}`}
            style={{ marginBottom: '2rem' }}
          >
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <p>{isHost ? 'Game created successfully!' : 'Joined game successfully!'}</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
                {isHost ? 'Share this Game ID with other players: ' : 'Game ID: '}<strong>{gameId}</strong>
              </p>
              
              {/* Player List for Game Host */}
              <PlayerList 
                players={players}
                playerName={playerName}
                maxPlayers={maxPlayers}
                showWaitingMessage={false}
                hostId={hostId}
              />
              
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  Ready to start the game with {players.length} player{players.length !== 1 ? 's' : ''}
                </p>
                {players.length < 2 && (
                  <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
                    Need at least 2 players to start
                  </p>
                )}
              </div>
            </div>
            <div className="imperial-grid imperial-grid--2col" style={{ marginTop: '2rem' }}>
              <ImperialButton
                variant="danger"
                onClick={onLeaveGame}
              >
                Leave Game
              </ImperialButton>
              {isHost && (
                <ImperialButton
                  variant="primary"
                  onClick={onStartGame}
                  disabled={players.length < 2}
                >
                  Start Game
                </ImperialButton>
              )}
            </div>
          </StatusPanel>
        </div>

        {/* Chat Window */}
        <div>
          <ChatWindow
            messages={chatMessages}
            currentPlayerId={currentPlayerId}
            onSendMessage={onSendChatMessage}
            hostId={hostId}
          />
        </div>
      </div>
    </div>
  )
}

export default LobbyPage 