import StatusPanel from '../components/StatusPanel'
import ImperialButton from '../components/ImperialButton'
import PlayerList from '../components/PlayerList'
import { Player } from '../types/game'

interface JoinGameProps {
  gameId: string
  playerName: string
  players: Player[]
  maxPlayers: number
  connectionError: string
  onCancel: () => void
}

function JoinGame({
  gameId,
  playerName,
  players,
  maxPlayers,
  connectionError,
  onCancel
}: JoinGameProps) {
  return (
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
            
            {/* Player List */}
            <PlayerList 
              players={players}
              playerName={playerName}
              maxPlayers={maxPlayers}
              showWaitingMessage={true}
            />
          </div>
        )}
        <ImperialButton
          variant="danger"
          onClick={onCancel}
        >
          Cancel Connection
        </ImperialButton>
      </StatusPanel>
    </div>
  )
}

export default JoinGame 