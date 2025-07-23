import { useState } from 'react'
import ImperialButton from './ImperialButton'

interface GameRulesProps {
  title?: string
  showTitle?: boolean
  className?: string
  style?: React.CSSProperties
}

const GameRules: React.FC<GameRulesProps> = ({ 
  title = "Coruscant Shift Rules", 
  showTitle = true,
  className = "",
  style = {}
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const isExpanded = (sectionId: string) => expandedSections.has(sectionId)

  return (
    <div className={`game-rules ${className}`} style={style}>
      {showTitle && (
        <h3 style={{ 
          color: 'var(--imperial-accent)', 
          marginBottom: '1.5rem',
          fontSize: '1.2rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textAlign: 'center'
        }}>
          {title}
        </h3>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Game Overview */}
        <div className="rules-section">
          <ImperialButton
            variant="default"
            onClick={() => toggleSection('overview')}
            style={{ 
              width: '100%', 
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '1rem'
            }}
          >
            <span>Game Overview</span>
            <span>{isExpanded('overview') ? '▼' : '▶'}</span>
          </ImperialButton>
          
          {isExpanded('overview') && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'rgba(51, 51, 51, 0.3)',
              border: '1px solid var(--imperial-gray)',
              borderRadius: '4px',
              marginTop: '0.5rem'
            }}>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                Coruscant Shift is a variant of Sabacc where players aim to score as close as possible to a target number determined by dice rolls, while also considering suit requirements.
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                Each game supports 2-6 players. Use your tactical skills to achieve the perfect hand while managing the unpredictable Sabacc shift.
              </p>
            </div>
          )}
        </div>

        {/* Components */}
        <div className="rules-section">
          <ImperialButton
            variant="default"
            onClick={() => toggleSection('components')}
            style={{ 
              width: '100%', 
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '1rem'
            }}
          >
            <span>Game Components</span>
            <span>{isExpanded('components') ? '▼' : '▶'}</span>
          </ImperialButton>
          
          {isExpanded('components') && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'rgba(51, 51, 51, 0.3)',
              border: '1px solid var(--imperial-gray)',
              borderRadius: '4px',
              marginTop: '0.5rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>Cards</h4>
                <ul style={{ fontSize: '0.9rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                  <li><strong>Suits:</strong> Circles, Triangles, and Squares</li>
                  <li><strong>Distribution:</strong> 20 cards per suit (split between red and green)</li>
                  <li><strong>Values:</strong> Green cards: +1 through +10, Red cards: -1 through -10</li>
                  <li><strong>Wild Cards:</strong> 2 zero cards that count as all suits</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>Dice</h4>
                <ul style={{ fontSize: '0.9rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                  <li><strong>Gold Die:</strong> Shows number values (0, 0, 5, -5, 10, -10)</li>
                  <li><strong>Silver Die:</strong> Shows suit (Square, Circle, Triangle)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Game Phases */}
        <div className="rules-section">
          <ImperialButton
            variant="default"
            onClick={() => toggleSection('phases')}
            style={{ 
              width: '100%', 
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '1rem'
            }}
          >
            <span>Game Phases</span>
            <span>{isExpanded('phases') ? '▼' : '▶'}</span>
          </ImperialButton>
          
          {isExpanded('phases') && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'rgba(51, 51, 51, 0.3)',
              border: '1px solid var(--imperial-gray)',
              borderRadius: '4px',
              marginTop: '0.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>1. Initial Roll & Selection</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Dealer rolls both dice. Gold die determines target number, silver die determines preferred suit. Players select cards closest to target number.
                  </p>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>2. First Betting Phase</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Players may continue playing or fold (losing all cards and their ante).
                  </p>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>3. Sabacc Shift</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Players discard unselected cards and draw new ones. Second betting phase follows.
                  </p>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>4. Improve Phase</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Players may add cards to their selection (cannot remove). Must use only current hand.
                  </p>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>5. Reveal Phase</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    All non-folded players reveal their selection. Winner takes the pot.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Winning Conditions */}
        <div className="rules-section">
          <ImperialButton
            variant="default"
            onClick={() => toggleSection('winning')}
            style={{ 
              width: '100%', 
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '1rem'
            }}
          >
            <span>Winning Conditions</span>
            <span>{isExpanded('winning') ? '▼' : '▶'}</span>
          </ImperialButton>
          
          {isExpanded('winning') && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'rgba(51, 51, 51, 0.3)',
              border: '1px solid var(--imperial-gray)',
              borderRadius: '4px',
              marginTop: '0.5rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>Primary Win Condition</h4>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Player with selection closest to target number wins and takes the entire pot.
                </p>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>Tiebreaker Rules</h4>
                <ul style={{ fontSize: '0.9rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                  <li>Most cards of preferred suit wins (zero cards count as all suits)</li>
                  <li>If still tied: other players draw cards, highest card wins</li>
                  <li>May use chance cube for final tiebreaker</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Game Setup */}
        <div className="rules-section">
          <ImperialButton
            variant="default"
            onClick={() => toggleSection('setup')}
            style={{ 
              width: '100%', 
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '1rem'
            }}
          >
            <span>Game Setup & Structure</span>
            <span>{isExpanded('setup') ? '▼' : '▶'}</span>
          </ImperialButton>
          
          {isExpanded('setup') && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'rgba(51, 51, 51, 0.3)',
              border: '1px solid var(--imperial-gray)',
              borderRadius: '4px',
              marginTop: '0.5rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>Initial Setup</h4>
                <ul style={{ fontSize: '0.9rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                  <li>Each player starts with 100 chips</li>
                  <li>Players must ante 5 credits to start playing</li>
                  <li>Dealer rotates left each round</li>
                  <li>Dealer deals 5 cards face down to each player</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--imperial-accent)', fontSize: '1rem', marginBottom: '0.5rem' }}>Game End</h4>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Game ends after each player has dealt once. Player with the most chips wins.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameRules 