import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import './Field.css'

interface FieldShellProps {
  label: string
  hint?: string
  children: (id: string) => ReactNode
}

/** Label + optional hint wrapper shared by every form control. */
export function Field({ label, hint, children }: FieldShellProps): React.JSX.Element {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return <input className={`text-input ${className}`} {...rest} />
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
}

export function Select({ options, className = '', ...rest }: SelectProps): React.JSX.Element {
  return (
    <div className={`select ${className}`}>
      <select {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg className="select__chevron" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M4 6.5 8 10.5 12 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  /**
   * `NoInfer` keeps `T` pinned to `value`/`options`. Without it, passing a
   * `setState` setter drags `SetStateAction<T>` into inference and `T` widens
   * to `string`.
   */
  onChange(value: NoInfer<T>): void
  ariaLabel: string
  size?: 'sm' | 'md'
}

/** Compact tab bar used for colour spaces, picker modes and theme choice. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md'
}: SegmentedProps<T>): React.JSX.Element {
  return (
    <div className={`segmented segmented--${size}`} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`segmented__item ${option.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface RangeProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange(value: number): void
  suffix?: string
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix
}: RangeProps): React.JSX.Element {
  const id = useId()
  return (
    <div className="range">
      <div className="range__head">
        <label htmlFor={id}>{label}</label>
        <span className="mono range__value">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="range__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
