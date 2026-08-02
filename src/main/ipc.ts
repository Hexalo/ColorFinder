import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import type { ImageFormat, Library, ScreenPickResult, Settings } from '../shared/types'
import { exportImage, exportJson, importJson, openImage } from './services/files.service'
import {
  isScreenCaptureBlocked,
  openScreenCaptureSettings,
  pickScreenColor,
  registerScreenPickerIpc
} from './services/screenPicker.service'
import {
  libraryPath,
  readLibrary,
  readSettings,
  revealDataFolder,
  writeLibrary,
  writeSettings
} from './services/storage.service'

const senderWindow = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null =>
  BrowserWindow.fromWebContents(event.sender)

export function registerIpcHandlers(): void {
  registerScreenPickerIpc()

  ipcMain.handle(IPC.libraryRead, () => readLibrary())
  ipcMain.handle(IPC.libraryWrite, (_event, library: Library) => writeLibrary(library))
  ipcMain.handle(IPC.libraryReveal, () => revealDataFolder())
  ipcMain.handle(IPC.libraryPath, () => libraryPath())

  ipcMain.handle(IPC.settingsRead, () => readSettings())
  ipcMain.handle(IPC.settingsWrite, (_event, settings: Settings) => writeSettings(settings))

  ipcMain.handle(IPC.pickerStart, async (): Promise<ScreenPickResult> => {
    return { hex: await pickScreenColor() }
  })

  ipcMain.handle(IPC.filesExportJson, (event, name: string, data: unknown) =>
    exportJson(senderWindow(event), name, data)
  )
  ipcMain.handle(IPC.filesImportJson, (event) => importJson(senderWindow(event)))
  ipcMain.handle(IPC.filesOpenImage, (event) => openImage(senderWindow(event)))
  ipcMain.handle(
    IPC.filesExportImage,
    (event, name: string, bytes: Uint8Array, format: ImageFormat) =>
      exportImage(senderWindow(event), name, bytes, format)
  )

  ipcMain.handle(IPC.systemScreenCaptureBlocked, () => isScreenCaptureBlocked())
  ipcMain.handle(IPC.systemOpenScreenCaptureSettings, () => openScreenCaptureSettings())
}
