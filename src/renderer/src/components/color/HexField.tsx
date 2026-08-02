import { useEffect, useState } from 'react'
import { parseColor } from '../../services/color.service'
import './HexField.css'

interface HexFieldProps {
  value: string
  onChange(hex: string): void
  size?: 'sm' | 'md'
  ariaLabel?: string
  className?: string
}

/**
 * Free-typed colour field. Keeps its own draft so half-typed input like `#ff`
 * is not rejected mid-keystroke; commits on blur or Enter, and reverts on
 * Escape. Accepts anything culori can parse, not just hex.
 */
export function HexField({
  value,
  onChange,
  size = 'md',
  ariaLabel = 'Hex value',
  className = ''
}: HexFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(value)
  const [invalid, setInvalid] = useState(false)

  // Follow the colour when it changes from elsewhere (wheel, eyedropper…).
  useEffect(() => {
    setDraft(value)
    setInvalid(false)
  }, [value])

  const commit = (): void => {
    const parsed = parseColor(draft)
    if (parsed) {
      onChange(parsed)
      setInvalid(false)
    } else {
      setInvalid(true)
    }
  }

  return (
    <input
      className={`hex-field hex-field--${size} mono ${invalid ? 'is-invalid' : ''} ${className}`}
      value={draft}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      spellCheck={false}
      autoComplete="off"
      placeholder="#b06a45"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') {
          setDraft(value)
          setInvalid(false)
        }
      }}
    />
  )
}
