import { BrowserWindow, dialog } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'
import type { ImageFormat } from '../../shared/types'

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif'
}

/** Save dialog + pretty-printed JSON write. Returns the path, or `null`. */
export async function exportJson(
  parent: BrowserWindow | null,
  suggestedName: string,
  data: unknown
): Promise<string | null> {
  const options = {
    title: 'Export as JSON',
    defaultPath: suggestedName.endsWith('.json') ? suggestedName : `${suggestedName}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  }
  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)

  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  return result.filePath
}

/** Open dialog + JSON parse. Returns the parsed value, or `null`. */
export async function importJson(parent: BrowserWindow | null): Promise<unknown | null> {
  const options = {
    title: 'Import JSON',
    properties: ['openFile' as const],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  }
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)

  const path = result.filePaths[0]
  if (result.canceled || !path) return null
  return JSON.parse(await readFile(path, 'utf-8')) as unknown
}

/**
 * Reads an image the user chooses into a `data:` URL, so the renderer can draw
 * it on a canvas without needing filesystem access.
 */
export async function openImage(parent: BrowserWindow | null): Promise<string | null> {
  const options = {
    title: 'Choose an image',
    properties: ['openFile' as const],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'] }
    ]
  }
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)

  const path = result.filePaths[0]
  if (result.canceled || !path) return null

  const mime = MIME_BY_EXTENSION[extname(path).toLowerCase()] ?? 'image/png'
  const buffer = await readFile(path)
  return `data:${mime};base64,${buffer.toString('base64')}`
}

const IMAGE_FILTERS: Record<ImageFormat, { name: string; extensions: string[] }> = {
  png: { name: 'PNG image', extensions: ['png'] },
  jpeg: { name: 'JPEG image', extensions: ['jpg', 'jpeg'] },
  webp: { name: 'WebP image', extensions: ['webp'] }
}

/**
 * Save dialog + raw byte write, used by the poster exporter. The renderer
 * encodes the canvas itself, so this side only has to pick the filters and
 * put the bytes on disk.
 */
export async function exportImage(
  parent: BrowserWindow | null,
  suggestedName: string,
  bytes: Uint8Array,
  format: ImageFormat
): Promise<string | null> {
  const filter = IMAGE_FILTERS[format] ?? IMAGE_FILTERS.png
  const extension = filter.extensions[0]
  const options = {
    title: 'Export poster',
    defaultPath: suggestedName.endsWith(`.${extension}`)
      ? suggestedName
      : `${suggestedName}.${extension}`,
    filters: [filter]
  }
  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)

  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  return result.filePath
}
