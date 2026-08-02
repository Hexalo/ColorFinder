import {
  clampChroma,
  converter,
  formatHex,
  formatHex8,
  inGamut,
  parse,
  toGamut,
  wcagContrast,
  wcagLuminance
} from 'culori'
import type { Hsv, Okhsl } from '../types'

/**
 * Every colour conversion in the app goes through here. The rest of the code
 * only ever passes around `#rrggbb` strings.
 */

const toRgb = converter('rgb')
const toHsl = converter('hsl')
const toHsvMode = converter('hsv')
const toP3 = converter('p3')
const toLab = converter('lab')
const toLch = converter('lch')
const toOklch = converter('oklch')

/**
 * Maps an out-of-sRGB colour to the closest displayable one by reducing
 * chroma, which preserves hue far better than naive per-channel clipping.
 */
const fitToSrgb = toGamut('rgb', 'oklch')

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const round = (value: number, decimals = 0): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Normalises any culori colour into a displayable `#rrggbb`. */
export function toHex(color: unknown): string {
  if (!color) return '#000000'
  return formatHex(fitToSrgb(color as never)) ?? '#000000'
}

/** Accepts hex, `rgb()`, `hsl()`, `oklch()`, CSS names… Returns null if invalid. */
export function parseColor(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  // Bare hex digits typed into the hex field, e.g. "ff5733".
  const candidate = /^[0-9a-f]{3,8}$/i.test(trimmed) ? `#${trimmed}` : trimmed
  const parsed = parse(candidate)
  return parsed ? toHex(parsed) : null
}

export const isValidColor = (input: string): boolean => parseColor(input) !== null

export function hexWithAlpha(hex: string, alpha: number): string {
  return formatHex8({ ...toRgb(hex)!, alpha: clamp(alpha, 0, 1) }) ?? hex
}

/* -------------------------------------------------------------------------- */
/* HSV — the interaction model behind the wheel and the saturation square      */
/* -------------------------------------------------------------------------- */

export function hexToHsv(hex: string, hueHint = 0): Hsv {
  const hsv = toHsvMode(hex)
  if (!hsv) return { h: hueHint, s: 0, v: 0 }
  return {
    // Greys have no hue; keep the one the user was last on so dragging the
    // value slider back up does not snap the wheel to red.
    h: hsv.h ?? hueHint,
    s: (hsv.s ?? 0) * 100,
    v: (hsv.v ?? 0) * 100
  }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  return toHex({ mode: 'hsv', h: ((h % 360) + 360) % 360, s: s / 100, v: v / 100 })
}

/* -------------------------------------------------------------------------- */
/* Per-space accessors used by the channel sliders                            */
/* -------------------------------------------------------------------------- */

export const rgbValues = (hex: string): number[] => {
  const { r, g, b } = toRgb(hex)!
  return [r * 255, g * 255, b * 255].map((channel) => round(channel))
}

export const rgbToHex = ([r, g, b]: number[]): string =>
  toHex({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })

export const srgbValues = (hex: string): number[] => {
  const { r, g, b } = toRgb(hex)!
  return [r, g, b].map((channel) => round(channel, 4))
}

export const srgbToHex = ([r, g, b]: number[]): string => toHex({ mode: 'rgb', r, g, b })

export const p3Values = (hex: string): number[] => {
  const { r, g, b } = toP3(hex)!
  return [r, g, b].map((channel) => round(channel, 4))
}

export const p3ToHex = ([r, g, b]: number[]): string => toHex({ mode: 'p3', r, g, b })

export const hsvValues = (hex: string, hueHint = 0): number[] => {
  const { h, s, v } = hexToHsv(hex, hueHint)
  return [round(h, 1), round(s, 1), round(v, 1)]
}

export const hsvValuesToHex = ([h, s, v]: number[]): string => hsvToHex({ h, s, v })

export const hslValues = (hex: string, hueHint = 0): number[] => {
  const hsl = toHsl(hex)!
  return [round(hsl.h ?? hueHint, 1), round((hsl.s ?? 0) * 100, 1), round((hsl.l ?? 0) * 100, 1)]
}

