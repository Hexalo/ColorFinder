import { useEffect, useMemo, useRef } from 'react'
import { useDragValue } from '../../hooks/useDragValue'
import {
  chromaOf,
  clamp,
  hueOf,
  lightnessOf,
  maxChromaAt,
  readableTextOn,
  toHex
} from '../../services/color.service'
import { nameColor } from '../../services/naming.service'
import './HarmonyWheel.css'

interface HarmonyWheelProps {
  colors: string[]
  locked?: boolean[]
  /**
   * `rule` — the palette is derived from a base colour, so dragging any point
   * turns the whole set and keeps the harmony's angles intact.
   * `free`  — each point moves on its own.
   */
  mode: 'rule' | 'free'
  /** Index of the colour the rule is built from, ringed so it can be found. */
  base?: number
  /** Absolute target for the dragged point, in OKLCH polar coordinates. */
  onMove(index: number, hue: number, chroma: number): void
  size?: number
}

/** Hue stops for the backdrop. 36 is smooth enough at this size. */
const HUE_STOPS = 36
/** Lightness the reference disc is drawn at. */
const DISC_LIGHTNESS = 0.7

/**
 * Polar view of a palette: OKLCH hue around the rim, chroma along the radius.
 *
 * The same space the harmonies are computed in, so a triadic really does show
 * as three evenly spaced dots — which an HSL wheel would misrepresent.
 *
 * The radius is normalised **per point** by the chroma sRGB can actually reach
 * at that colour's lightness and hue. A single flat maximum would strand most
 * hues well short of the rim: at L 0.7 the cyans top out at roughly a third of
 * what the magentas manage.
 */
export function HarmonyWheel({
  colors,
  locked,
  mode,
  base,
  onMove,
  size = 220
}: HarmonyWheelProps): React.JSX.Element {
  /** Which dot the current gesture grabbed. Latched on the first event. */
  const grabbed = useRef<number | null>(null)

  /**
   * Backdrop as a conic gradient rather than a painted canvas: 36 culori calls
   * once, instead of one per pixel on every render.
   */
  const wheelBackground = useMemo(() => {
    const stops = Array.from({ length: HUE_STOPS + 1 }, (_, index) => {
      const hue = (index / HUE_STOPS) * 360
      const color = toHex({
        mode: 'oklch',
        l: DISC_LIGHTNESS,
        c: maxChromaAt(DISC_LIGHTNESS, hue),
        h: hue
      })
      return `${color} ${hue}deg`
    })
    // `from 0deg` puts hue 0 at the top and runs clockwise, matching the dot
    // maths below.
    return `conic-gradient(from 0deg, ${stops.join(', ')})`
  }, [])

  const points = colors.map((hex, index) => {
    const hue = hueOf(hex)
    const ceiling = maxChromaAt(lightnessOf(hex), hue)
    const radius = ceiling > 0 ? clamp(chromaOf(hex) / ceiling, 0, 1) : 0
    // Screen space: 0° at the top, growing clockwise.
    const radians = ((hue - 90) * Math.PI) / 180
    return {
      hex,
      index,
      hue,
      radius,
      x: 0.5 + (Math.cos(radians) * radius) / 2,
      y: 0.5 + (Math.sin(radians) * radius) / 2,
      locked: locked?.[index] ?? false
    }
  })

  const pointsRef = useRef(points)
  pointsRef.current = points

  /** Radius 0–1 -> a chroma this colour can actually hold at that hue. */
  const chromaFor = (index: number, hue: number, radius: number): number => {
    const hex = colors[index]
    return radius * maxChromaAt(hex ? lightnessOf(hex) : DISC_LIGHTNESS, hue)
  }

  const { dragging, handlers } = useDragValue(({ x, y }) => {
    const dx = x - 0.5
    const dy = y - 0.5
    const hue = ((((Math.atan2(dy, dx) * 180) / Math.PI + 90) % 360) + 360) % 360
    const radius = clamp(Math.sqrt(dx * dx + dy * dy) * 2, 0, 1)

    // The disc owns the gesture — grabbing the dot itself would make
    // `useDragValue` measure against the dot's own tiny box.
    if (grabbed.current === null) {
      let nearest = 0
      let best = Infinity
      for (const point of pointsRef.current) {
        const distance = (point.x - x) ** 2 + (point.y - y) ** 2
        if (distance < best) {
          best = distance
          nearest = point.index
        }
      }
      grabbed.current = nearest
    }

    onMove(grabbed.current, hue, chromaFor(grabbed.current, hue, radius))
  })

  useEffect(() => {
    if (!dragging) grabbed.current = null
  }, [dragging])

  const onKeyDown = (index: number) => (event: React.KeyboardEvent): void => {
    const point = pointsRef.current[index]
    const step = event.shiftKey ? 10 : 2
    const move = (hue: number, radius: number): void =>
      onMove(index, hue, chromaFor(index, hue, clamp(radius, 0, 1)))

    switch (event.key) {
      case 'ArrowLeft':
        move(point.hue - step, point.radius)
        break
      case 'ArrowRight':
        move(point.hue + step, point.radius)
        break
      case 'ArrowUp':
        move(point.hue, point.radius + step / 100)
        break
      case 'ArrowDown':
        move(point.hue, point.radius - step / 100)
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <div className="harmony-wheel">
      <div
        className="harmony-wheel__disc"
        style={{ width: size, height: size, background: wheelBackground }}
        {...handlers}
      >
        {/* Chroma falls to zero at the centre. */}
        <span className="harmony-wheel__desaturate" />

        {/* Spokes joining each colour to the middle, to read the spacing. */}
        <svg className="harmony-wheel__spokes" viewBox="0 0 100 100" aria-hidden="true">
          {points.map((point) => (
            <line
              key={point.index}
              x1="50"
              y1="50"
              x2={point.x * 100}
              y2={point.y * 100}
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="0.7"
            />
          ))}
        </svg>

        {points.map((point) => (
          <button
            key={point.index}
            type="button"
            className={`harmony-wheel__point ${point.locked ? 'is-locked' : ''} ${
              point.index === base ? 'is-base' : ''
            }`}
            style={{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
              background: point.hex,
              color: readableTextOn(point.hex)
            }}
            title={`${nameColor(point.hex)}${point.index === base ? ' (base)' : ''} — drag to move`}
            aria-label={`${
              point.index === base ? 'Base colour, ' : ''
            }${nameColor(point.hex)}, hue ${Math.round(point.hue)} degrees`}
            onKeyDown={onKeyDown(point.index)}
          >
            {point.index + 1}
          </button>
        ))}
      </div>

      <p className="harmony-wheel__hint">
        {mode === 'rule'
          ? 'Drag a point to turn the whole harmony — the rule keeps the angles.'
          : 'Drag each point on its own. Angle sets the hue, distance the chroma.'}
      </p>
    </div>
  )
}
