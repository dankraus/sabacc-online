import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImperialInput from '../ImperialInput'

describe('ImperialInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  it('renders input with default props', () => {
    render(<ImperialInput {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('imperial-input')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('renders with label', () => {
    const label = 'Test Label'
    render(<ImperialInput {...defaultProps} label={label} />)
    
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(label)).toHaveClass('form-label')
  })

  it('renders without label when not provided', () => {
    render(<ImperialInput {...defaultProps} />)
    
    expect(screen.queryByText('Test Label')).not.toBeInTheDocument()
  })

  it('displays value correctly', () => {
    const value = 'test value'
    render(<ImperialInput {...defaultProps} value={value} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue(value)
  })

  it('calls onChange when input changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ImperialInput {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'a')
    
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('renders with placeholder', () => {
    const placeholder = 'Enter text here'
    render(<ImperialInput {...defaultProps} placeholder={placeholder} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder', placeholder)
  })

  it('renders with error message', () => {
    const error = 'This field is required'
    render(<ImperialInput {...defaultProps} error={error} />)
    
    expect(screen.getByText(error)).toBeInTheDocument()
    expect(screen.getByText(error)).toHaveStyle('color: var(--imperial-red)')
  })

  it('does not render error when not provided', () => {
    render(<ImperialInput {...defaultProps} />)
    
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
  })

  it('renders disabled input', () => {
    render(<ImperialInput {...defaultProps} disabled={true} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('renders enabled input by default', () => {
    render(<ImperialInput {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    expect(input).not.toBeDisabled()
  })

  it('applies custom className', () => {
    const customClass = 'custom-input'
    render(<ImperialInput {...defaultProps} className={customClass} />)
    
    const formGroup = screen.getByRole('textbox').closest('.form-group')
    expect(formGroup).toHaveClass(customClass)
  })

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' }
    render(<ImperialInput {...defaultProps} style={customStyle} />)
    
    const formGroup = screen.getByRole('textbox').closest('.form-group')
    expect(formGroup).toHaveStyle('background-color: rgb(255, 0, 0)')
  })



  it('renders password input type', () => {
    render(<ImperialInput {...defaultProps} type="password" />)
    
    const input = screen.getByDisplayValue('')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('renders email input type', () => {
    render(<ImperialInput {...defaultProps} type="email" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('renders with autoComplete attribute', () => {
    const autoComplete = 'username'
    render(<ImperialInput {...defaultProps} autoComplete={autoComplete} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('autoComplete', autoComplete)
  })

  it('handles multiple character input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ImperialInput {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'hello')
    
    expect(onChange).toHaveBeenCalledTimes(5)
    expect(onChange).toHaveBeenNthCalledWith(1, 'h')
    expect(onChange).toHaveBeenNthCalledWith(2, 'e')
    expect(onChange).toHaveBeenNthCalledWith(3, 'l')
    expect(onChange).toHaveBeenNthCalledWith(4, 'l')
    expect(onChange).toHaveBeenNthCalledWith(5, 'o')
  })

  it('handles backspace and deletion', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ImperialInput {...defaultProps} onChange={onChange} value="hello" />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, '{backspace}')
    
    expect(onChange).toHaveBeenCalledWith('hell')
  })

  it('handles paste events', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ImperialInput {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.paste('pasted text')
    
    expect(onChange).toHaveBeenCalledWith('pasted text')
  })

  it('handles clear events', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ImperialInput {...defaultProps} onChange={onChange} value="test" />)
    
    const input = screen.getByRole('textbox')
    await user.clear(input)
    
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('renders with maxLength attribute', () => {
    const maxLength = 10
    render(<ImperialInput {...defaultProps} maxLength={maxLength} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('maxLength', maxLength.toString())
  })

  it('renders error with correct styling', () => {
    const error = 'Error message'
    render(<ImperialInput {...defaultProps} error={error} />)
    
    const errorElement = screen.getByText(error)
    expect(errorElement).toHaveStyle('font-size: 0.8rem')
    expect(errorElement).toHaveStyle('margin-top: 0.5rem')
    expect(errorElement).toHaveStyle('text-align: left')
  })

  it('maintains focus after typing', async () => {
    const user = userEvent.setup()
    render(<ImperialInput {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.type(input, 'test')
    
    expect(input).toHaveFocus()
  })
}) 