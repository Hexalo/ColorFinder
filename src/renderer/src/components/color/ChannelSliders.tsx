import { useEffect, useRef, useState } from 'react'
import { channelGradient } from '../../data/colorSpaces'
import { useDragValue } from '../../hooks/useDragValue'
import { clamp, round } from '../../services/color.service'
import type { ChannelDef, ColorSpaceDef } from '../../types'
import './ChannelSliders.css'

interface ChannelSlidersProps {
  space: ColorSpaceDef
  hex: string
  /** Preserves the hue of greys, where most spaces report no hue at all. */
  hueHint: number
  onChange(hex: string): void
}

/**
 * One gradient slider per channel of the active colour space. The gradient is
 * sampled from the space itself, so adding a space needs no work here.
 */
export function ChannelSliders({
  space,
  hex,
  hueHint,
  onChange
}: ChannelSlidersProps): React.JSX.Element {
  /**
   * The channels are the source of truth while you are dragging, not the hex.
   *
   * Going channels -> hex -> channels is lossy: the hex is 8-bit, and at the
   * edges whole channels collapse — drag Lightness to 0 and the hex is
   * `#000000`, which has no hue and no saturation to read back. Deriving the
   * sliders from the hex on every move therefore yanked the *other* handles
   * around. Keeping the values here means only the channel you touch moves.
   */
  const [values, setValues] = useState(() => space.toValues(hex, hueHint))
  const valuesRef = useRef(values)
  valuesRef.current = values

  /** The last hex these sliders produced, so we can ignore its echo. */
  const lastEmitted = useRef<string | null>(null)
  const lastSpace = useRef(space.id)

  useEffect(() => {
    /*
     * A space switch must always re-read, even when the hex is our own echo.
     * Otherwise the old space's numbers stay in state and get drawn against
     * the new space's ranges — RGB's 0–255 on Display P3's 0–1 track pins
     * every handle to the far right.
     */
    const spaceChanged = lastSpace.current !== space.id
    lastSpace.current = space.id

    if (!spaceChanged && hex === lastEmitted.current) return
    lastEmitted.current = null
    setValues(space.toValues(hex, hueHint))
    // `hueHint` deliberately excluded: it only matters for the initial read,
    // and reacting to it would re-seed the sliders mid-drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, space])

  /*
   * The re-seeding effect only runs *after* render, so on the first frame of a
   * space switch the state still holds the previous space's channels. CMYK has
   * four and every other space has three, so that frame would read
   * `values[3]` as undefined and blow up. Fall back to a fresh read whenever
   * the lengths disagree.
   */
  const shown = values.length === space.channels.length ? values : space.toValues(hex, hueHint)

  const setChannel = (index: number, value: number): void => {
    const next = [...(valuesRef.current.length === space.channels.length ? valuesRef.current : shown)]
    next[index] = value
    valuesRef.current = next
    setValues(next)

    const nextHex = space.toHex(next)
    lastEmitted.current = nextHex
    onChange(nextHex)
  }

  return (
    <div className="channels">
      {space.channels.map((channel, index) => (
        <ChannelSlider
          key={`${space.id}:${channel.key}`}
          channel={channel}
          value={shown[index]}
          stops={channelGradient(space, shown, index)}
          onChange={(value) => setChannel(index, value)}
        />
      ))}
    </div>
  )
}

interface ChannelSliderProps {
  channel: ChannelDef
  value: number
  stops: string[]
  onChange(value: number): void
}

function ChannelSlider({ channel, value, stops, onChange }: ChannelSliderProps): React.JSX.Element {
  const { min, max, step, decimals, label, unit } = channel

  // The number field is free-typed, so it keeps its own draft until it blurs.
  const [draft, setDraft] = useState(() => value.toFixed(decimals))
  useEffect(() => setDraft(value.toFixed(decimals)), [value, decimals])

  const { handlers } = useDragValue(({ x }) => {
    const raw = min + clamp(x, 0, 1) * (max - min)
    onChange(round(Math.round(raw / step) * step, decimals))
  })

  const commitDraft = (): void => {
    const parsed = Number(draft.replace(',', '.'))
    if (Number.isFinite(parsed)) onChange(round(clamp(parsed, min, max), decimals))
    else setDraft(value.toFixed(decimals))
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const jump = (event.shiftKey ? 10 : 1) * step
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      onChange(round(clamp(value + jump, min, max), decimals))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      onChange(round(clamp(value - jump, min, max), decimals))
    } else return
    event.preventDefault()
  }

  const percent = ((value - min) / (max - min)) * 100

  return (
    <div className="channel">
      <span className="channel__label">{label}</span>

      <div
        className="channel__track"
        style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit ?? ''}`}
        onKeyDown={onKeyDown}
        {...handlers}
      >
        <span className="channel__handle" style={{ left: `${clamp(percent, 0, 100)}%` }} />
      </div>

      <div className="channel__field">
        <input
          className="mono"
          value={draft}
          inputMode="decimal"
          aria-label={`${label} value`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        {unit ? <span className="channel__unit">{unit}</span> : null}
      </div>
    </div>
  )
}
