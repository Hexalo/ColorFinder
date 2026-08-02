import { clampChroma } from 'culori'
import { rotateHue, toHex } from './color.service'

/**
 * Random colour generation. Pure `Math.random()` on RGB produces a lot of mud,
 * so we sample in OKLCH: an even hue spread, mid-to-high lightness and a
 * chroma that stays inside what a screen can actually show.
 */

const between = (min: number, max: number): number => min + Math.random() * (max - min)

export type RandomFlavour = 'vivid' | 'pastel' | 'muted' | 'dark' | 'any'

const FLAVOUR_RANGES: Record<Exclude<RandomFlavour, 'any'>, { l: [number, number]; c: [number, number] }> = {
  vivid: { l: [0.55, 0.75], c: [0.16, 0.3] },
  pastel: { l: [0.82, 0.93], c: [0.04, 0.09] },
  muted: { l: [0.5, 0.7], c: [0.03, 0.08] },
  dark: { l: [0.22, 0.4], c: [0.05, 0.15] }
}

const FLAVOURS = Object.keys(FLAVOUR_RANGES) as Exclude<RandomFlavour, 'any'>[]

export function randomHex(flavour: RandomFlavour = 'any'): string {
  const key = flavour === 'any' ? FLAVOURS[Math.floor(Math.random() * FLAVOURS.length)] : flavour
  const { l, c } = FLAVOUR_RANGES[key]
  return toHex(
    clampChroma(
      {
        mode: 'oklch',
        l: between(l[0], l[1]),
        c: between(c[0], c[1]),
        h: Math.random() * 360
      },
      'oklch'
    )
  )
}

/**
 * A random palette that still reads as a palette: one random anchor hue, the
 * rest spread around it with varied lightness.
 */
export function randomPalette(size: number, flavour: RandomFlavour = 'any'): string[] {
  const base = randomHex(flavour)
  const spread = between(24, 55)
  return Array.from({ length: size }, (_, index) => {
    if (index === 0) return base
    const direction = index % 2 === 0 ? 1 : -1
    return rotateHue(base, direction * spread * Math.ceil(index / 2))
  })
}
