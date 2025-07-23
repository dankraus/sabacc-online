import StatusPanel from '../components/StatusPanel'
import ImperialButton from '../components/ImperialButton'

interface CreateGameProps {
  gameId: string
  playerName: string
  connectionError: string
  onCancel: () => void
}

function CreateGame({
  gameId,
  playerName,
  connectionError,
  onCancel
}: CreateGameProps) {
  return (
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
          onClick={onCancel}
        >
          Cancel Operation
        </ImperialButton>
      </StatusPanel>
    </div>
  )
}

export default CreateGame 