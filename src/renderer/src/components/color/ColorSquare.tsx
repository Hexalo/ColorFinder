import { useDragValue } from '../../hooks/useDragValue'
import { clamp } from '../../services/color.service'
import type { Hsv } from '../../types'
import './ColorSquare.css'

interface ColorSquareProps {
  hsv: Hsv
  onChange(patch: Partial<Hsv>): void
  size?: number
}

/**
 * The Photoshop-style picker: saturation across, value down, hue on the bar
 * underneath. Unlike the wheel this needs no canvas — two stacked CSS
 * gradients describe it exactly.
 */
export function ColorSquare({ hsv, onChange, size = 236 }: ColorSquareProps): React.JSX.Element {
  const { handlers } = useDragValue(({ x, y }) =>
    onChange({ s: clamp(x * 100, 0, 100), v: clamp((1 - y) * 100, 0, 100) })
  )

  const onSquareKeyDown = (event: React.KeyboardEvent): void => {
    const step = event.shiftKey ? 10 : 1
    switch (event.key) {
      case 'ArrowLeft':
        onChange({ s: clamp(hsv.s - step, 0, 100) })
        break
      case 'ArrowRight':
        onChange({ s: clamp(hsv.s + step, 0, 100) })
        break
      case 'ArrowUp':
        onChange({ v: clamp(hsv.v + step, 0, 100) })
        break
      case 'ArrowDown':
        onChange({ v: clamp(hsv.v - step, 0, 100) })
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <div className="square" style={{ width: size }}>
      <div
        className="square__area"
        style={{ height: size, background: `hsl(${hsv.h} 100% 50%)` }}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and value"
        aria-valuetext={`Saturation ${Math.round(hsv.s)}%, value ${Math.round(hsv.v)}%`}
        onKeyDown={onSquareKeyDown}
        {...handlers}
      >
        <div className="square__white" />
        <div className="square__black" />
        <span
          className="square__handle"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
        />
      </div>

      <HueBar hue={hsv.h} onChange={(h) => onChange({ h })} />
    </div>
  )
}

function HueBar({
  hue,
  onChange
}: {
  hue: number
  onChange(hue: number): void
}): React.JSX.Element {
  const { handlers } = useDragValue(({ x }) => onChange(clamp(x, 0, 1) * 360))

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const step = event.shiftKey ? 10 : 1
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onChange((hue + step) % 360)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      onChange((hue - step + 360) % 360)
    } else return
    event.preventDefault()
  }

  return (
    <div
      className="square__hue"
      role="slider"
      tabIndex={0}
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hue)}
      onKeyDown={onKeyDown}
      {...handlers}
    >
      <span className="square__hue-handle" style={{ left: `${(hue / 360) * 100}%` }} />
    </div>
  )
}
