import { ReactNode } from 'react'

type StatusType = 'online' | 'offline' | 'waiting' | 'error'

interface StatusPanelProps {
  status: StatusType
  title: string
  message?: string
  children?: ReactNode
  className?: string
  style?: React.CSSProperties
}

const statusLabels = {
  online: 'System Online',
  offline: 'System Offline',
  waiting: 'Connecting...',
  error: 'System Error'
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  status,
  title,
  message,
  children,
  className = '',
  style = {}
}) => {
  return (
    <div 
      className={`control-panel ${className}`} 
      style={style}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '1rem',
        justifyContent: 'center'
      }}>
        <div className={`status-indicator status-indicator--${status}`}></div>
        <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
          {statusLabels[status]}
        </span>
      </div>
      
      <h2 className="imperial-subtitle" style={{ textAlign: 'center', margin: '1rem 0' }}>
        {title}
      </h2>
      
      {message && (
        <p style={{ 
          textAlign: 'center', 
          margin: '1rem 0',
          color: 'var(--imperial-accent)',
          fontSize: '1rem'
        }}>
          {message}
        </p>
      )}
      
      {children}
    </div>
  )
}

export default StatusPanel