export const hslToHex = ([h, s, l]: number[]): string =>
  toHex({ mode: 'hsl', h: ((h % 360) + 360) % 360, s: s / 100, l: l / 100 })

/**
 * Naive device-independent CMYK. Real print conversion depends on an ICC
 * profile, so treat these numbers as an approximation — the UI says so too.
 */
export function cmykValues(hex: string): number[] {
  const { r, g, b } = toRgb(hex)!
  const k = 1 - Math.max(r, g, b)
  if (k >= 1) return [0, 0, 0, 100]
  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)
  return [c, m, y, k].map((channel) => round(channel * 100, 1))
}

export function cmykToHex([c, m, y, k]: number[]): string {
  const [nc, nm, ny, nk] = [c, m, y, k].map((channel) => clamp(channel, 0, 100) / 100)
  return toHex({
    mode: 'rgb',
    r: (1 - nc) * (1 - nk),
    g: (1 - nm) * (1 - nk),
    b: (1 - ny) * (1 - nk)
  })
}

export const labValues = (hex: string): number[] => {
  const { l, a, b } = toLab(hex)!
  return [round(l, 2), round(a, 2), round(b, 2)]
}

export const labToHex = ([l, a, b]: number[]): string => toHex({ mode: 'lab', l, a, b })

export const lchValues = (hex: string, hueHint = 0): number[] => {
  const lch = toLch(hex)!
  return [round(lch.l, 2), round(lch.c, 2), round(lch.h ?? hueHint, 2)]
}

export const lchToHex = ([l, c, h]: number[]): string =>
  toHex(clampChroma({ mode: 'lch', l, c, h: ((h % 360) + 360) % 360 }, 'lch'))

export const oklchValues = (hex: string, hueHint = 0): number[] => {
  const oklch = toOklch(hex)!
  return [round(oklch.l, 4), round(oklch.c, 4), round(oklch.h ?? hueHint, 2)]
}

export const oklchToHex = ([l, c, h]: number[]): string =>
  toHex(clampChroma({ mode: 'oklch', l, c, h: ((h % 360) + 360) % 360 }, 'oklch'))

/* -------------------------------------------------------------------------- */
/* Perceptual helpers                                                          */
/* -------------------------------------------------------------------------- */

/** OKLCH lightness, 0–1. Used for sorting and for readable label colours. */
export const lightnessOf = (hex: string): number => toOklch(hex)?.l ?? 0

export const hueOf = (hex: string): number => toOklch(hex)?.h ?? 0

export const luminanceOf = (hex: string): number => wcagLuminance(hex)

export const contrastRatio = (a: string, b: string): number => wcagContrast(a, b)

/** Black or white, whichever is readable on top of `hex`. */
export const readableTextOn = (hex: string): string =>
  contrastRatio(hex, '#000000') >= contrastRatio(hex, '#ffffff') ? '#141210' : '#ffffff'

/** Rotates hue in OKLCH, which keeps perceived lightness stable. */
export function rotateHue(hex: string, degrees: number): string {
  const oklch = toOklch(hex)!
  return toHex(
    clampChroma(
      { ...oklch, h: (((oklch.h ?? 0) + degrees) % 360 + 360) % 360 },
      'oklch'
    )
  )
}

/** Sets OKLCH lightness (0–1), keeping hue and chroma. */
export function withLightness(hex: string, lightness: number): string {
  const oklch = toOklch(hex)!
  return toHex(clampChroma({ ...oklch, l: clamp(lightness, 0, 1) }, 'oklch'))
}

export function withChroma(hex: string, chroma: number): string {
  const oklch = toOklch(hex)!
  return toHex(clampChroma({ ...oklch, c: Math.max(chroma, 0) }, 'oklch'))
}

/** Chroma of `hex` in OKLCH. Pairs with `hueOf` for wheel coordinates. */
export const chromaOf = (hex: string): number => toOklch(hex)?.c ?? 0

/**
 * Chroma as a 0–1 fraction of what this colour could hold at its own
 * lightness and hue. A plain chroma figure is not comparable across hues —
 * 0.15 is washed out in the magentas and beyond the gamut in the cyans.
 */
