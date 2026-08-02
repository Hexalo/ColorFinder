import { create } from 'zustand'
import { createEmptyLibrary } from '../../../shared/types'
import {
  libraryDocument,
  paletteDocument,
  paletteFileName,
  parseLibraryDocument
} from '../services/export.service'
import {
  addBookmark,
  addColor,
  addPalette,
  addPoster,
  createBookmark,
  createPalette,
  createSavedColor,
  createSavedPoster,
  editBookmark,
  mergeLibraries,
  movePalette,
  removeBookmark,
  removeColor,
  removePalette,
  removePoster,
  toSwatches,
  updateColor,
  updatePalette,
  updatePoster
} from '../services/library.service'
import { nameColor } from '../services/naming.service'
import type {
  Bookmark,
  Library,
  Palette,
  PaletteSource,
  PosterConfig,
  PosterSwatch,
  SavedColor,
  SavedPoster
} from '../types'
import { toast } from './toastStore'

/**
 * The library lives on disk as JSON. Reads happen once at boot; writes are
 * debounced so dragging a colour around does not hammer the filesystem.
 */

const WRITE_DELAY = 250
let writeTimer: number | undefined

function persist(library: Library): void {
  window.clearTimeout(writeTimer)
  writeTimer = window.setTimeout(() => {
    try {
      void window.api.library.write(library).catch((error: unknown) => {
        console.error('[library] write failed', error)
        toast.error('Could not save the library to disk.')
      })
    } catch (error) {
      console.error('[library] write unavailable', error)
    }
  }, WRITE_DELAY)
}

/**
 * Library filter. `null` shows everything, `'recent'` is a virtual view, and
 * anything else is a bookmark id.
 */
export type LibraryFilter = string | null
export const RECENT_FILTER = 'recent'

/** Virtual filters are views, not places — saving into one goes to the root. */
const asBookmarkId = (filter: LibraryFilter): string | null =>
  filter === null || filter === RECENT_FILTER ? null : filter

interface LibraryState {
  library: Library
  loaded: boolean
  /** Bookmark currently selected in the library sidebar; `null` = all. */
  filter: LibraryFilter

  load(): Promise<void>
  setFilter(bookmarkId: string | null): void

  savePalette(name: string, hexes: string[], source: PaletteSource, bookmarkId?: string | null): Palette
  renamePalette(id: string, name: string): void
  replaceColors(id: string, hexes: string[]): void
  deletePalette(id: string): void
  assignBookmark(paletteId: string, bookmarkId: string | null): void

  saveColor(hex: string, name?: string, bookmarkId?: string | null): SavedColor
  renameColor(id: string, name: string): void
  deleteColor(id: string): void
  assignColorBookmark(colorId: string, bookmarkId: string | null): void

  savePoster(
    name: string,
    config: PosterConfig,
    swatches: PosterSwatch[],
    bookmarkId?: string | null
  ): SavedPoster
  updatePosterEntry(
    id: string,
    patch: { name: string; bookmarkId: string | null; config: PosterConfig; swatches: PosterSwatch[] }
  ): void
  renamePoster(id: string, name: string): void
  deletePoster(id: string): void
  assignPosterBookmark(posterId: string, bookmarkId: string | null): void

  createFolder(name: string, hex: string, icon?: string): void
  editFolder(id: string, patch: Partial<Pick<Bookmark, 'name' | 'hex' | 'icon'>>): void
  deleteFolder(id: string): void

  exportLibrary(): Promise<void>
  exportPalette(palette: Palette): Promise<void>
  importLibrary(): Promise<void>
}

