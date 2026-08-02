import { colorsNamed, converter, formatHex } from 'culori'
import { perceptualDistance } from './color.service'

/**
 * Human-readable colour names.
 *
 * Two strategies, in order:
 *
 * 1. If the colour sits very close to one of the 148 CSS named colours, use
 *    that name — people recognise "Tomato" and it is unambiguous.
 * 2. Otherwise build a descriptive name from OKLCH: a lightness/chroma
 *    modifier plus a hue family, e.g. "Deep Indigo" or "Muted Sage".
 *
 * The generated half means *every* colour gets a name, with no dataset to ship
 * and nothing to fetch.
 */

const toOklch = converter('oklch')

/** Below this OKLab distance a CSS name is close enough to just use it. */
const CSS_NAME_TOLERANCE = 0.035
/**
 * Neutrals need a much tighter match: most CSS names near grey are warm
 * (Linen, Gainsboro…), and calling a flat `#eeeeee` "Linen" is just wrong.
 */
const NEUTRAL_NAME_TOLERANCE = 0.012
/** Below this chroma a colour reads as a neutral, whatever its hue says. */
const NEUTRAL_CHROMA = 0.022

interface HueFamily {
  /** Upper bound of the OKLCH hue slice, in degrees. */
  until: number
  name: string
  /** Softer name used when the colour is desaturated. */
  muted: string
}

/** OKLCH hue slices. Note red lands at ~29°, not 0°, in this space. */
const HUE_FAMILIES: HueFamily[] = [
  { until: 15, name: 'Rose', muted: 'Blush' },
  { until: 35, name: 'Red', muted: 'Brick' },
  { until: 50, name: 'Coral', muted: 'Terracotta' },
  { until: 65, name: 'Orange', muted: 'Clay' },
  { until: 85, name: 'Amber', muted: 'Caramel' },
  { until: 105, name: 'Gold', muted: 'Wheat' },
  { until: 125, name: 'Yellow', muted: 'Sand' },
  { until: 140, name: 'Lime', muted: 'Olive' },
  { until: 155, name: 'Green', muted: 'Sage' },
  { until: 175, name: 'Emerald', muted: 'Fern' },
  { until: 195, name: 'Teal', muted: 'Sea' },
  { until: 215, name: 'Cyan', muted: 'Mist' },
  { until: 240, name: 'Sky', muted: 'Denim' },
  { until: 265, name: 'Blue', muted: 'Slate' },
  { until: 290, name: 'Indigo', muted: 'Storm' },
  { until: 310, name: 'Violet', muted: 'Lavender' },
  { until: 330, name: 'Purple', muted: 'Mauve' },
  { until: 345, name: 'Magenta', muted: 'Orchid' },
  { until: 361, name: 'Pink', muted: 'Petal' }
]

/** Neutral ladder, darkest first, chosen on OKLCH lightness. */
const NEUTRALS: { until: number; name: string }[] = [
  { until: 0.08, name: 'Black' },
  { until: 0.22, name: 'Charcoal' },
  { until: 0.36, name: 'Graphite' },
  { until: 0.52, name: 'Slate Grey' },
  { until: 0.68, name: 'Grey' },
  { until: 0.82, name: 'Silver' },
  { until: 0.93, name: 'Ash' },
  { until: 0.975, name: 'Off White' },
  { until: 1.01, name: 'White' }
]

/** `darkseagreen` -> `Dark Sea Green`. */
function prettifyCssName(name: string): string {
  const words = name
    .replace(
      /(light|dark|medium|pale|deep|hot|cornflower|midnight|navajo|papaya|peach|powder|rosy|royal|saddle|sandy|sea|slate|spring|steel|white|yellow|blanched|blue|dodger|floral|forest|ghost|golden|green|honey|indian|lavender|lemon|lime|misty|moccasin|old|olive|orange|orchid|alice|antique|aqua|dim)/g,
      '$1 '
    )
    .trim()
  return words
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    // The rest of the app is in British English.
    .replace(/\bGray\b/g, 'Grey')
}

/** Nearest CSS named colour, or null if none is close enough. */
function nearestCssName(hex: string, tolerance: number): string | null {
  let best: { name: string; distance: number } | null = null

  for (const [name, value] of Object.entries(colorsNamed)) {
    // culori stores these as 24-bit integers.
    const candidate = formatHex({
      mode: 'rgb',
      r: ((value >> 16) & 0xff) / 255,
      g: ((value >> 8) & 0xff) / 255,
      b: (value & 0xff) / 255
    })
    if (!candidate) continue
    const distance = perceptualDistance(hex, candidate)
    if (!best || distance < best.distance) best = { name, distance }
  }

  return best && best.distance <= tolerance ? prettifyCssName(best.name) : null
}

function describe(hex: string): string {
  const oklch = toOklch(hex)
  if (!oklch) return 'Colour'

  const lightness = oklch.l
  const chroma = oklch.c
  const hue = ((oklch.h ?? 0) % 360 + 360) % 360

  if (chroma < NEUTRAL_CHROMA) {
    return (NEUTRALS.find((step) => lightness < step.until) ?? NEUTRALS[NEUTRALS.length - 1]).name
  }

  const family = HUE_FAMILIES.find((slice) => hue < slice.until) ?? HUE_FAMILIES[0]
  // Desaturated colours get the softer family name and no "muted" prefix, so
  // we never end up with "Muted Muted".
  const desaturated = chroma < 0.075
  const base = desaturated ? family.muted : family.name

  let modifier = ''
  if (lightness >= 0.9) modifier = 'Pale'
  else if (lightness >= 0.78) modifier = 'Light'
  else if (lightness <= 0.28) modifier = 'Deep'
  else if (lightness <= 0.45) modifier = 'Dark'
  else if (!desaturated && chroma >= 0.19) modifier = 'Vivid'
  else if (!desaturated && chroma < 0.11) modifier = 'Soft'

  return modifier ? `${modifier} ${base}` : base
}

const cache = new Map<string, string>()

/**
 * A friendly name for a colour. Memoised — the copy panel and the library
 * search ask for the same handful of colours over and over.
 */
export function nameColor(hex: string): string {
  const key = hex.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const chroma = toOklch(key)?.c ?? 0
  const tolerance = chroma < NEUTRAL_CHROMA ? NEUTRAL_NAME_TOLERANCE : CSS_NAME_TOLERANCE
  const name = nearestCssName(key, tolerance) ?? describe(key)

  cache.set(key, name)
  return name
}

/** Lowercased name + hex, for substring matching in the library search. */
export const searchTokens = (hex: string): string =>
  `${nameColor(hex).toLowerCase()} ${hex.toLowerCase()}`
