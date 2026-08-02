import { app, shell } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  createDefaultSettings,
  createEmptyLibrary,
  COPY_PANEL_MAX_WIDTH,
  COPY_PANEL_MIN_WIDTH,
  LIBRARY_SCHEMA_VERSION,
  RECENT_MAX_HEIGHT,
  RECENT_MIN_HEIGHT,
  SETTINGS_SCHEMA_VERSION,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  type Library,
  type Settings
} from '../../shared/types'

/**
 * User data lives as plain, human-readable JSON under the OS user-data folder:
 *
 *   macOS   ~/Library/Application Support/color-finder/data/
 *   Windows %APPDATA%/color-finder/data/
 *   Linux   ~/.config/color-finder/data/
 */
const dataDir = (): string => join(app.getPath('userData'), 'data')

export const libraryPath = (): string => join(dataDir(), 'library.json')
export const settingsPath = (): string => join(dataDir(), 'settings.json')

/** Pretty-printed with a trailing newline so the files stay diff-friendly. */
const serialize = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

/**
 * Write through a temporary file then rename, so a crash mid-write cannot
 * leave the user with a truncated library.
 */
async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, serialize(value), 'utf-8')
  await rename(tmp, path)
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    // A hand-edited file that no longer parses should not brick the app.
    console.error(`[storage] could not read ${path}:`, error)
    return null
  }
}

/**
 * Brings an older file up to the current shape. Today there is only one
 * version, but every future change gets a step here instead of silently
 * breaking somebody's saved palettes.
 */
/** v1 -> v2 added standalone saved colours. */
function migrateLibrary(raw: Partial<Library> | null): Library {
  if (!raw) return createEmptyLibrary()
  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    palettes: Array.isArray(raw.palettes) ? raw.palettes : [],
    colors: Array.isArray(raw.colors) ? raw.colors : []
  }
}

/**
 * v1 -> v2 added the side nav state, v2 -> v3 the copy panel width and the
 * remembered tab selections, v3 -> v4 the height of the recent strip. Missing
 * fields fall back to the defaults, so an older settings.json upgrades in
 * place on first read.
 */
function migrateSettings(raw: Partial<Settings> | null): Settings {
  const defaults = createDefaultSettings()
  if (!raw) return defaults
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    theme: raw.theme ?? defaults.theme,
    defaultCopyFormat: raw.defaultCopyFormat ?? defaults.defaultCopyFormat,
    sidebarCollapsed: raw.sidebarCollapsed ?? defaults.sidebarCollapsed,
    sidebarWidth: clamp(raw.sidebarWidth ?? defaults.sidebarWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH),
    copyPanelWidth: clamp(
      raw.copyPanelWidth ?? defaults.copyPanelWidth,
      COPY_PANEL_MIN_WIDTH,
      COPY_PANEL_MAX_WIDTH
    ),
    recentHeight: clamp(
      raw.recentHeight ?? defaults.recentHeight,
      RECENT_MIN_HEIGHT,
      RECENT_MAX_HEIGHT
    ),
    tabs: { ...defaults.tabs, ...(raw.tabs ?? {}) }
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(value), min), max)

export async function readLibrary(): Promise<Library> {
  return migrateLibrary(await readJson<Library>(libraryPath()))
}

export async function writeLibrary(library: Library): Promise<void> {
  await writeJsonAtomic(libraryPath(), {
    ...library,
    schemaVersion: LIBRARY_SCHEMA_VERSION
  })
}

export async function readSettings(): Promise<Settings> {
  return migrateSettings(await readJson<Settings>(settingsPath()))
}

export async function writeSettings(settings: Settings): Promise<void> {
  await writeJsonAtomic(settingsPath(), {
    ...settings,
    schemaVersion: SETTINGS_SCHEMA_VERSION
  })
}

export async function revealDataFolder(): Promise<void> {
  await mkdir(dataDir(), { recursive: true })
  // Make sure the file exists so the OS highlights something meaningful.
  const path = libraryPath()
  if (!(await readJson(path))) await writeLibrary(createEmptyLibrary())
  shell.showItemInFolder(path)
}
