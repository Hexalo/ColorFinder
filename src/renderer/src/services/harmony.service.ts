import { HARMONY_BY_ID } from '../data/harmonies'
import type { HarmonyId } from '../types'
import { clamp, lightnessOf, rotateHue, withLightness } from './color.service'
import { randomHex } from './random.service'

/**
 * Harmonies rotate hue in OKLCH rather than HSL: an HSL rotation of yellow to
 * blue changes the perceived lightness a lot, OKLCH keeps it steady.
 */

const HUE_OFFSETS: Partial<Record<HarmonyId, number[]>> = {
  complementary: [0, 180],
  'split-complement': [0, 150, 210],
  analogous: [-60, -30, 0, 30, 60],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270]
}

/** Lightness ladder for the monochromatic scale, in OKLCH lightness. */
const MONOCHROME_STEPS = [0.92, 0.76, 0.58, 0.42, 0.26]

export function buildHarmony(baseHex: string, harmony: HarmonyId): string[] {
  if (harmony === 'monochromatic') {
    // Keep the base colour in the ladder by swapping it into the nearest step.
    const baseLightness = lightnessOf(baseHex)
    const nearest = MONOCHROME_STEPS.reduce(
      (best, step, index) =>
        Math.abs(step - baseLightness) < Math.abs(MONOCHROME_STEPS[best] - baseLightness)
          ? index
          : best,
      0
    )
    return MONOCHROME_STEPS.map((step, index) =>
      index === nearest ? baseHex : withLightness(baseHex, step)
    )
  }

  if (harmony === 'unlocked') {
    return [baseHex, ...Array.from({ length: 4 }, () => randomHex())]
  }

  const offsets = HUE_OFFSETS[harmony] ?? [0]
  return offsets.map((offset) => (offset === 0 ? baseHex : rotateHue(baseHex, offset)))
}

/**
 * Regenerates only the swatches the user has not locked. `locked[i] === true`
 * means "keep whatever is at index i".
 */
export function reshuffle(
  current: string[],
  locked: boolean[],
  harmony: HarmonyId,
  baseHex: string
): string[] {
  if (harmony === 'unlocked') {
    return current.map((hex, index) => (locked[index] ? hex : randomHex()))
  }
  const fresh = buildHarmony(baseHex, harmony)
  return current.map((hex, index) => (locked[index] ? hex : (fresh[index] ?? hex)))
}

/** Number of swatches a harmony produces. */
export const harmonySize = (harmony: HarmonyId): number => HARMONY_BY_ID[harmony].count

/**
 * Extends or trims a palette to `size`, filling gaps with tints of the last
 * colour so the strip never renders with holes.
 */
export function resize(colors: string[], size: number): string[] {
  if (colors.length === size) return colors
  if (colors.length > size) return colors.slice(0, size)
  const filled = [...colors]
  while (filled.length < size) {
    const seed = filled[filled.length - 1] ?? '#888888'
    filled.push(withLightness(seed, clamp(lightnessOf(seed) * 0.85, 0.1, 0.95)))
  }
  return filled
}
