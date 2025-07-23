import { render, screen, fireEvent } from '@testing-library/react'
import GameRules from '../GameRules'

describe('GameRules', () => {
  it('renders with default title', () => {
    render(<GameRules />)
    expect(screen.getByText('Coruscant Shift Rules')).toBeInTheDocument()
  })

  it('renders with custom title', () => {
    render(<GameRules title="Custom Rules" />)
    expect(screen.getByText('Custom Rules')).toBeInTheDocument()
  })

  it('renders without title when showTitle is false', () => {
    render(<GameRules showTitle={false} />)
    expect(screen.queryByText('Coruscant Shift Rules')).not.toBeInTheDocument()
  })

  it('shows overview section expanded by default', () => {
    render(<GameRules />)
    expect(screen.getByText('Game Overview')).toBeInTheDocument()
    expect(screen.getByText(/Coruscant Shift is a variant of Sabacc/)).toBeInTheDocument()
  })

  it('toggles sections when clicked', () => {
    render(<GameRules />)
    
    // Initially, components section should be collapsed
    expect(screen.queryByText('Circles, Triangles, and Squares')).not.toBeInTheDocument()
    
    // Click to expand components section
    fireEvent.click(screen.getByText('Game Components'))
    expect(screen.getByText('Circles, Triangles, and Squares')).toBeInTheDocument()
    
    // Click to collapse components section
    fireEvent.click(screen.getByText('Game Components'))
    expect(screen.queryByText('Circles, Triangles, and Squares')).not.toBeInTheDocument()
  })

  it('renders all major sections', () => {
    render(<GameRules />)
    
    expect(screen.getByText('Game Overview')).toBeInTheDocument()
    expect(screen.getByText('Game Components')).toBeInTheDocument()
    expect(screen.getByText('Game Phases')).toBeInTheDocument()
    expect(screen.getByText('Winning Conditions')).toBeInTheDocument()
    expect(screen.getByText('Game Setup & Structure')).toBeInTheDocument()
  })

  it('displays correct game information', () => {
    render(<GameRules />)
    
    // Expand components section
    fireEvent.click(screen.getByText('Game Components'))
    
    expect(screen.getByText('Circles, Triangles, and Squares')).toBeInTheDocument()
    expect(screen.getByText('Shows number values (0, 0, 5, -5, 10, -10)')).toBeInTheDocument()
    expect(screen.getByText('Shows suit (Square, Circle, Triangle)')).toBeInTheDocument()
  })

  it('displays winning conditions correctly', () => {
    render(<GameRules />)
    
    // Expand winning conditions section
    fireEvent.click(screen.getByText('Winning Conditions'))
    
    expect(screen.getByText(/Player with selection closest to target number/)).toBeInTheDocument()
    expect(screen.getByText(/Most cards of preferred suit wins/)).toBeInTheDocument()
  })
}) 