import { create } from 'zustand'
import type { PaletteSource } from '../types'

/**
 * The palette the user last had on screen.
 *
 * The Poster page offers it as a source ("the one I just made"), which means
 * something has to remember it across a navigation. Every page shows its
 * palette through `PaletteBoard`, so that component publishes here and no page
 * has to opt in.
 */
interface GeneratedState {
  colors: string[]
  name: string
  source: PaletteSource | null
  publish(colors: string[], name: string, source: PaletteSource): void
}

export const useGeneratedStore = create<GeneratedState>((set, get) => ({
  colors: [],
  name: '',
  source: null,

  publish: (colors, name, source) => {
    const current = get()
    // Boards re-render constantly; only a real change is worth a new state.
    const same =
      current.name === name &&
      current.source === source &&
      current.colors.length === colors.length &&
      current.colors.every((hex, index) => hex === colors[index])
    if (same) return
    set({ colors: [...colors], name, source })
  }
}))

export const publishPalette = (colors: string[], name: string, source: PaletteSource): void =>
  useGeneratedStore.getState().publish(colors, name, source)