export function saturationOf(hex: string): number {
  const ceiling = maxChromaAt(lightnessOf(hex), hueOf(hex))
  return ceiling > 0 ? clamp(chromaOf(hex) / ceiling, 0, 1) : 0
}

/** Inverse of `saturationOf`. */
export function withSaturation(hex: string, saturation: number): string {
  const ceiling = maxChromaAt(lightnessOf(hex), hueOf(hex))
  return withChroma(hex, clamp(saturation, 0, 1) * ceiling)
}

/** Moves a colour to a hue/chroma position, keeping its lightness. */
export function withHueChroma(hex: string, hue: number, chroma: number): string {
  const oklch = toOklch(hex)!
  return toHex(
    clampChroma(
      { ...oklch, h: ((hue % 360) + 360) % 360, c: Math.max(chroma, 0) },
      'oklch'
    )
  )
}

/* -------------------------------------------------------------------------- */
/* The hue / saturation / lightness triple behind the harmony sliders          */
/* -------------------------------------------------------------------------- */

/** Reads a colour as the three independent fields the sliders show. */
export const okhslOf = (hex: string): Okhsl => ({
  hue: hueOf(hex),
  saturation: saturationOf(hex),
  lightness: lightnessOf(hex)
})

/**
 * Inverse of `okhslOf`.
 *
 * Chroma is rebuilt from the ceiling at the *new* hue and lightness, and that
 * is the whole trick: hold OKLCH chroma fixed while raising lightness and the
 * colour visibly desaturates, because the ceiling moved underneath it. Going
 * through the relative figure instead lets one slider move without dragging
 * the other two along with it.
 */
export function okhslToHex({ hue, saturation, lightness }: Okhsl): string {
  const h = ((hue % 360) + 360) % 360
  const l = clamp(lightness, 0, 1)
  return toHex({ mode: 'oklch', l, c: clamp(saturation, 0, 1) * maxChromaAt(l, h), h })
}

/** Moves one field of the triple: hue wraps, the other two clamp. */
export function shiftOkhsl(hex: string, channel: keyof Okhsl, delta: number): string {
  const tone = okhslOf(hex)
  return okhslToHex({
    ...tone,
    [channel]: channel === 'hue' ? tone.hue + delta : clamp(tone[channel] + delta, 0, 1)
  })
}

const displayable = inGamut('rgb')
const maxChromaCache = new Map<string, number>()

/**
 * The largest chroma sRGB can actually show at this lightness and hue.
 *
 * This is nowhere near constant: at OKLCH L 0.63 it runs from about 0.109 in
 * the cyans to 0.287 in the magentas. Normalising a colour wheel by one flat
 * figure would leave most hues unable to reach the rim, so the wheel asks for
 * the real ceiling per point.
 */
export function maxChromaAt(lightness: number, hue: number): number {
  const key = `${lightness.toFixed(2)}:${Math.round(hue)}`
  const cached = maxChromaCache.get(key)
  if (cached !== undefined) return cached

  // Binary search: chroma is monotonic — once it leaves the gamut it stays out.
  let low = 0
  let high = 0.5
  for (let i = 0; i < 20; i += 1) {
    const middle = (low + high) / 2
    if (displayable({ mode: 'oklch', l: lightness, c: middle, h: hue })) low = middle
    else high = middle
  }

  maxChromaCache.set(key, low)
  return low
}

export function mix(a: string, b: string, amount: number): string {
  const ca = toRgb(a)!
  const cb = toRgb(b)!
  const t = clamp(amount, 0, 1)
  return toHex({
    mode: 'rgb',
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t
  })
}

/** Squared distance in OKLab — good enough for clustering and dedup. */
export function perceptualDistance(a: string, b: string): number {
  const oa = toOklch(a)!
  const ob = toOklch(b)!
  const ha = ((oa.h ?? 0) * Math.PI) / 180
  const hb = ((ob.h ?? 0) * Math.PI) / 180
  const dl = oa.l - ob.l
  const da = oa.c * Math.cos(ha) - ob.c * Math.cos(hb)
  const db = oa.c * Math.sin(ha) - ob.c * Math.sin(hb)
  return Math.sqrt(dl * dl + da * da + db * db)
}
