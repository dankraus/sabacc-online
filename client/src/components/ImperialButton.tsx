import { ReactNode } from 'react'

interface ImperialButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger' | 'success'
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  type?: 'button' | 'submit' | 'reset'
}

const ImperialButton: React.FC<ImperialButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  disabled = false,
  className = '',
  style = {},
  type = 'button'
}) => {
  const variantClass = variant !== 'default' ? `imperial-button--${variant}` : ''
  const disabledStyle = disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}

  return (
    <button
      type={type}
      className={`imperial-button ${variantClass} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...style, ...disabledStyle }}
    >
      {children}
    </button>
  )
}

export default ImperialButton