import { ChangeEvent } from 'react'

interface ImperialInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  maxLength?: number
  type?: 'text' | 'password' | 'email'
  autoComplete?: string
}

const ImperialInput: React.FC<ImperialInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  className = '',
  style = {},
  maxLength,
  type = 'text',
  autoComplete
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={`form-group ${className}`} style={style}>
      {label && (
        <label className="form-label">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="imperial-input"
        disabled={disabled}
        maxLength={maxLength}
        autoComplete={autoComplete}
      />
      {error && (
        <div style={{ 
          color: 'var(--imperial-red)', 
          fontSize: '0.8rem', 
          marginTop: '0.5rem',
          textAlign: 'left'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

export default ImperialInput