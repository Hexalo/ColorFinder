import { useEffect, useRef } from 'react'
import { useDragValue } from '../../hooks/useDragValue'
import { clamp } from '../../services/color.service'
import type { Hsv } from '../../types'
import './ColorWheel.css'

interface ColorWheelProps {
  hsv: Hsv
  onChange(patch: Partial<Hsv>): void
  size?: number
}

/**
 * HSV colour wheel: hue around the circumference, saturation along the radius,
 * with value on the bar beside it.
 *
 * The disc is painted pixel by pixel because no CSS gradient can express
 * "hue by angle, saturation by radius" — a conic gradient only gets the hue
 * right at full saturation.
 */
export function ColorWheel({ hsv, onChange, size = 236 }: ColorWheelProps): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = canvas.current
    if (!node) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pixels = Math.round(size * dpr)
    node.width = pixels
    node.height = pixels

    const context = node.getContext('2d')
    if (!context) return

    const image = context.createImageData(pixels, pixels)
    const data = image.data
    const centre = pixels / 2
    const value = hsv.v / 100

    for (let y = 0; y < pixels; y += 1) {
      for (let x = 0; x < pixels; x += 1) {
        const dx = x - centre + 0.5
        const dy = y - centre + 0.5
        const distance = Math.sqrt(dx * dx + dy * dy) / centre
        const offset = (y * pixels + x) * 4

        if (distance > 1) {
          data[offset + 3] = 0
          continue
        }

        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
        const saturation = distance

        // Inline HSV -> RGB: a converter call per pixel would cost ~50x more.
        const sector = hue / 60
        const index = Math.floor(sector) % 6
        const fraction = sector - Math.floor(sector)
        const p = value * (1 - saturation)
        const q = value * (1 - saturation * fraction)
        const t = value * (1 - saturation * (1 - fraction))

        let r = 0
        let g = 0
        let b = 0
        switch (index) {
          case 0:
            ;[r, g, b] = [value, t, p]
            break
          case 1:
            ;[r, g, b] = [q, value, p]
            break
          case 2:
            ;[r, g, b] = [p, value, t]
            break
          case 3:
            ;[r, g, b] = [p, q, value]
            break
          case 4:
            ;[r, g, b] = [t, p, value]
            break
          default:
            ;[r, g, b] = [value, p, q]
        }

        data[offset] = r * 255
        data[offset + 1] = g * 255
        data[offset + 2] = b * 255
        // Feather the last pixel ring so the disc edge is not staircased.
        data[offset + 3] = distance > 0.985 ? (1 - distance) / 0.015 * 255 : 255
      }
    }

    context.putImageData(image, 0, 0)
  }, [hsv.v, size])

  const { handlers } = useDragValue(({ x, y }, event) => {
    const dx = x - 0.5
    const dy = y - 0.5
    const distance = Math.sqrt(dx * dx + dy * dy) * 2
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
    onChange({
      h: hue,
      // Holding Shift keeps saturation and only sweeps the hue.
      s: event.shiftKey ? hsv.s : clamp(distance * 100, 0, 100)
    })
  })

  const radians = (hsv.h * Math.PI) / 180
  const radius = (hsv.s / 100) * 50
  const handleLeft = 50 + Math.cos(radians) * radius
  const handleTop = 50 + Math.sin(radians) * radius

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const step = event.shiftKey ? 10 : 1
    switch (event.key) {
      case 'ArrowLeft':
        onChange({ h: (hsv.h - step + 360) % 360 })
        break
      case 'ArrowRight':
        onChange({ h: (hsv.h + step) % 360 })
        break
      case 'ArrowUp':
        onChange({ s: clamp(hsv.s + step, 0, 100) })
        break
      case 'ArrowDown':
        onChange({ s: clamp(hsv.s - step, 0, 100) })
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <div className="wheel" style={{ '--wheel-size': `${size}px` } as React.CSSProperties}>
      <div
        className="wheel__disc"
        role="slider"
        tabIndex={0}
        aria-label="Hue and saturation wheel"
        aria-valuetext={`Hue ${Math.round(hsv.h)} degrees, saturation ${Math.round(hsv.s)}%`}
        onKeyDown={onKeyDown}
        {...handlers}
      >
        <canvas ref={canvas} style={{ width: size, height: size }} />
        <span
          className="wheel__handle"
          style={{ left: `${handleLeft}%`, top: `${handleTop}%` }}
        />
      </div>

      <ValueBar hsv={hsv} onChange={onChange} height={size} />
    </div>
  )
}

function ValueBar({
  hsv,
  onChange,
  height
}: {
  hsv: Hsv
  onChange(patch: Partial<Hsv>): void
  height: number
}): React.JSX.Element {
  const { handlers } = useDragValue(({ y }) => onChange({ v: clamp((1 - y) * 100, 0, 100) }))

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const step = event.shiftKey ? 10 : 1
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      onChange({ v: clamp(hsv.v + step, 0, 100) })
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      onChange({ v: clamp(hsv.v - step, 0, 100) })
    } else {
      return
    }
    event.preventDefault()
  }

  return (
    <div
      className="wheel__value"
      style={{
        height,
        background: `linear-gradient(to top, #000, hsl(${hsv.h} ${hsv.s}% 50%))`
      }}
      role="slider"
      tabIndex={0}
      aria-label="Value"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.v)}
      onKeyDown={onKeyDown}
      {...handlers}
    >
      <span className="wheel__value-handle" style={{ top: `${100 - hsv.v}%` }} />
    </div>
  )
}
