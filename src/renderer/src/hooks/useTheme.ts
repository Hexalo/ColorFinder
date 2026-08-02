import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import type { ThemeMode } from '../types'

const QUERY = '(prefers-color-scheme: dark)'

/**
 * Resolves the `system` theme mode against the OS preference and writes the
 * result to `<html data-theme>`, which every stylesheet keys off.
 */
export function useTheme(): { mode: ThemeMode; resolved: 'light' | 'dark' } {
  const mode = useSettingsStore((state) => state.settings.theme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent): void => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [resolved])

  return { mode, resolved }
}
