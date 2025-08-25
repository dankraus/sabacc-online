import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DiceDisplay from '../DiceDisplay';

// Define the type locally for testing
interface DiceRoll {
  goldValue: number;
  silverSuit: 'Circle' | 'Triangle' | 'Square';
}

describe('DiceDisplay', () => {
  const mockDiceRoll: DiceRoll = {
    goldValue: 7,
    silverSuit: 'Circle'
  };

  it('renders dice display with title', () => {
    render(<DiceDisplay diceRoll={null} />);
    expect(screen.getByText('Dice Roll')).toBeInTheDocument();
  });

  it('shows question marks when no dice roll is provided', () => {
    render(<DiceDisplay diceRoll={null} />);
    expect(screen.getAllByText('?')).toHaveLength(2);
  });

  it('displays gold die value correctly', () => {
    render(<DiceDisplay diceRoll={mockDiceRoll} />);
    const goldDie = screen.getByTestId('gold-die').closest('.dice');
    expect(goldDie).toHaveTextContent('7');
  });

  it('displays silver die suit symbol correctly', () => {
    render(<DiceDisplay diceRoll={mockDiceRoll} />);
    expect(screen.getByText('●')).toBeInTheDocument();
  });

  it('displays suit name correctly', () => {
    render(<DiceDisplay diceRoll={mockDiceRoll} />);
    expect(screen.getByText('Circle')).toBeInTheDocument();
  });

  it('shows rolling indicator when isRolling is true', () => {
    render(<DiceDisplay diceRoll={null} isRolling={true} />);
    expect(screen.getByText('Rolling...')).toBeInTheDocument();
  });

  it('does not show rolling indicator when isRolling is false', () => {
    render(<DiceDisplay diceRoll={null} isRolling={false} />);
    expect(screen.queryByText('Rolling...')).not.toBeInTheDocument();
  });

  it('displays summary when dice roll is provided', () => {
    render(<DiceDisplay diceRoll={mockDiceRoll} />);
    expect(screen.getByText('Target Number:')).toBeInTheDocument();
    expect(screen.getByText('Preferred Suit:')).toBeInTheDocument();
  });

  it('does not display summary when no dice roll is provided', () => {
    render(<DiceDisplay diceRoll={null} />);
    expect(screen.queryByText('Target Number:')).not.toBeInTheDocument();
    expect(screen.queryByText('Preferred Suit:')).not.toBeInTheDocument();
  });

  it('displays correct suit symbols for all suits', () => {
    const triangleRoll: DiceRoll = { goldValue: 3, silverSuit: 'Triangle' };
    const squareRoll: DiceRoll = { goldValue: 5, silverSuit: 'Square' };

    const { rerender } = render(<DiceDisplay diceRoll={triangleRoll} />);
    expect(screen.getByText('▲')).toBeInTheDocument();

    rerender(<DiceDisplay diceRoll={squareRoll} />);
    expect(screen.getByText('■')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<DiceDisplay diceRoll={null} className="custom-class" />);
    const diceDisplay = screen.getByText('Dice Roll').closest('.dice-display');
    expect(diceDisplay).toHaveClass('custom-class');
  });

  it('renders with correct structure', () => {
    render(<DiceDisplay diceRoll={mockDiceRoll} />);
    
    // Check for main container
    expect(screen.getByText('Dice Roll').closest('.dice-display')).toBeInTheDocument();
    
    // Check for dice containers
    expect(screen.getByTestId('silver-die')).toBeInTheDocument();
    expect(screen.getByTestId('gold-die')).toBeInTheDocument();
    
    // Check for die values
    const goldDie = screen.getByTestId('gold-die').closest('.dice');
    const silverDie = screen.getByTestId('silver-die').closest('.dice');
    expect(goldDie).toHaveTextContent('7');
    expect(silverDie).toHaveTextContent('●');
  });
});
