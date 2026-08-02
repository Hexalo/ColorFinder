import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  block?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  block = false,
  className = '',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${className}`}
      {...rest}
    >
      {icon ? <span className="btn__icon">{icon}</span> : null}
      {children}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls must still be announced to screen readers. */
  label: string
  variant?: 'ghost' | 'solid' | 'danger'
  size?: 'sm' | 'md'
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-btn icon-btn--${variant} icon-btn--${size} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
