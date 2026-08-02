/**
 * Types shared between the Electron main process, the preload bridge and the
 * renderer. Keep this file dependency-free so every process can import it.
 */

/** Lowercase `#rrggbb`. The canonical way a colour travels through the app. */
export type Hex = string

export type ThemeMode = 'light' | 'dark' | 'system'

/** How a palette came to exist — shown as a badge in the library. */
export type PaletteSource = 'harmony' | 'image' | 'random' | 'manual'

export interface Swatch {
  id: string
  hex: Hex
  /** Optional human name, e.g. "Terracotta". */
  name?: string
}

export interface Palette {
  id: string
  name: string
  swatches: Swatch[]
  /** `null` means the palette sits at the root of the library. */
  bookmarkId: string | null
  source: PaletteSource
  createdAt: string
  updatedAt: string
}

/** A user-defined folder ("signet") used to sort favourite palettes. */
export interface Bookmark {
  id: string
  name: string
  /** Accent colour of the folder chip. */
  hex: Hex
  /**
   * Id from `data/bookmarkIcons.ts`. Optional so libraries written before
   * icons existed still load; the UI falls back to the default folder glyph.
   */
  icon?: string
  createdAt: string
}

/**
 * The whole on-disk favourites library. `schemaVersion` lets us migrate the
 * file if the shape ever changes — see `migrateLibrary` in the main process.
 */
export interface Library {
  schemaVersion: number
  bookmarks: Bookmark[]
  palettes: Palette[]
  /** Single colours saved on their own, separate from palettes. */
  colors: SavedColor[]
}

/** A one-off colour kept in the library. */
export interface SavedColor {
  id: string
  hex: Hex
  /** Auto-filled from the naming service, editable by the user. */
  name: string
  bookmarkId: string | null
  createdAt: string
}

/**
 * Which segmented control was last chosen on each page. Kept so switching
 * pages and coming back does not reset you to the defaults.
 */
export interface TabState {
  pickerMode: string
  pickerSpace: string
  harmony: string
  randomFlavour: string
  librarySection: string
}

export interface Settings {
  schemaVersion: number
  theme: ThemeMode
  /** Id of a format from `data/codeFormats.ts`, pinned to the top of the copy panel. */
  defaultCopyFormat: string
  /** Icons-only side nav. */
  sidebarCollapsed: boolean
  /** Expanded side nav width in px; clamped to SIDEBAR_MIN/MAX on read. */
  sidebarWidth: number
  /** Right-hand copy panel width in px; clamped to COPY_PANEL_MIN/MAX on read. */
  copyPanelWidth: number
  /** Height of the recent-colours strip in the side nav, in px. Drag to resize. */
  recentHeight: number
  tabs: TabState
}

export const SIDEBAR_MIN_WIDTH = 176
export const SIDEBAR_MAX_WIDTH = 340
export const SIDEBAR_DEFAULT_WIDTH = 232

export const COPY_PANEL_MIN_WIDTH = 300
export const COPY_PANEL_MAX_WIDTH = 560
export const COPY_PANEL_DEFAULT_WIDTH = 380

/**
 * The recent strip. It scrolls rather than truncating, so the default is
 * deliberately short — about three rows, with the next one peeking to say
 * there is more — and the user drags it taller when they want the history in
 * view. The maximum still leaves room for the nav items above.
 */
export const RECENT_MIN_HEIGHT = 44
export const RECENT_MAX_HEIGHT = 460
export const RECENT_DEFAULT_HEIGHT = 128

export const createDefaultTabs = (): TabState => ({
  pickerMode: 'wheel',
  pickerSpace: 'oklch',
  harmony: 'analogous',
  randomFlavour: 'any',
  librarySection: 'palettes'
})

export const LIBRARY_SCHEMA_VERSION = 2
export const SETTINGS_SCHEMA_VERSION = 4

export const createEmptyLibrary = (): Library => ({
  schemaVersion: LIBRARY_SCHEMA_VERSION,
  bookmarks: [],
  palettes: [],
  colors: []
})

export const createDefaultSettings = (): Settings => ({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  theme: 'system',
  defaultCopyFormat: 'hex',
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  copyPanelWidth: COPY_PANEL_DEFAULT_WIDTH,
  recentHeight: RECENT_DEFAULT_HEIGHT,
  tabs: createDefaultTabs()
})

/** Result of a screen colour pick. `null` hex means the user cancelled. */
export interface ScreenPickResult {
  hex: Hex | null
}

/** Everything the preload bridge exposes on `window.api`. */
export interface ColorFinderApi {
  library: {
    read(): Promise<Library>
    write(library: Library): Promise<void>
    /** Opens the folder holding library.json in the OS file manager. */
    revealInFolder(): Promise<void>
    /** Absolute path of library.json, shown in Settings. */
    path(): Promise<string>
  }
  settings: {
    read(): Promise<Settings>
    write(settings: Settings): Promise<void>
  }
  picker: {
    /** Opens the fullscreen eyedropper overlay. Resolves to `null` on cancel. */
    pickScreenColor(): Promise<ScreenPickResult>
  }
  files: {
    /** Shows a save dialog and writes pretty-printed JSON. Returns the path. */
    exportJson(suggestedName: string, data: unknown): Promise<string | null>
    /** Shows an open dialog and returns the parsed JSON. */
    importJson(): Promise<unknown | null>
    /** Shows an image open dialog and returns a `data:` URL. */
    openImage(): Promise<string | null>
  }
  system: {
    platform: NodeJS.Platform
    /** True when the OS reports that screen capture is not permitted. */
    screenCaptureBlocked(): Promise<boolean>
    openScreenCaptureSettings(): Promise<void>
  }
}
