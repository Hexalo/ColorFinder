import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH
} from '../../../shared/types'
import { useSettingsStore } from '../store/settingsStore'

/** Drag below this and the release snaps the sidebar shut. */
const COLLAPSE_THRESHOLD = SIDEBAR_MIN_WIDTH - 26

interface Sidebar {
  collapsed: boolean
  width: number
  /** True while the user is dragging the edge — suppresses width transitions. */
  resizing: boolean
  toggle(): void
  startResize(event: React.PointerEvent): void
}

/**
 * Owns the side nav geometry. The committed value lives in settings.json, but
 * dragging updates a local value first so we are not writing to disk on every
 * pointer move.
 */
export function useSidebar(): Sidebar {
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)

  const [draftWidth, setDraftWidth] = useState<number | null>(null)
  const [resizing, setResizing] = useState(false)
  const collapsedRef = useRef(settings.sidebarCollapsed)
  collapsedRef.current = settings.sidebarCollapsed

  const width = draftWidth ?? settings.sidebarWidth

  const toggle = useCallback(() => {
    update({ sidebarCollapsed: !collapsedRef.current })
  }, [update])

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      setResizing(true)

      const onMove = (move: PointerEvent): void => {
        // The sidebar is flush against the window's left edge, so the pointer's
        // client X *is* the width.
        setDraftWidth(Math.min(Math.max(move.clientX, 60), SIDEBAR_MAX_WIDTH))
      }

      const onUp = (up: PointerEvent): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setResizing(false)
        setDraftWidth(null)

        const raw = Math.min(Math.max(up.clientX, 60), SIDEBAR_MAX_WIDTH)
        if (raw < COLLAPSE_THRESHOLD) {
          update({ sidebarCollapsed: true })
        } else {
          update({
            sidebarCollapsed: false,
            sidebarWidth: Math.min(Math.max(raw, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)
          })
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [update]
  )

  // Dragging over the app should not select text or flip the cursor around.
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

  return {
    collapsed: settings.sidebarCollapsed && !resizing,
    width,
    resizing,
    toggle,
    startResize
  }
}
