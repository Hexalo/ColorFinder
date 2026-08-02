import { nameColor } from './naming.service'
import type { Bookmark, Library, Palette, PaletteSource, SavedColor, Swatch } from '../types'

/**
 * Pure helpers over the favourites library. Every function returns a new
 * object so the Zustand store can swap state without mutating what React
 * already rendered.
 */

export const newId = (): string => crypto.randomUUID()

const now = (): string => new Date().toISOString()

export const toSwatches = (hexes: string[]): Swatch[] =>
  hexes.map((hex) => ({ id: newId(), hex }))

export const swatchHexes = (palette: Palette): string[] =>
  palette.swatches.map((swatch) => swatch.hex)

export function createPalette(
  name: string,
  hexes: string[],
  source: PaletteSource,
  bookmarkId: string | null = null
): Palette {
  const timestamp = now()
  return {
    id: newId(),
    name: name.trim() || 'Untitled palette',
    swatches: toSwatches(hexes),
    bookmarkId,
    source,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function createBookmark(name: string, hex: string, icon = 'folder'): Bookmark {
  return { id: newId(), name: name.trim() || 'New bookmark', hex, icon, createdAt: now() }
}

export function addPalette(library: Library, palette: Palette): Library {
  return { ...library, palettes: [palette, ...library.palettes] }
}

export function updatePalette(
  library: Library,
  id: string,
  patch: Partial<Omit<Palette, 'id' | 'createdAt'>>
): Library {
  return {
    ...library,
    palettes: library.palettes.map((palette) =>
      palette.id === id ? { ...palette, ...patch, updatedAt: now() } : palette
    )
  }
}

export function removePalette(library: Library, id: string): Library {
  return { ...library, palettes: library.palettes.filter((palette) => palette.id !== id) }
}

/* -------------------------------------------------------------------------- */
/* Standalone colours                                                          */
/* -------------------------------------------------------------------------- */

export function createSavedColor(
  hex: string,
  name?: string,
  bookmarkId: string | null = null
): SavedColor {
  return {
    id: newId(),
    hex,
    // Fall back to the generated name so a saved colour is never just a hex.
    name: name?.trim() || nameColor(hex),
    bookmarkId,
    createdAt: now()
  }
}

export function addColor(library: Library, color: SavedColor): Library {
  return { ...library, colors: [color, ...library.colors] }
}

export function updateColor(
  library: Library,
  id: string,
  patch: Partial<Omit<SavedColor, 'id' | 'createdAt'>>
): Library {
  return {
    ...library,
    colors: library.colors.map((color) => (color.id === id ? { ...color, ...patch } : color))
  }
}

export function removeColor(library: Library, id: string): Library {
  return { ...library, colors: library.colors.filter((color) => color.id !== id) }
}

/* -------------------------------------------------------------------------- */

export function addBookmark(library: Library, bookmark: Bookmark): Library {
  return { ...library, bookmarks: [...library.bookmarks, bookmark] }
}

/** Renames a bookmark and/or restyles it (icon, colour). */
export function editBookmark(
  library: Library,
  id: string,
  patch: Partial<Pick<Bookmark, 'name' | 'hex' | 'icon'>>
): Library {
  return {
    ...library,
    bookmarks: library.bookmarks.map((bookmark) =>
      bookmark.id === id
        ? {
            ...bookmark,
            ...patch,
            // An empty name would leave an unclickable-looking row.
            name: patch.name?.trim() ? patch.name.trim() : bookmark.name
          }
        : bookmark
    )
  }
}

/** Deleting a bookmark keeps its contents — they fall back to the root. */
export function removeBookmark(library: Library, id: string): Library {
  return {
    ...library,
    bookmarks: library.bookmarks.filter((bookmark) => bookmark.id !== id),
    palettes: library.palettes.map((palette) =>
      palette.bookmarkId === id ? { ...palette, bookmarkId: null } : palette
    ),
    colors: library.colors.map((color) =>
      color.bookmarkId === id ? { ...color, bookmarkId: null } : color
    )
  }
}

export function movePalette(library: Library, paletteId: string, bookmarkId: string | null): Library {
  return updatePalette(library, paletteId, { bookmarkId })
}

/** How many palettes *and* colours a bookmark holds. */
export const countIn = (library: Library, bookmarkId: string | null): number =>
  library.palettes.filter((palette) => palette.bookmarkId === bookmarkId).length +
  library.colors.filter((color) => color.bookmarkId === bookmarkId).length

/**
 * Rows for a bookmark card's thumbnail: one row per palette, so the card shows
 * *which* palettes are inside rather than one anonymous smear of colour.
 * Loose colours are gathered into a final row.
 *
 * Pass `null` for the whole library.
 */
export function bookmarkPreview(
  library: Library,
  bookmarkId: string | null,
  maxRows = 4,
  maxPerRow = 8
): string[][] {
  const belongs = <T extends { bookmarkId: string | null }>(item: T): boolean =>
    bookmarkId === null || item.bookmarkId === bookmarkId

  const rows = library.palettes
    .filter(belongs)
    .map((palette) => palette.swatches.map((swatch) => swatch.hex).slice(0, maxPerRow))

  const loose = library.colors.filter(belongs).map((color) => color.hex)
  if (loose.length > 0) rows.push(loose.slice(0, maxPerRow))

  return rows.filter((row) => row.length > 0).slice(0, maxRows)
}

/** Merges an imported library into the current one, skipping duplicate ids. */
export function mergeLibraries(current: Library, incoming: Library): Library {
  const knownBookmarks = new Set(current.bookmarks.map((bookmark) => bookmark.id))
  const knownPalettes = new Set(current.palettes.map((palette) => palette.id))
  const knownColors = new Set(current.colors.map((color) => color.id))
  return {
    ...current,
    bookmarks: [
      ...current.bookmarks,
      ...incoming.bookmarks.filter((bookmark) => !knownBookmarks.has(bookmark.id))
    ],
    palettes: [
      ...incoming.palettes.filter((palette) => !knownPalettes.has(palette.id)),
      ...current.palettes
    ],
    colors: [
      ...(incoming.colors ?? []).filter((color) => !knownColors.has(color.id)),
      ...current.colors
    ]
  }
}
