import { useEffect, useRef, useState } from 'react'
import { useDragValue } from '../../hooks/useDragValue'
import {
  clamp,
  hueOf,
  lightnessOf,
  okhslOf,
  okhslToHex,
  saturationOf,
  toHex
} from '../../services/color.service'
import { nameColor } from '../../services/naming.service'
import type { Okhsl } from '../../types'
import './WheelControls.css'

export type Channel = keyof Okhsl

const MAX: Record<Channel, number> = { hue: 360, saturation: 1, lightness: 1 }
const STEP: Record<Channel, number> = { hue: 2, saturation: 0.02, lightness: 0.02 }

interface TrackProps {
  /** Absolute position of each handle. Always what the sliders describe. */
  value: Okhsl
  onChange(channel: Channel, next: number): void
}

/**
 * Three absolute tracks: hue, saturation and lightness of one thing.
 *
 * Fully controlled — the handles sit exactly where `value` says, never at a
 * remembered position of their own. That is only workable because the triple
 * they read is independent (see `Okhsl`): turning the hue no longer moves the
 * saturation readout, so a handle can follow the palette without the three of
 * them shuffling each other around.
 */
function ToneTracks({ value, onChange }: TrackProps): React.JSX.Element {
  const hueTrack = useDragValue(({ x }) => onChange('hue', clamp(x, 0, 1) * 360))
  const satTrack = useDragValue(({ x }) => onChange('saturation', clamp(x, 0, 1)))
  const lightTrack = useDragValue(({ x }) => onChange('lightness', clamp(x, 0, 1)))

  const spectrum = Array.from({ length: 13 }, (_, index) => {
    const stop = (index / 12) * 360
    return `${toHex({ mode: 'oklch', l: 0.7, c: 0.15, h: stop })} ${(index / 12) * 100}%`
  }).join(', ')

  /* Both ramps are drawn at the current hue and lightness, so each track is a
     preview of exactly what dragging it will produce. */
  const satRamp = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (stop) =>
        `${okhslToHex({ ...value, saturation: stop })} ${stop * 100}%`
    )
    .join(', ')

  const lightRamp = Array.from({ length: 9 }, (_, index) => {
    const stop = index / 8
    return `${okhslToHex({ ...value, lightness: stop })} ${stop * 100}%`
  }).join(', ')

  const nudge =
    (channel: Channel) =>
    (event: React.KeyboardEvent): void => {
      const amount = (event.shiftKey ? 5 : 1) * STEP[channel]
      const direction =
        event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
            ? -1
            : 0
      if (direction === 0) return
      onChange(channel, clamp(value[channel] + direction * amount, 0, MAX[channel]))
      event.preventDefault()
    }

  const rows = [
    {
      channel: 'hue' as const,
      label: 'Hue',
      handlers: hueTrack.handlers,
      background: `linear-gradient(to right, ${spectrum})`,
      readout: `${Math.round(value.hue)}°`
    },
    {
      channel: 'saturation' as const,
      label: 'Saturation',
      handlers: satTrack.handlers,
      background: `linear-gradient(to right, ${satRamp})`,
      readout: `${Math.round(value.saturation * 100)}%`
    },
    {
      channel: 'lightness' as const,
      label: 'Lightness',
      handlers: lightTrack.handlers,
      background: `linear-gradient(to right, ${lightRamp})`,
      readout: value.lightness.toFixed(2)
    }
  ]

  return (
    <div className="wheel-controls">
      {rows.map((row) => (
        <div className="wheel-controls__row" key={row.channel}>
          <span className="wheel-controls__label">{row.label}</span>
          <div
            className="wheel-controls__track"
            style={{ background: row.background }}
            role="slider"
            tabIndex={0}
            aria-label={row.label}
            aria-valuemin={0}
            aria-valuemax={MAX[row.channel]}
            aria-valuenow={value[row.channel]}
            aria-valuetext={row.readout}
            onKeyDown={nudge(row.channel)}
            {...row.handlers}
          >
            <span
              className="wheel-controls__handle"
              style={{
                left: `${clamp(value[row.channel] / MAX[row.channel], 0, 1) * 100}%`,
                background: okhslToHex(value)
              }}
            />
          </div>
          <span className="wheel-controls__value mono">{row.readout}</span>
        </div>
      ))}
    </div>
  )
}

interface ColorSlidersProps {
  hex: string
  onChange(hex: string): void
}

/**
 * Sliders bound to a single colour.
 *
 * The triple is held here rather than re-read from the hex on every render:
 * `#rrggbb` only has 8 bits per channel, so a long drag would accumulate
 * rounding drift, and at the ends of the lightness range a colour has no hue
 * left to read back at all. Anything that changes the colour from outside —
 * the wheel, the eyedropper, the hex field — arrives as a hex we did not
 * produce, and re-seeds the triple.
 */
function ColorSliders({ hex, onChange }: ColorSlidersProps): React.JSX.Element {
  const [tone, setTone] = useState<Okhsl>(() => okhslOf(hex))

  /** Mirror: pointer moves outrun React, and the closure would be a frame behind. */
  const toneRef = useRef(tone)
  toneRef.current = tone

  /** The last hex these sliders emitted, so their own echo is not a change. */
  const sent = useRef(hex)

  useEffect(() => {
    if (hex === sent.current) return
    sent.current = hex
    setTone(okhslOf(hex))
  }, [hex])

  const push = (channel: Channel, next: number): void => {
    if (next === toneRef.current[channel]) return
    const updated = { ...toneRef.current, [channel]: next }
    toneRef.current = updated
    setTone(updated)

    const produced = okhslToHex(updated)
    sent.current = produced
    onChange(produced)
  }

  return <ToneTracks value={tone} onChange={push} />
}

