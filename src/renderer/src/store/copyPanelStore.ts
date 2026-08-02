import { create } from 'zustand'
import { useColorStore } from './colorStore'

/**
 * The right-hand copy drawer. Any copy affordance in the app opens it rather
 * than writing to the clipboard directly, so every colour has the same full
 * set of formats behind it.
 */
export type CopyTarget =
  | { kind: 'color'; hex: string; label?: string }
  | { kind: 'palette'; colors: string[]; name: string }

interface CopyPanelState {
  target: CopyTarget | null
  /**
   * Set when a colour was opened from inside a palette, so the panel can offer
   * a way back to the palette it came from.
   */
  parent: CopyTarget | null
  open(target: CopyTarget): void
  /** Drills into one swatch of the palette currently on screen. */
  drillTo(target: CopyTarget): void
  back(): void
  close(): void
}

/**
 * Opening the panel on a colour is the clearest "I am working with this one"
 * signal we get, so it doubles as the feed for the recent strip.
 */
const noteUsage = (target: CopyTarget): void => {
  if (target.kind === 'color') useColorStore.getState().remember(target.hex)
}

export const useCopyPanelStore = create<CopyPanelState>((set, get) => ({
  target: null,
  parent: null,
  open: (target) => {
    noteUsage(target)
    set({ target, parent: null })
  },
  drillTo: (target) => {
    noteUsage(target)
    set({ target, parent: get().target })
  },
  back: () => set({ target: get().parent, parent: null }),
  close: () => set({ target: null, parent: null })
}))

/** Shorthand for event handlers that are not already touching the store. */
export const openCopyPanel = (target: CopyTarget): void =>
  useCopyPanelStore.getState().open(target)
