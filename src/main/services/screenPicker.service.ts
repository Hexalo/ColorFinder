import { BrowserWindow, desktopCapturer, ipcMain, screen, shell, systemPreferences } from 'electron'
import type { Display } from 'electron'
import { join } from 'node:path'
import { IPC } from '../../shared/ipc'
import type { Hex } from '../../shared/types'

/**
 * Cross-platform eyedropper.
 *
 * There is no OS-agnostic "read the pixel under the cursor" API, so we do what
 * every cross-platform picker does: grab a full-resolution screenshot of each
 * display, cover each display with a frameless always-on-top window showing
 * that screenshot, and read the pixel the user clicks on. This behaves
 * identically on macOS, Windows and Linux.
 *
 * macOS only: the first capture triggers the Screen Recording permission
 * prompt; until the user grants it the thumbnails come back empty.
 */

interface Session {
  windows: BrowserWindow[]
  resolve: (hex: Hex | null) => void
  settled: boolean
}

let session: Session | null = null

export class ScreenCaptureBlockedError extends Error {
  constructor() {
    super('Screen capture is not permitted by the operating system.')
    this.name = 'ScreenCaptureBlockedError'
  }
}

/** macOS reports capture permission explicitly; other platforms always allow. */
export function isScreenCaptureBlocked(): boolean {
  if (process.platform !== 'darwin') return false
  const status = systemPreferences.getMediaAccessStatus('screen')
  return status === 'denied' || status === 'restricted'
}

export async function openScreenCaptureSettings(): Promise<void> {
  if (process.platform === 'darwin') {
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    )
  }
}

const pixelSize = (display: Display): { width: number; height: number } => ({
  width: Math.round(display.size.width * display.scaleFactor),
  height: Math.round(display.size.height * display.scaleFactor)
})

/**
 * Screenshots every display at its native pixel resolution, keyed by display
 * id. Displays that share a resolution are captured in one call.
 */
async function captureDisplays(displays: Display[]): Promise<Map<number, string>> {
  const groups = new Map<string, Display[]>()
  for (const display of displays) {
    const { width, height } = pixelSize(display)
    const key = `${width}x${height}`
    const group = groups.get(key)
    if (group) group.push(display)
    else groups.set(key, [display])
  }

  const frames = new Map<number, string>()
  for (const [key, group] of groups) {
    const [width, height] = key.split('x').map(Number)
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
      fetchWindowIcons: false
    })

    for (const display of group) {
      // `display_id` is the reliable match, but it comes back empty on some
      // Linux setups — fall back to the display's position in the list.
      const source =
        sources.find((candidate) => candidate.display_id === String(display.id)) ??
        sources[displays.indexOf(display)] ??
        sources[0]

      if (source && !source.thumbnail.isEmpty()) {
        frames.set(display.id, source.thumbnail.toDataURL())
      }
    }
  }
  return frames
}

function overlayUrl(): { url?: string; file?: string } {
  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (devServer) return { url: `${devServer}/picker.html` }
  return { file: join(__dirname, '../renderer/picker.html') }
}

function createOverlay(display: Display, frame: string): BrowserWindow {
  const window = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    enableLargerThanScreen: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 'screen-saver' floats above the macOS menu bar and the Windows taskbar.
  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  const target = overlayUrl()
  if (target.url) void window.loadURL(target.url)
  else void window.loadFile(target.file!)

  window.webContents.once('did-finish-load', () => {
    const { width, height } = pixelSize(display)
    window.webContents.send(IPC.pickerFrame, {
      dataUrl: frame,
      pixelWidth: width,
      pixelHeight: height
    })
    window.show()
  })

  return window
}

function settle(hex: Hex | null): void {
  if (!session || session.settled) return
  session.settled = true
  const { windows, resolve } = session
  session = null
  for (const window of windows) {
    if (!window.isDestroyed()) window.destroy()
  }
  resolve(hex)
}

/**
 * Opens the overlay and resolves with the picked colour, or `null` if the user
 * pressed Escape / right-clicked / closed the overlay.
 */
export async function pickScreenColor(): Promise<Hex | null> {
  // A second request while one is in flight just returns the running one.
  if (session) return null

  const displays = screen.getAllDisplays()

  // Attempt the capture before consulting the permission status: on macOS the
  // Screen Recording prompt is only raised by a real capture attempt, so
  // short-circuiting on `getMediaAccessStatus` would send the user to System
  // Settings for an app the system has not even listed yet.
  let frames: Map<number, string>
  try {
    frames = await captureDisplays(displays)
  } catch (error) {
    console.error('[picker] capture failed', error)
    throw new ScreenCaptureBlockedError()
  }

  if (frames.size === 0 || isScreenCaptureBlocked()) throw new ScreenCaptureBlockedError()

  return new Promise<Hex | null>((resolve) => {
    const windows: BrowserWindow[] = []
    session = { windows, resolve, settled: false }

    for (const display of displays) {
      const frame = frames.get(display.id)
      if (!frame) continue
      const window = createOverlay(display, frame)
      window.on('closed', () => settle(null))
      windows.push(window)
    }

    if (windows.length === 0) {
      settle(null)
      return
    }

    // Focus the overlay the pointer is already on so Escape works immediately.
    const cursor = screen.getCursorScreenPoint()
    const active = screen.getDisplayNearestPoint(cursor)
    const index = displays.findIndex((display) => display.id === active.id)
    const focused = windows[index >= 0 ? Math.min(index, windows.length - 1) : 0]
    focused.focus()
  })
}

export function registerScreenPickerIpc(): void {
  ipcMain.on(IPC.pickerCommit, (_event, hex: Hex) => settle(hex))
  ipcMain.on(IPC.pickerCancel, () => settle(null))
}

/** Called on app quit so a stuck overlay never keeps the process alive. */
export function disposeScreenPicker(): void {
  settle(null)
}
