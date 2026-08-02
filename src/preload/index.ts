import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { ColorFinderApi, Hex, Library, ScreenPickResult, Settings } from '../shared/types'

/** The only surface the renderer gets. No `require`, no raw ipcRenderer. */
const api: ColorFinderApi = {
  library: {
    read: () => ipcRenderer.invoke(IPC.libraryRead) as Promise<Library>,
    write: (library) => ipcRenderer.invoke(IPC.libraryWrite, library) as Promise<void>,
    revealInFolder: () => ipcRenderer.invoke(IPC.libraryReveal) as Promise<void>,
    path: () => ipcRenderer.invoke(IPC.libraryPath) as Promise<string>
  },
  settings: {
    read: () => ipcRenderer.invoke(IPC.settingsRead) as Promise<Settings>,
    write: (settings) => ipcRenderer.invoke(IPC.settingsWrite, settings) as Promise<void>
  },
  picker: {
    pickScreenColor: () => ipcRenderer.invoke(IPC.pickerStart) as Promise<ScreenPickResult>
  },
  files: {
    exportJson: (name, data) =>
      ipcRenderer.invoke(IPC.filesExportJson, name, data) as Promise<string | null>,
    importJson: () => ipcRenderer.invoke(IPC.filesImportJson) as Promise<unknown | null>,
    openImage: () => ipcRenderer.invoke(IPC.filesOpenImage) as Promise<string | null>,
    exportImage: (name, bytes, format) =>
      ipcRenderer.invoke(IPC.filesExportImage, name, bytes, format) as Promise<string | null>
  },
  system: {
    platform: process.platform,
    screenCaptureBlocked: () =>
      ipcRenderer.invoke(IPC.systemScreenCaptureBlocked) as Promise<boolean>,
    openScreenCaptureSettings: () =>
      ipcRenderer.invoke(IPC.systemOpenScreenCaptureSettings) as Promise<void>
  }
}

export interface PickerFrame {
  dataUrl: string
  pixelWidth: number
  pixelHeight: number
}

/** Separate, minimal bridge used only by the fullscreen eyedropper overlay. */
const pickerApi = {
  onFrame: (handler: (frame: PickerFrame) => void): void => {
    ipcRenderer.on(IPC.pickerFrame, (_event, frame: PickerFrame) => handler(frame))
  },
  commit: (hex: Hex): void => {
    ipcRenderer.send(IPC.pickerCommit, hex)
  },
  cancel: (): void => {
    ipcRenderer.send(IPC.pickerCancel)
  }
}

/** Even smaller bridge for the splash window. */
const splashApi = {
  onLeave: (handler: () => void): void => {
    ipcRenderer.on(IPC.splashLeave, () => handler())
  }
}

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld('pickerApi', pickerApi)
contextBridge.exposeInMainWorld('splashApi', splashApi)
