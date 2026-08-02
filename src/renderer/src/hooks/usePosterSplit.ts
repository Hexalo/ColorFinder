import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { POSTER_SPLIT_MAX, POSTER_SPLIT_MIN } from '../../../shared/types'
import { useSettingsStore } from '../store/settingsStore'

/**
 * Drag-to-resize for the Poster page's two panes.
 *
 * Unlike the sidebar and the copy panel this one is stored as a fraction of
 * the page, not a pixel width: neither side has a natural size, and both
 * should keep their share when the window is resized.
 */
export function usePosterSplit(container: RefObject<HTMLElement | null>): {
  split: number
  resizing: boolean
  startResize(event: React.PointerEvent): void
} {
  const stored = useSettingsStore((state) => state.settings.posterSplit)
  const update = useSettingsStore((state) => state.update)

  const [draft, setDraft] = useState<number | null>(null)
  const [resizing, setResizing] = useState(false)

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      const node = container.current
      if (!node) return
      event.preventDefault()
      setResizing(true)

      const clampAt = (clientX: number): number => {
        const box = node.getBoundingClientRect()
        if (box.width <= 0) return POSTER_SPLIT_MIN
        const fraction = (clientX - box.left) / box.width
        return Math.min(Math.max(fraction, POSTER_SPLIT_MIN), POSTER_SPLIT_MAX)
      }

      const onMove = (move: PointerEvent): void => setDraft(clampAt(move.clientX))
      const onUp = (up: PointerEvent): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setResizing(false)
        setDraft(null)
        update({ posterSplit: clampAt(up.clientX) })
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [container, update]
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

  return { split: draft ?? stored, resizing, startResize }
}
