import { useCallback, useEffect, useState } from 'react'
import { COPY_PANEL_MAX_WIDTH, COPY_PANEL_MIN_WIDTH } from '../../../shared/types'
import { useSettingsStore } from '../store/settingsStore'

/**
 * Drag-to-resize for the right-hand copy panel. Mirrors `useSidebar`, but the
 * panel is anchored to the *right* edge, so the width is measured back from
 * the window's right side.
 */
export function usePanelResize(): {
  width: number
  resizing: boolean
  startResize(event: React.PointerEvent): void
} {
  const stored = useSettingsStore((state) => state.settings.copyPanelWidth)
  const update = useSettingsStore((state) => state.update)

  const [draft, setDraft] = useState<number | null>(null)
  const [resizing, setResizing] = useState(false)

  const clamp = (value: number): number =>
    Math.min(Math.max(value, COPY_PANEL_MIN_WIDTH), COPY_PANEL_MAX_WIDTH)

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      setResizing(true)

      const onMove = (move: PointerEvent): void => {
        setDraft(clamp(window.innerWidth - move.clientX))
      }
      const onUp = (up: PointerEvent): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setResizing(false)
        setDraft(null)
        update({ copyPanelWidth: clamp(window.innerWidth - up.clientX) })
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [update]
  )

  useEffect(() => {
    if (!resizing) return undefined
    const previous = document.body.style.cursor
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = previous
      document.body.style.userSelect = ''
    }
  }, [resizing])

  return { width: draft ?? stored, resizing, startResize }
}
