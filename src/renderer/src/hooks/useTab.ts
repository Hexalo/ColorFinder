import { useCallback } from 'react'
import type { TabState } from '../../../shared/types'
import { useSettingsStore } from '../store/settingsStore'

/**
 * A segmented-control selection that survives navigation.
 *
 * Pages are remounted on every route change (the outlet is keyed by route so
 * the entry animation replays), so local `useState` would reset the tabs every
 * time. Parking them in settings keeps them across page changes *and* restarts.
 */
export function useTab<T extends string>(key: keyof TabState, fallback: T): [T, (value: T) => void] {
  const stored = useSettingsStore((state) => state.settings.tabs[key])
  const update = useSettingsStore((state) => state.update)
  const tabs = useSettingsStore((state) => state.settings.tabs)

  const set = useCallback(
    (value: T) => update({ tabs: { ...tabs, [key]: value } }),
    [update, tabs, key]
  )

  return [(stored as T) || fallback, set]
}
