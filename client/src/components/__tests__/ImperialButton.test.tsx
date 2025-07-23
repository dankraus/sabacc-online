import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImperialButton from '../ImperialButton'

describe('ImperialButton', () => {
  const defaultProps = {
    children: 'Click me',
  }

  it('renders button with default props', () => {
    render(<ImperialButton {...defaultProps} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
    expect(button).toHaveClass('imperial-button')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('renders with custom children', () => {
    render(<ImperialButton>Custom Text</ImperialButton>)
    
    expect(screen.getByText('Custom Text')).toBeInTheDocument()
  })

  it('renders with JSX children', () => {
    render(
      <ImperialButton>
        <span data-testid="icon">🚀</span>
        <span>Launch</span>
      </ImperialButton>
    )
    
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Launch')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ImperialButton {...defaultProps} onClick={onClick} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ImperialButton {...defaultProps} onClick={onClick} disabled={true} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders with primary variant', () => {
    render(<ImperialButton {...defaultProps} variant="primary" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('imperial-button--primary')
  })

  it('renders with danger variant', () => {
    render(<ImperialButton {...defaultProps} variant="danger" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('imperial-button--danger')
  })

  it('renders with success variant', () => {
    render(<ImperialButton {...defaultProps} variant="success" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('imperial-button--success')
  })

  it('renders with default variant (no additional class)', () => {
    render(<ImperialButton {...defaultProps} variant="default" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('imperial-button')
    expect(button).not.toHaveClass('imperial-button--default')
  })

  it('renders disabled button', () => {
    render(<ImperialButton {...defaultProps} disabled={true} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveStyle('opacity: 0.5')
    expect(button).toHaveStyle('cursor: not-allowed')
  })

  it('renders enabled button by default', () => {
    render(<ImperialButton {...defaultProps} />)
    
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('applies custom className', () => {
    const customClass = 'custom-button'
    render(<ImperialButton {...defaultProps} className={customClass} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass(customClass)
  })

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' }
    render(<ImperialButton {...defaultProps} style={customStyle} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveStyle('background-color: rgb(255, 0, 0)')
  })

  it('renders with submit type', () => {
    render(<ImperialButton {...defaultProps} type="submit" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('renders with reset type', () => {
    render(<ImperialButton {...defaultProps} type="reset" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'reset')
  })

  it('combines variant and custom classes', () => {
    const customClass = 'custom-button'
    render(
      <ImperialButton 
        {...defaultProps} 
        variant="primary" 
        className={customClass} 
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('imperial-button')
    expect(button).toHaveClass('imperial-button--primary')
    expect(button).toHaveClass(customClass)
  })

  it('combines custom style with disabled style', () => {
    const customStyle = { backgroundColor: 'blue' }
    render(
      <ImperialButton 
        {...defaultProps} 
        style={customStyle} 
        disabled={true} 
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveStyle('background-color: rgb(0, 0, 255)')
    expect(button).toHaveStyle('opacity: 0.5')
    expect(button).toHaveStyle('cursor: not-allowed')
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ImperialButton {...defaultProps} onClick={onClick} />)
    
    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')
    
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('handles space key press', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ImperialButton {...defaultProps} onClick={onClick} />)
    
    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard(' ')
    
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not handle keyboard events when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ImperialButton {...defaultProps} onClick={onClick} disabled={true} />)
    
    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')
    
    expect(onClick).not.toHaveBeenCalled()
  })

  it('maintains focus after click', async () => {
    const user = userEvent.setup()
    render(<ImperialButton {...defaultProps} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(button).toHaveFocus()
  })

  it('renders with complex children structure', () => {
    render(
      <ImperialButton>
        <div>
          <span>Icon</span>
          <strong>Bold Text</strong>
          <em>Italic Text</em>
        </div>
      </ImperialButton>
    )
    
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Bold Text')).toBeInTheDocument()
    expect(screen.getByText('Italic Text')).toBeInTheDocument()
  })

  it('handles multiple rapid clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ImperialButton {...defaultProps} onClick={onClick} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    await user.click(button)
    await user.click(button)
    
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('renders with all props combined', () => {
    const customStyle = { color: 'white' }
    const customClass = 'test-class'
    
    render(
      <ImperialButton
        variant="primary"
        disabled={false}
        className={customClass}
        style={customStyle}
        type="submit"
      >
        Submit Form
      </ImperialButton>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Submit Form')
    expect(button).toHaveClass('imperial-button--primary')
    expect(button).toHaveClass(customClass)
    expect(button).toHaveStyle('color: rgb(255, 255, 255)')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).not.toBeDisabled()
  })
}) 