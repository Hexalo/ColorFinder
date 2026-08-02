import { app, BrowserWindow, nativeImage, nativeTheme, shell } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc'
import { registerIpcHandlers } from './ipc'
import { disposeScreenPicker } from './services/screenPicker.service'
import { readSettings } from './services/storage.service'

const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'

/** Keep the splash up at least this long so its animation is not a flash. */
const SPLASH_MIN_MS = 1500
/** Time allowed for the splash's own exit animation before it is destroyed. */
const SPLASH_FADE_MS = 260

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

const rendererEntry = (page: string): { url?: string; file?: string } => {
  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devServer) return { url: `${devServer}/${page}` }
  return { file: join(__dirname, `../renderer/${page}`) }
}

const load = (window: BrowserWindow, page: string, query?: Record<string, string>): void => {
  const entry = rendererEntry(page)
  if (entry.url) {
    const search = query ? `?${new URLSearchParams(query).toString()}` : ''
    void window.loadURL(`${entry.url}${search}`)
  } else {
    void window.loadFile(entry.file!, { query })
  }
}

/** Used for the taskbar/dock icon in development; packaging uses build/icon.png. */
const appIcon = (): Electron.NativeImage | undefined => {
  if (!isDev) return undefined
  const image = nativeImage.createFromPath(join(__dirname, '../../build/icon.png'))
  return image.isEmpty() ? undefined : image
}

/**
 * Mirrors the renderer's `useTheme` resolution (settings.theme, falling back
 * to the OS preference for `system`) so the splash never has to wait on IPC
 * to know whether it should be light or dark.
 */
async function resolveTheme(): Promise<'light' | 'dark'> {
  const { theme } = await readSettings()
  if (theme === 'system') return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  return theme
}

function createSplashWindow(theme: 'light' | 'dark'): void {
  splashWindow = new BrowserWindow({
    width: 340,
    height: 300,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: true,
    center: true,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  splashWindow.once('ready-to-show', () => splashWindow?.show())
  splashWindow.on('closed', () => {
    splashWindow = null
  })

  load(splashWindow, 'splash.html', { theme })
}

function dismissSplash(): void {
  const splash = splashWindow
  if (!splash || splash.isDestroyed()) return
  splash.webContents.send(IPC.splashLeave)
  setTimeout(() => {
    if (!splash.isDestroyed()) splash.destroy()
  }, SPLASH_FADE_MS)
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 940,
    minHeight: 640,
    show: false,
    icon: appIcon(),
    // Warm neutral so the first paint matches the light theme instead of
    // flashing white/black.
    backgroundColor: '#f7f4ef',
    // On macOS the traffic lights are drawn over the sidebar. The renderer
    // reserves a matching strip for them (`--titlebar-height`), so the app name
    // never sits underneath the buttons.
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 15 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const openedAt = Date.now()

  mainWindow.once('ready-to-show', () => {
    // Hold the splash for its minimum time even on a fast boot.
    const remaining = Math.max(0, SPLASH_MIN_MS - (Date.now() - openedAt))
    setTimeout(() => {
      dismissSplash()
      mainWindow?.show()
      mainWindow?.focus()
    }, remaining)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // External links open in the user's browser, never inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  load(mainWindow, 'index.html')
}

// One instance only — a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(async () => {
    registerIpcHandlers()
    createSplashWindow(await resolveTheme())
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (!isMac) app.quit()
  })

  app.on('before-quit', () => {
    disposeScreenPicker()
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy()
  })
}
