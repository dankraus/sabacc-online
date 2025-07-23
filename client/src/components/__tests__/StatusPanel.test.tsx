import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusPanel from '../StatusPanel'

describe('StatusPanel', () => {
  it('renders with online status', () => {
    render(<StatusPanel status="online" title="Test Title" />)
    
    expect(screen.getByText('System Online')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toHaveClass('imperial-subtitle')
  })

  it('renders with offline status', () => {
    render(<StatusPanel status="offline" title="Offline Test" />)
    
    expect(screen.getByText('System Offline')).toBeInTheDocument()
    expect(screen.getByText('Offline Test')).toBeInTheDocument()
  })

  it('renders with waiting status', () => {
    render(<StatusPanel status="waiting" title="Waiting Test" />)
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    expect(screen.getByText('Waiting Test')).toBeInTheDocument()
  })

  it('renders with error status', () => {
    render(<StatusPanel status="error" title="Error Test" />)
    
    expect(screen.getByText('System Error')).toBeInTheDocument()
    expect(screen.getByText('Error Test')).toBeInTheDocument()
  })

  it('renders with message', () => {
    const message = 'This is a test message'
    render(
      <StatusPanel 
        status="online" 
        title="Test Title" 
        message={message} 
      />
    )
    
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <StatusPanel status="online" title="Test Title">
        <div data-testid="child-content">Child content</div>
      </StatusPanel>
    )
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-status-panel'
    render(
      <StatusPanel 
        status="online" 
        title="Test Title" 
        className={customClass}
      />
    )
    
    const panel = screen.getByText('System Online').closest('.control-panel')
    expect(panel).toHaveClass(customClass)
  })

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' }
    render(
      <StatusPanel 
        status="online" 
        title="Test Title" 
        style={customStyle}
      />
    )
    
    const panel = screen.getByText('System Online').closest('.control-panel')
    expect(panel).toHaveStyle('background-color: rgb(255, 0, 0)')
  })

  it('renders status indicator with correct class', () => {
    render(<StatusPanel status="online" title="Test Title" />)
    
    const statusIndicator = document.querySelector('.status-indicator')
    expect(statusIndicator).toHaveClass('status-indicator--online')
  })

  it('renders status indicator with offline class', () => {
    render(<StatusPanel status="offline" title="Test Title" />)
    
    const statusIndicator = document.querySelector('.status-indicator')
    expect(statusIndicator).toHaveClass('status-indicator--offline')
  })

  it('renders status indicator with waiting class', () => {
    render(<StatusPanel status="waiting" title="Test Title" />)
    
    const statusIndicator = document.querySelector('.status-indicator')
    expect(statusIndicator).toHaveClass('status-indicator--waiting')
  })

  it('renders status indicator with error class', () => {
    render(<StatusPanel status="error" title="Test Title" />)
    
    const statusIndicator = document.querySelector('.status-indicator')
    expect(statusIndicator).toHaveClass('status-indicator--error')
  })

  it('does not render message when not provided', () => {
    render(<StatusPanel status="online" title="Test Title" />)
    
    // Should not have any paragraph elements with the message styling
    const messageElements = document.querySelectorAll('p')
    expect(messageElements).toHaveLength(0)
  })

  it('renders title with correct styling', () => {
    render(<StatusPanel status="online" title="Test Title" />)
    
    const title = screen.getByText('Test Title')
    expect(title).toHaveClass('imperial-subtitle')
    expect(title).toHaveStyle('text-align: center')
  })

  it('renders status label with correct styling', () => {
    render(<StatusPanel status="online" title="Test Title" />)
    
    const statusLabel = screen.getByText('System Online')
    expect(statusLabel).toHaveStyle('font-weight: bold')
    expect(statusLabel).toHaveStyle('text-transform: uppercase')
  })
}) 