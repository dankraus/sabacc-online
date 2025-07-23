import { Player } from '../types/game'

interface PlayerListProps {
  players: Player[]
  playerName: string
  maxPlayers: number
  showWaitingMessage?: boolean
  hostId?: string | null
}

function PlayerList({ players, playerName, maxPlayers, showWaitingMessage = true, hostId }: PlayerListProps) {
  return (
    <div style={{ marginTop: '2rem', textAlign: 'left' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'center' }}>
        Imperial Forces ({players.length}/{maxPlayers})
      </h3>
      
      {players.length === 0 ? (
        <p style={{ textAlign: 'center', opacity: 0.7, fontStyle: 'italic' }}>
          No players connected yet...
        </p>
      ) : (
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.1)', 
          borderRadius: '8px', 
          padding: '1rem',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {players.map((player, index) => (
            <div 
              key={player.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.5rem 0',
                borderBottom: index < players.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: player.name === playerName ? 'bold' : 'normal' }}>
                  {player.name}
                </span>
                {player.id === hostId && (
                  <span style={{
                    fontSize: '0.7rem',
                    backgroundColor: '#ffd700',
                    color: '#000',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '3px',
                    fontWeight: 'bold'
                  }}>
                    HOST
                  </span>
                )}
              </div>
              <span style={{ 
                fontSize: '0.8rem', 
                opacity: 0.7,
                color: player.name === playerName ? '#4ade80' : undefined
              }}>
                {player.name === playerName ? 'You' : 'Connected'}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {showWaitingMessage && (
        <p style={{ 
          fontSize: '0.8rem', 
          opacity: 0.6, 
          marginTop: '1rem', 
          textAlign: 'center' 
        }}>
          Waiting for more players to join...
        </p>
      )}
    </div>
  )
}

export default PlayerList 