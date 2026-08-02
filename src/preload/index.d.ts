import type { ColorFinderApi, Hex } from '../shared/types'

export interface PickerFrame {
  dataUrl: string
  pixelWidth: number
  pixelHeight: number
}

export interface PickerApi {
  onFrame(handler: (frame: PickerFrame) => void): void
  commit(hex: Hex): void
  cancel(): void
}

export interface SplashApi {
  onLeave(handler: () => void): void
}

declare global {
  interface Window {
    /** Absent when the renderer is opened in a plain browser during development. */
    api: ColorFinderApi
    pickerApi: PickerApi
    splashApi?: SplashApi
  }
}

export {}
