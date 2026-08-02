import './AppMark.css'

interface AppMarkProps {
  size?: number
  /** Slow hue drift on the rainbow — used by the splash, off in the sidebar. */
  animated?: boolean
  className?: string
}

/**
 * The app mark: Hugeicons' colour-picker glyph on a rainbow field.
 *
 * The glyph path is the free `ColorPickerIcon` from `@hugeicons/core-free-icons`,
 * inlined here (rather than rendered through the React component) so the exact
 * same artwork can be reused for the packaged app icon — see
 * `scripts/generate-icon.mjs`, which renders this shape at 1024px.
 */
export const COLOR_PICKER_PATHS = [
  'M13.435 7L7.15915 13.2759M7.15915 13.2759L4.82728 15.6077C3.92569 16.5093 3.47489 16.9601 3.23745 17.5334C3 18.1066 3 18.7441 3 20.0192V21H3.98082C5.25586 21 5.89338 21 6.46663 20.7626C7.03988 20.5251 7.49068 20.0743 8.39227 19.1727L14.2891 13.2759M7.15915 13.2759H14.2891M14.2891 13.2759L17 10.565',
  'M19.2087 8.38869L20.82 10M19.2087 8.38869L20.0705 7.52682C20.363 7.23431 20.5093 7.08805 20.611 6.94529C21.1297 6.21676 21.1297 5.23953 20.611 4.511C20.5093 4.36824 20.363 4.22198 20.0705 3.92947C19.778 3.63697 19.6318 3.4907 19.489 3.38905C18.7605 2.87032 17.7832 2.87032 17.0547 3.38905C16.912 3.4907 16.7657 3.63695 16.4732 3.92947L15.6113 4.79133M19.2087 8.38869L15.6113 4.79133M14 3.18002L15.6113 4.79133'
] as const

/** Spectrum stops, shared with the icon generator. */
export const RAINBOW_STOPS = [
  '#ff5f6d',
  '#ff9f43',
  '#ffd93d',
  '#6bcB77',
  '#4d96ff',
  '#9b5de5',
  '#f15bb5'
] as const

export function AppMark({
  size = 24,
  animated = false,
  className = ''
}: AppMarkProps): React.JSX.Element {
  return (
    <span
      className={`app-mark ${animated ? 'is-animated' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <defs>
          <linearGradient id="app-mark-rainbow" x1="0" y1="0" x2="1" y2="1">
            {RAINBOW_STOPS.map((stop, index) => (
              <stop
                key={stop}
                offset={`${(index / (RAINBOW_STOPS.length - 1)) * 100}%`}
                stopColor={stop}
              />
            ))}
          </linearGradient>
        </defs>

        <rect width="24" height="24" rx="6.6" fill="url(#app-mark-rainbow)" />

        <g
          transform="translate(12 12) scale(0.72) translate(-12 -12)"
          fill="none"
          stroke="#fff"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {COLOR_PICKER_PATHS.map((path) => (
            <path key={path.slice(0, 12)} d={path} />
          ))}
        </g>
      </svg>
    </span>
  )
}
