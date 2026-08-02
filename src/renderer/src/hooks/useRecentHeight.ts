import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  RECENT_DEFAULT_HEIGHT,
  RECENT_MAX_HEIGHT,
  RECENT_MIN_HEIGHT
} from '../../../shared/types'
import { useSettingsStore } from '../store/settingsStore'

/**
 * Drag-to-resize for the recent-colours strip at the foot of the side nav.
 *
 * The strip is anchored to the bottom, so the grabber sits on its top edge and
 * dragging *up* makes it taller — the height is measured back from where the
 * gesture started, like `usePanelResize` measures back from the window edge.
 *
 * `strip` is the scroller itself, so a gesture can tell how much of what it
 * asked for was actually granted: the nav items above never give way, and the
 * strip stops growing where they end.
 */
export function useRecentHeight(strip: React.RefObject<HTMLElement | null>): {
  height: number
  resizing: boolean
  startResize(event: React.PointerEvent): void
  /** Keyboard equivalent of the drag. */
  setHeight(px: number): void
  reset(): void
} {
  const stored = useSettingsStore((state) => state.settings.recentHeight)
  const update = useSettingsStore((state) => state.update)

  const [draft, setDraft] = useState<number | null>(null)
  const [resizing, setResizing] = useState(false)

  const clamp = (value: number): number =>
    Math.min(Math.max(Math.round(value), RECENT_MIN_HEIGHT), RECENT_MAX_HEIGHT)

  /**
   * What to remember once the gesture ends.
   *
   * A strip that is scrolling has taken every pixel it was allowed, so its own
   * height is the true ceiling — lower than the request whenever the nav items
   * above have claimed the room. Storing that instead keeps the next drag
   * tracking the pointer from the first pixel rather than working off an
   * ambition the sidebar never granted. A strip that is *not* scrolling is
   * simply shorter than its allowance, which says nothing about the ceiling.
   */
  const settle = (requested: number): number => {
    const node = strip.current
    if (!node || node.scrollHeight <= node.clientHeight) return requested
    return Math.min(requested, clamp(node.getBoundingClientRect().height))
  }

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      setResizing(true)

      const startY = event.clientY
      const startHeight = stored
      const heightAt = (clientY: number): number => clamp(startHeight + (startY - clientY))

      const onMove = (move: PointerEvent): void => setDraft(heightAt(move.clientY))
      const onUp = (up: PointerEvent): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setResizing(false)

        // What the sidebar granted is only readable once the final request is
        // in the DOM, so commit it before measuring — otherwise `settle` reads
        // the height from before the gesture and the strip snaps back. This is
        // a window listener, not a render, so a synchronous flush is safe, and
        // it keeps the answer independent of when React would have got round
        // to it.
        const requested = heightAt(up.clientY)
        flushSync(() => setDraft(requested))
        update({ recentHeight: settle(requested) })
        setDraft(null)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [stored, update]
  )

  useEffect(() => {
    if (!resizing) return undefined
    const previous = document.body.style.cursor
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = previous
      document.body.style.userSelect = ''
    }
  }, [resizing])

  return {
    height: draft ?? stored,
    resizing,
    startResize,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setHeight: useCallback((px: number) => update({ recentHeight: settle(clamp(px)) }), [update]),
    reset: useCallback(() => update({ recentHeight: RECENT_DEFAULT_HEIGHT }), [update])
  }
}
