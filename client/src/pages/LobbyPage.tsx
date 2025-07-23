import StatusPanel from '../components/StatusPanel'
import ImperialButton from '../components/ImperialButton'
import PlayerList from '../components/PlayerList'
import { Player } from '../types/game'

interface LobbyPageProps {
  gameId: string
  playerName: string
  players: Player[]
  maxPlayers: number
  onLeaveGame: () => void
  onStartGame: () => void
}

function LobbyPage({
  gameId,
  playerName,
  players,
  maxPlayers,
  onLeaveGame,
  onStartGame
}: LobbyPageProps) {
  return (
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
          
          {/* Player List for Game Host */}
          <PlayerList 
            players={players}
            playerName={playerName}
            maxPlayers={maxPlayers}
            showWaitingMessage={false}
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
          <ImperialButton
            variant="primary"
            onClick={onStartGame}
            disabled={players.length < 2}
          >
            Start Game
          </ImperialButton>
        </div>
      </StatusPanel>
    </div>
  )
}

export default LobbyPage 