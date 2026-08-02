import { create } from 'zustand'
import { hexToHsv, hsvToHex } from '../services/color.service'
import type { Hsv } from '../types'

/**
 * Not a display limit — the recent strip scrolls, so it shows the lot. This is
 * only a ceiling on how many swatch elements a long session can pile into the
 * DOM, far past anything anyone scrolls back through.
 */
const RECENT_CEILING = 500
const INITIAL_HEX = '#c2724f'

interface ColorState {
  /** Canonical working colour, `#rrggbb`. */
  hex: string
  /**
   * HSV is kept alongside the hex because it is the model the wheel and the
   * square are driven by, and because it survives greys — a hex of `#000000`
   * has no hue, but the wheel handle still has to stay where the user put it.
   */
  hsv: Hsv
  recent: string[]
  setHex(hex: string): void
  setHsv(patch: Partial<Hsv>): void
  remember(hex?: string): void
  /** Drops one colour from the recent strip. */
  forget(hex: string): void
  clearRecent(): void
}

export const useColorStore = create<ColorState>((set, get) => ({
  hex: INITIAL_HEX,
  hsv: hexToHsv(INITIAL_HEX),
  recent: [],

  setHex: (hex) => set({ hex, hsv: hexToHsv(hex, get().hsv.h) }),

  setHsv: (patch) => {
    const hsv = { ...get().hsv, ...patch }
    set({ hsv, hex: hsvToHex(hsv) })
  },

  remember: (hex) => {
    const value = hex ?? get().hex
    set((state) => ({
      recent: [value, ...state.recent.filter((item) => item !== value)].slice(0, RECENT_CEILING)
    }))
  },

  forget: (hex) =>
    set((state) => ({ recent: state.recent.filter((item) => item !== hex) })),

  clearRecent: () => set({ recent: [] })
}))
