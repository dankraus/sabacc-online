import { useState } from 'react'
import IntroPage from './pages/IntroPage'
import StatusPanel from './components/StatusPanel'
import ImperialButton from './components/ImperialButton'

export type AppState = 'intro' | 'creating-game' | 'joining-game' | 'in-game'

function App() {
  const [appState, setAppState] = useState<AppState>('intro')
  const [gameId, setGameId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')

  const handleCreateGame = (name: string) => {
    setPlayerName(name)
    setAppState('creating-game')
    // TODO: Implement game creation logic
  }

  const handleJoinGame = (name: string, id: string) => {
    setPlayerName(name)
    setGameId(id)
    setAppState('joining-game')
    // TODO: Implement game joining logic
  }

  const handleBackToIntro = () => {
    setAppState('intro')
    setGameId('')
    setPlayerName('')
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
            status="waiting"
            title="Initializing Game Session"
            message={`Setting up Imperial Control Systems for ${playerName}`}
            style={{ margin: '2rem auto', maxWidth: '600px' }}
          >
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <div className="loading-spinner"></div>
            </div>
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
            status="waiting"
            title={`Connecting to Game: ${gameId}`}
            message={`Establishing connection for ${playerName} to Imperial Network`}
            style={{ margin: '2rem auto', maxWidth: '600px' }}
          >
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <div className="loading-spinner"></div>
            </div>
            <ImperialButton
              variant="danger"
              onClick={handleBackToIntro}
            >
              Cancel Connection
            </ImperialButton>
          </StatusPanel>
        </div>
      )}
    </div>
  )
}

export default App