/** Mean of a set of angles, taken on the unit circle so 350° and 10° average to 0°. */
function meanHue(colors: string[]): number {
  if (colors.length === 0) return 0
  let x = 0
  let y = 0
  for (const hex of colors) {
    const radians = (hueOf(hex) * Math.PI) / 180
    x += Math.cos(radians)
    y += Math.sin(radians)
  }
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360
}

const mean = (colors: string[], of: (hex: string) => number): number =>
  colors.length === 0 ? 0 : colors.reduce((total, hex) => total + of(hex), 0) / colors.length

/** Signed turn from one angle to another, the short way round. */
const shortestTurn = (from: number, to: number): number => (((to - from + 540) % 360) - 180)

interface PaletteSlidersProps {
  colors: string[]
  onShift(channel: Channel, delta: number): void
}

/**
 * Sliders over a set of colours that share no base.
 *
 * A palette has no single hue, so the handles show the average and report the
 * move as a shift applied to every swatch. Unlike a single colour these are
 * re-read from the palette on every render: the average is the honest readout,
 * and a shift that runs into the end of a range simply stops the handle
 * instead of letting it wander off from what the swatches are doing.
 */
function PaletteSliders({ colors, onShift }: PaletteSlidersProps): React.JSX.Element {
  const value: Okhsl = {
    hue: meanHue(colors),
    saturation: mean(colors, saturationOf),
    lightness: mean(colors, lightnessOf)
  }

  /** Mirror: two pointer moves can share a frame, and the second would
      otherwise measure its delta against the average from before the first. */
  const valueRef = useRef(value)
  valueRef.current = value

  return (
    <ToneTracks
      value={value}
      onChange={(channel, next) => {
        const from = valueRef.current
        const delta = channel === 'hue' ? shortestTurn(from.hue, next) : next - from[channel]
        if (delta === 0) return
        valueRef.current = { ...from, [channel]: next }
        onShift(channel, delta)
      }}
    />
  )
}

interface WheelControlsProps {
  colors: string[]
  /**
   * Under a rule the palette is a function of one colour, so that is what the
   * sliders drive — the rule redraws the rest around it.
   */
  base?: string
  onBase?(hex: string): void
  /** Free mode: nudge every unlocked swatch on one channel. */
  onShift?(channel: Channel, delta: number): void
  /** Free mode: set one swatch outright. */
  onColor?(index: number, hex: string): void
  /** Free mode: swatches the user pinned, which the sliders leave alone. */
  locked?: boolean[]
}

/** The slider column beside the wheel. What it offers depends on the rule. */
export function WheelControls({
  colors,
  base,
  onBase,
  onShift,
  onColor,
  locked
}: WheelControlsProps): React.JSX.Element {
  /** One set of sliders for the chosen swatch beats a stack of them per colour. */
  const [selected, setSelected] = useState(0)
  const index = Math.min(selected, Math.max(colors.length - 1, 0))
  const chosen = colors[index]

  return (
    <div className="wheel-controls-group">
      {base && onBase ? (
        <div className="wheel-controls-group__block">
          <span className="wheel-controls-group__title">
            Base colour
            <span className="wheel-controls-group__swatch" style={{ background: base }} />
            <span className="wheel-controls-group__hex mono">{base.toUpperCase()}</span>
          </span>
          <ColorSliders hex={base} onChange={onBase} />
          <p className="wheel-controls-group__note">
            The rule rebuilds the other swatches around this one.
          </p>
        </div>
      ) : null}

      {onShift ? (
        <div className="wheel-controls-group__block">
          <span className="wheel-controls-group__title">Whole palette</span>
          <PaletteSliders colors={colors} onShift={onShift} />
          <p className="wheel-controls-group__note">
            Averages across the palette — moving one shifts every unlocked swatch by
            the same amount.
          </p>
        </div>
      ) : null}

      {onColor && chosen ? (
        <div className="wheel-controls-group__block">
          <span className="wheel-controls-group__title">One colour</span>

          <div
            className="wheel-controls-group__picker"
            role="radiogroup"
            aria-label="Colour to edit"
          >
            {colors.map((hex, position) => (
              <button
                key={position}
                type="button"
                role="radio"
                aria-checked={position === index}
                className={`wheel-controls-group__chip ${position === index ? 'is-active' : ''}`}
                style={{ background: hex }}
                title={`${nameColor(hex)} — ${hex.toUpperCase()}`}
                aria-label={`Edit ${nameColor(hex)}`}
                onClick={() => setSelected(position)}
              >
                {position + 1}
              </button>
            ))}
          </div>

          {locked?.[index] ? (
            <p className="wheel-controls-group__note">
              Swatch {index + 1} is locked. Unlock it to edit.
            </p>
          ) : (
            <ColorSliders
              // A fresh set per swatch: the triple each one holds is its own.
              key={index}
              hex={chosen}
              onChange={(hex) => onColor(index, hex)}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