export const useLibraryStore = create<LibraryState>((set, get) => {
  /** Applies a pure transform, then schedules the disk write. */
  const commit = (transform: (library: Library) => Library): Library => {
    const next = transform(get().library)
    set({ library: next })
    persist(next)
    return next
  }

  return {
    library: createEmptyLibrary(),
    loaded: false,
    filter: null,

    load: async () => {
      try {
        set({ library: await window.api.library.read(), loaded: true })
      } catch (error) {
        console.error('[library] read failed', error)
        set({ loaded: true })
        toast.error('Could not read the library file.')
      }
    },

    setFilter: (bookmarkId) => set({ filter: bookmarkId }),

    savePalette: (name, hexes, source, bookmarkId = null) => {
      const palette = createPalette(name, hexes, source, bookmarkId ?? asBookmarkId(get().filter))
      commit((library) => addPalette(library, palette))
      return palette
    },

    renamePalette: (id, name) => {
      commit((library) => updatePalette(library, id, { name: name.trim() || 'Untitled palette' }))
    },

    replaceColors: (id, hexes) => {
      commit((library) => updatePalette(library, id, { swatches: toSwatches(hexes) }))
    },

    deletePalette: (id) => {
      commit((library) => removePalette(library, id))
    },

    assignBookmark: (paletteId, bookmarkId) => {
      commit((library) => movePalette(library, paletteId, bookmarkId))
    },

    saveColor: (hex, name, bookmarkId) => {
      const color = createSavedColor(hex, name, bookmarkId ?? asBookmarkId(get().filter))
      commit((library) => addColor(library, color))
      toast.success(`${color.name} saved to the library.`)
      return color
    },

    renameColor: (id, name) => {
      const existing = get().library.colors.find((color) => color.id === id)
      const fallback = existing ? nameColor(existing.hex) : 'Colour'
      commit((library) => updateColor(library, id, { name: name.trim() || fallback }))
    },

    deleteColor: (id) => {
      commit((library) => removeColor(library, id))
    },

    assignColorBookmark: (colorId, bookmarkId) => {
      commit((library) => updateColor(library, colorId, { bookmarkId }))
    },

    savePoster: (name, config, swatches, bookmarkId) => {
      const poster = createSavedPoster(name, config, swatches, bookmarkId ?? asBookmarkId(get().filter))
      commit((library) => addPoster(library, poster))
      return poster
    },

    updatePosterEntry: (id, patch) => {
      commit((library) =>
        updatePoster(library, id, {
          name: patch.name.trim() || 'Untitled poster',
          bookmarkId: patch.bookmarkId,
          config: patch.config,
          swatches: patch.swatches
        })
      )
    },

    renamePoster: (id, name) => {
      commit((library) => updatePoster(library, id, { name: name.trim() || 'Untitled poster' }))
    },

    deletePoster: (id) => {
      commit((library) => removePoster(library, id))
    },

    assignPosterBookmark: (posterId, bookmarkId) => {
      commit((library) => updatePoster(library, posterId, { bookmarkId }))
    },

    createFolder: (name, hex, icon) => {
      commit((library) => addBookmark(library, createBookmark(name, hex, icon)))
    },

    editFolder: (id, patch) => {
      commit((library) => editBookmark(library, id, patch))
    },

    deleteFolder: (id) => {
      commit((library) => removeBookmark(library, id))
      if (get().filter === id) set({ filter: null })
    },

    exportLibrary: async () => {
      const path = await window.api.files.exportJson(
        'color-finder-library.json',
        libraryDocument(get().library)
      )
      if (path) toast.success('Library exported.')
    },

    exportPalette: async (palette) => {
      const path = await window.api.files.exportJson(
        paletteFileName(palette.name),
        paletteDocument(palette)
      )
      if (path) toast.success(`"${palette.name}" exported.`)
    },

    importLibrary: async () => {
      try {
        const raw = await window.api.files.importJson()
        if (raw === null) return
        const incoming = parseLibraryDocument(raw)
        if (!incoming) {
          toast.error('That file is not a Color Finder library.')
          return
        }
        const before = get().library.palettes.length
        const after = commit((library) => mergeLibraries(library, incoming)).palettes.length
        toast.success(`Imported ${after - before} palette(s).`)
      } catch (error) {
        console.error('[library] import failed', error)
        toast.error('The file could not be parsed.')
      }
    }
  }
})
