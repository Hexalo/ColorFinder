import { create } from 'zustand'
import { NO_ICON } from '../data/posterIcons'
import { createDefaultPoster, TEMPLATE_BY_ID } from '../data/posterPresets'
import { nameColor } from '../services/naming.service'
import { withRatio, withSide } from '../services/poster.service'
import type { PosterConfig, PosterSwatch, SavedPoster } from '../types'

/**
 * Source id used while a saved configuration is loaded. It is deliberately
 * not one `readSource` understands — loading goes through `loadPreset`
 * directly — so the "latest palette" auto-sync effect on the Poster page
 * leaves it alone.
 */
export const SAVED_SOURCE = 'saved'

/**
 * The poster being composed.
 *
 * Most of it lives in memory only — a poster is usually a one-off export, and
 * the templates are there to get a look back in one click. What *is* durable
 * is a configuration the user explicitly saves: `editingPosterId` tracks which
 * one (if any) is currently loaded, so the save dialog can offer to update it
 * instead of always creating a new entry. Only the chosen template id and the
 * split are otherwise remembered, through settings.
 */
interface PosterState {
  config: PosterConfig
  swatches: PosterSwatch[]
  /** Glyph handed to new bands, set by the last template applied. */
  defaultIcon: string
  /** False until the page has restored the remembered template and a source. */
  ready: boolean
  /** Id of the chosen source, from `PosterSwatches`. */
  source: string
  /** The colours that source last handed over, joined — see `PosterPage`. */
  loadedKey: string
  /** Id of the saved poster currently loaded, if any. */
  editingPosterId: string | null

  update(patch: Partial<PosterConfig>): void
  setRatio(ratioId: string): void
  setSide(side: 'width' | 'height', value: number): void
  setSource(source: string): void

  /** Replaces the bands, naming any colour that does not come with a name. */
  loadColors(colors: string[], names?: (string | undefined)[], title?: string): void
  setSwatchName(index: number, name: string): void
  setSwatchHex(index: number, hex: string): void
  setSwatchIcon(index: number, icon: string): void
  setAllIcons(icon: string): void
  removeSwatch(index: number): void

  applyTemplate(id: string): void
  markReady(): void

  /** Replaces the whole poster with a saved configuration, ready to edit. */
  loadPreset(saved: SavedPoster): void
  setEditingPosterId(id: string | null): void
}

export const usePosterStore = create<PosterState>((set, get) => ({
  config: createDefaultPoster(),
  swatches: [],
  defaultIcon: NO_ICON,
  ready: false,
  source: 'latest',
  loadedKey: '',
  editingPosterId: null,

  update: (patch) => set({ config: { ...get().config, ...patch } }),

  setRatio: (ratioId) => set({ config: withRatio(get().config, ratioId) }),

  setSide: (side, value) => set({ config: withSide(get().config, side, value) }),

  setSource: (source) =>
    // Picking a live source is a deliberate move away from a loaded snapshot,
    // so it stops counting as "editing" that saved configuration.
    set({ source, editingPosterId: source === SAVED_SOURCE ? get().editingPosterId : null }),

  loadColors: (colors, names, title) => {
    const icon = get().defaultIcon
    set({
      loadedKey: colors.join(','),
      swatches: colors.map((hex, index) => ({
        hex,
        name: names?.[index]?.trim() || nameColor(hex),
        icon
      }))
    })
    if (title !== undefined) set({ config: { ...get().config, title } })
  },

  setSwatchName: (index, name) =>
    set({
      swatches: get().swatches.map((swatch, i) => (i === index ? { ...swatch, name } : swatch))
    }),

  setSwatchHex: (index, hex) =>
    set({
      swatches: get().swatches.map((swatch, i) => (i === index ? { ...swatch, hex } : swatch))
    }),

  setSwatchIcon: (index, icon) =>
    set({
      swatches: get().swatches.map((swatch, i) => (i === index ? { ...swatch, icon } : swatch))
    }),

  setAllIcons: (icon) =>
    set({
      defaultIcon: icon,
      swatches: get().swatches.map((swatch) => ({ ...swatch, icon }))
    }),

  removeSwatch: (index) => {
    const swatches = get().swatches
    if (swatches.length <= 1) return
    set({ swatches: swatches.filter((_, i) => i !== index) })
  },

  applyTemplate: (id) => {
    const template = TEMPLATE_BY_ID[id]
    if (!template) return
    const config = { ...get().config, ...template.config }
    set({
      // The ratio moves the page size with it, so it goes through the helper.
      config: withRatio(config, config.ratio),
      defaultIcon: template.icon,
      swatches: get().swatches.map((swatch) => ({ ...swatch, icon: template.icon }))
    })
  },

  markReady: () => set({ ready: true }),

  loadPreset: (saved) => {
    const swatches = saved.swatches.map((swatch) => ({ ...swatch }))
    set({
      config: { ...saved.config },
      swatches,
      defaultIcon: swatches[0]?.icon ?? NO_ICON,
      editingPosterId: saved.id,
      loadedKey: swatches.map((swatch) => swatch.hex).join(','),
      source: SAVED_SOURCE,
      ready: true
    })
  },

  setEditingPosterId: (id) => set({ editingPosterId: id })
}))
