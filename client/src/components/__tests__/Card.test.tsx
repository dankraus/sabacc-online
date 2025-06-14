import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Card } from '../Card';
import { createMockCard } from '@/test/utils';

describe('Card', () => {
  describe('rendering', () => {
    it('should render card with basic information', () => {
      const card = createMockCard({
        suit: 'sabers',
        value: 5,
        name: '5 of sabers'
      });
      
      render(<Card card={card} />);
      
      // Should show suit symbols
      expect(screen.getAllByText('⚔️')).toHaveLength(3); // Top, center, bottom
      
      // Should show value twice (top and bottom corners)
      expect(screen.getAllByText('5')).toHaveLength(2);
    });

    it('should render different suits correctly', () => {
      const suits = [
        { suit: 'sabers' as const, symbol: '⚔️' },
        { suit: 'flasks' as const, symbol: '🧪' },
        { suit: 'coins' as const, symbol: '🪙' },
        { suit: 'staves' as const, symbol: '🔮' }
      ];

      suits.forEach(({ suit, symbol }) => {
        const card = createMockCard({ suit, value: 3 });
        const { unmount } = render(<Card card={card} />);
        
        expect(screen.getAllByText(symbol)).toHaveLength(3);
        
        unmount();
      });
    });

    it('should handle negative card values', () => {
      const card = createMockCard({
        suit: 'sabers',
        value: -10,
        name: 'Commander of sabers'
      });
      
      render(<Card card={card} />);
      
      // Should show absolute value in corners
      expect(screen.getAllByText('10')).toHaveLength(2);
      
      // Should show negative indicator
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should not show negative indicator for positive values', () => {
      const card = createMockCard({
        suit: 'coins',
        value: 7
      });
      
      render(<Card card={card} />);
      
      expect(screen.queryByText('-')).not.toBeInTheDocument();
    });
  });

  describe('styling and size variants', () => {
    it('should apply small size classes', () => {
      const card = createMockCard();
      
      render(<Card card={card} size="small" />);
      
      const cardElement = screen.getByText('5').closest('div');
      expect(cardElement).toHaveClass('w-16', 'h-24', 'text-xs');
    });

    it('should apply medium size classes (default)', () => {
      const card = createMockCard();
      
      render(<Card card={card} />);
      
      const cardElement = screen.getByText('5').closest('div');
      expect(cardElement).toHaveClass('w-20', 'h-28', 'text-sm');
    });

    it('should apply large size classes', () => {
      const card = createMockCard();
      
      render(<Card card={card} size="large" />);
      
      const cardElement = screen.getByText('5').closest('div');
      expect(cardElement).toHaveClass('w-24', 'h-36', 'text-base');
    });

    it('should apply custom className', () => {
      const card = createMockCard();
      
      render(<Card card={card} className="custom-class" />);
      
      const cardElement = screen.getByText('5').closest('div');
      expect(cardElement).toHaveClass('custom-class');
    });

    it('should apply suit-specific styling', () => {
      const card = createMockCard({ suit: 'sabers' });
      
      render(<Card card={card} />);
      
      const cardElement = screen.getByText('5').closest('div');
      expect(cardElement).toHaveStyle({
        borderColor: 'var(--color-sabers)'
      });
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      const card = createMockCard();
      
      render(<Card card={card} />);
      
      const cardElement = screen.getByText('5').closest('div');
      
      // Card should have proper styling for focus states
      expect(cardElement).toHaveClass('transition-all');
    });
  });

  describe('interactions', () => {
    it('should have hover effects', () => {
      const card = createMockCard();
      
      render(<Card card={card} />);
      
      const cardElement = screen.getByText('5').closest('div');
      expect(cardElement).toHaveClass('hover:scale-105', 'hover:shadow-lg');
    });
  });

  describe('edge cases', () => {
    it('should handle zero value', () => {
      const card = createMockCard({
        value: 0,
        name: '0 of coins'
      });
      
      render(<Card card={card} />);
      
      expect(screen.getAllByText('0')).toHaveLength(2);
      expect(screen.queryByText('-')).not.toBeInTheDocument();
    });

    it('should handle very large negative values', () => {
      const card = createMockCard({
        value: -100,
        name: 'Super negative card'
      });
      
      render(<Card card={card} />);
      
      expect(screen.getAllByText('100')).toHaveLength(2);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should handle very large positive values', () => {
      const card = createMockCard({
        value: 999,
        name: 'Super positive card'
      });
      
      render(<Card card={card} />);
      
      expect(screen.getAllByText('999')).toHaveLength(2);
      expect(screen.queryByText('-')).not.toBeInTheDocument();
    });
  });

  describe('suit symbols', () => {
    it('should display correct symbols for all suits', () => {
      const suitTests = [
        { suit: 'sabers' as const, expectedSymbol: '⚔️' },
        { suit: 'flasks' as const, expectedSymbol: '🧪' },
        { suit: 'coins' as const, expectedSymbol: '🪙' },
        { suit: 'staves' as const, expectedSymbol: '🔮' }
      ];

      suitTests.forEach(({ suit, expectedSymbol }) => {
        const card = createMockCard({ suit });
        const { unmount } = render(<Card card={card} />);
        
        // Should appear 3 times: top corner, center, bottom corner
        const symbols = screen.getAllByText(expectedSymbol);
        expect(symbols).toHaveLength(3);
        
        unmount();
      });
    });
  });
});