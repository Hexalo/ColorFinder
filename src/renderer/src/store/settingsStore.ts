import { create } from 'zustand'
import { createDefaultSettings } from '../../../shared/types'
import type { Settings, ThemeMode } from '../types'
import { toast } from './toastStore'

interface SettingsState {
  settings: Settings
  loaded: boolean
  load(): Promise<void>
  update(patch: Partial<Settings>): void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: createDefaultSettings(),
  loaded: false,

  load: async () => {
    try {
      set({ settings: await window.api.settings.read(), loaded: true })
    } catch (error) {
      console.error('[settings] read failed', error)
      set({ loaded: true })
    }
  },

  update: (patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    // Persist on a best-effort basis. This runs inside React event handlers, so
    // it must never throw synchronously — a missing bridge or a failed write
    // should not stop the UI from reflecting the change.
    try {
      void window.api.settings.write(next).catch((error: unknown) => {
        console.error('[settings] write failed', error)
        toast.error('Could not save your settings.')
      })
    } catch (error) {
      console.error('[settings] write unavailable', error)
    }
  }
}))

export const setTheme = (theme: ThemeMode): void => useSettingsStore.getState().update({ theme })
