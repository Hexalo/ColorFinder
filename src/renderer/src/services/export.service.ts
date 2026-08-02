import { CODE_FORMAT_BY_ID } from '../data/codeFormats'
import type { Library, Palette } from '../types'
import { createEmptyLibrary } from '../../../shared/types'
import { swatchHexes } from './library.service'

/**
 * JSON export/import. Both documents carry a `format` tag and a `version` so
 * files exported today can still be recognised after a schema change.
 */

const PALETTE_FORMAT = 'color-finder.palette'
const LIBRARY_FORMAT = 'color-finder.library'
const EXPORT_VERSION = 1

const describe = (hex: string): Record<string, unknown> => ({
  hex,
  rgb: CODE_FORMAT_BY_ID.rgb.format(hex),
  hsl: CODE_FORMAT_BY_ID.hsl.format(hex),
  oklch: CODE_FORMAT_BY_ID.oklch.format(hex),
  cmyk: CODE_FORMAT_BY_ID.cmyk.format(hex)
})

/** Self-describing document for a single palette. */
export function paletteDocument(palette: Palette): Record<string, unknown> {
  return {
    format: PALETTE_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    palette: {
      name: palette.name,
      source: palette.source,
      createdAt: palette.createdAt,
      colors: swatchHexes(palette).map((hex) => describe(hex))
    }
  }
}

/** Same idea for an unsaved strip of colours. */
export function looseDocument(name: string, hexes: string[]): Record<string, unknown> {
  return {
    format: PALETTE_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    palette: { name, source: 'manual', colors: hexes.map((hex) => describe(hex)) }
  }
}

export function libraryDocument(library: Library): Record<string, unknown> {
  return {
    format: LIBRARY_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    bookmarks: library.bookmarks,
    palettes: library.palettes
  }
}

/**
 * Accepts either a library export document or a raw `library.json`, so users
 * can drop in the file they find in the data folder.
 */
export function parseLibraryDocument(raw: unknown): Library | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  const bookmarks = value.bookmarks
  const palettes = value.palettes
  if (!Array.isArray(palettes) || !Array.isArray(bookmarks)) return null

  return {
    ...createEmptyLibrary(),
    bookmarks: bookmarks as Library['bookmarks'],
    palettes: palettes as Library['palettes']
  }
}

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'palette'

export const paletteFileName = (name: string): string => `${slug(name)}.json`
