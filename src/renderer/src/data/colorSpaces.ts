import {
  cmykToHex,
  cmykValues,
  hslToHex,
  hslValues,
  hsvValues,
  hsvValuesToHex,
  labToHex,
  labValues,
  lchToHex,
  lchValues,
  oklchToHex,
  oklchValues,
  p3ToHex,
  p3Values,
  rgbToHex,
  rgbValues,
  srgbToHex,
  srgbValues
} from '../services/color.service'
import type { ChannelDef, ColorSpaceDef, SpaceId } from '../types'

const channel = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  decimals: number,
  unit?: string
): ChannelDef => ({ key, label, min, max, step, decimals, unit })

const fixed = (value: number, decimals: number): string => value.toFixed(decimals)

export const COLOR_SPACES: ColorSpaceDef[] = [
  {
    id: 'rgb',
    label: 'RGB',
    hint: '8-bit sRGB channels, the format most tools expect.',
    channels: [
      channel('r', 'Red', 0, 255, 1, 0),
      channel('g', 'Green', 0, 255, 1, 0),
      channel('b', 'Blue', 0, 255, 1, 0)
    ],
    toValues: rgbValues,
    toHex: rgbToHex,
    format: ([r, g, b]) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`
  },
  {
    id: 'srgb',
    label: 'sRGB',
    hint: 'The same channels as RGB, normalised to 0–1 like CSS `color()`.',
    channels: [
      channel('r', 'Red', 0, 1, 0.0001, 4),
      channel('g', 'Green', 0, 1, 0.0001, 4),
      channel('b', 'Blue', 0, 1, 0.0001, 4)
    ],
    toValues: srgbValues,
    toHex: srgbToHex,
    format: ([r, g, b]) => `color(srgb ${fixed(r, 4)} ${fixed(g, 4)} ${fixed(b, 4)})`
  },
  {
    id: 'p3',
    label: 'Display P3',
    hint: 'Wide-gamut space used by modern Apple displays.',
    channels: [
      channel('r', 'Red', 0, 1, 0.0001, 4),
      channel('g', 'Green', 0, 1, 0.0001, 4),
      channel('b', 'Blue', 0, 1, 0.0001, 4)
    ],
    toValues: p3Values,
    toHex: p3ToHex,
    format: ([r, g, b]) => `color(display-p3 ${fixed(r, 4)} ${fixed(g, 4)} ${fixed(b, 4)})`
  },
  {
    id: 'hsv',
    label: 'HSV',
    hint: 'Hue, saturation, value — the model behind the wheel and the square.',
    channels: [
      channel('h', 'Hue', 0, 360, 0.1, 1, '°'),
      channel('s', 'Saturation', 0, 100, 0.1, 1, '%'),
      channel('v', 'Value', 0, 100, 0.1, 1, '%')
    ],
    toValues: hsvValues,
    toHex: hsvValuesToHex,
    format: ([h, s, v]) => `hsv(${fixed(h, 1)} ${fixed(s, 1)}% ${fixed(v, 1)}%)`
  },
  {
    id: 'hsl',
    label: 'HSL',
    hint: 'Hue, saturation, lightness — the CSS classic.',
    channels: [
      channel('h', 'Hue', 0, 360, 0.1, 1, '°'),
      channel('s', 'Saturation', 0, 100, 0.1, 1, '%'),
      channel('l', 'Lightness', 0, 100, 0.1, 1, '%')
    ],
    toValues: hslValues,
    toHex: hslToHex,
    format: ([h, s, l]) => `hsl(${fixed(h, 1)} ${fixed(s, 1)}% ${fixed(l, 1)}%)`
  },
  {
    id: 'cmyk',
    label: 'CMYK',
    hint: 'Device-independent approximation — real print needs an ICC profile.',
    channels: [
      channel('c', 'Cyan', 0, 100, 0.1, 1, '%'),
      channel('m', 'Magenta', 0, 100, 0.1, 1, '%'),
      channel('y', 'Yellow', 0, 100, 0.1, 1, '%'),
      channel('k', 'Key (black)', 0, 100, 0.1, 1, '%')
    ],
    toValues: cmykValues,
    toHex: cmykToHex,
    format: ([c, m, y, k]) =>
      `cmyk(${fixed(c, 1)}% ${fixed(m, 1)}% ${fixed(y, 1)}% ${fixed(k, 1)}%)`
  },
  {
    id: 'lab',
    label: 'LAB',
    hint: 'CIELAB (D50), perceptually uniform, as used by CSS `lab()`.',
    channels: [
      channel('l', 'Lightness', 0, 100, 0.01, 2),
      channel('a', 'a (green–red)', -128, 128, 0.01, 2),
      channel('b', 'b (blue–yellow)', -128, 128, 0.01, 2)
    ],
    toValues: labValues,
    toHex: labToHex,
    format: ([l, a, b]) => `lab(${fixed(l, 2)}% ${fixed(a, 2)} ${fixed(b, 2)})`
  },
  {
    id: 'lch',
    label: 'LCH',
    hint: 'Cylindrical CIELAB — lightness, chroma and hue.',
    channels: [
      channel('l', 'Lightness', 0, 100, 0.01, 2),
      channel('c', 'Chroma', 0, 150, 0.01, 2),
      channel('h', 'Hue', 0, 360, 0.01, 2, '°')
    ],
    toValues: lchValues,
    toHex: lchToHex,
    format: ([l, c, h]) => `lch(${fixed(l, 2)}% ${fixed(c, 2)} ${fixed(h, 2)})`
  },
  {
    id: 'oklch',
    label: 'OKLCH',
    hint: 'The most perceptually even space here — best for generating scales.',
    channels: [
      channel('l', 'Lightness', 0, 1, 0.0001, 4),
      channel('c', 'Chroma', 0, 0.4, 0.0001, 4),
      channel('h', 'Hue', 0, 360, 0.01, 2, '°')
    ],
    toValues: oklchValues,
    toHex: oklchToHex,
    format: ([l, c, h]) => `oklch(${fixed(l, 4)} ${fixed(c, 4)} ${fixed(h, 2)})`
  }
]

export const SPACE_BY_ID: Record<SpaceId, ColorSpaceDef> = Object.fromEntries(
  COLOR_SPACES.map((space) => [space.id, space])
) as Record<SpaceId, ColorSpaceDef>

/**
 * Colours to paint behind a slider track so the user sees where dragging that
 * channel will land. Works for any space because it just samples the space.
 */
export function channelGradient(
  space: ColorSpaceDef,
  values: number[],
  index: number,
  steps = 12
): string[] {
  const { min, max } = space.channels[index]
  return Array.from({ length: steps + 1 }, (_, step) => {
    const next = [...values]
    next[index] = min + ((max - min) * step) / steps
    return space.toHex(next)
  })
}
