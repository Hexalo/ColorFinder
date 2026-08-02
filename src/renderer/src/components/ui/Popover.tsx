import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import './Popover.css'

interface PopoverProps {
  /** The element the panel hangs off. `null` closes it. */
  anchor: HTMLElement | null
  onClose(): void
  children: ReactNode
  label: string
  width?: number
}

/** Re-measured once the panel has rendered, so the flip uses a real height. */

const MARGIN = 10

/**
 * Anchored floating panel, portalled to the body so it is never clipped by a
 * scroll container. Flips above the anchor and clamps horizontally when it
 * would run off screen.
 */
export function Popover({
  anchor,
  onClose,
  children,
  label,
  width = 268
}: PopoverProps): React.JSX.Element | null {
  const panel = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) {
      setPosition(null)
      return
    }
    const place = (): void => {
      const rect = anchor.getBoundingClientRect()
      const height = panel.current?.offsetHeight ?? 320

      const below = rect.bottom + MARGIN
      const flip = below + height > window.innerHeight && rect.top - MARGIN - height > 0
      const preferred = flip ? rect.top - MARGIN - height : below

      // Neither side may have room for a tall panel — clamp so it always stays
      // fully on screen rather than running off the bottom edge.
      const top = Math.min(Math.max(preferred, MARGIN), window.innerHeight - height - MARGIN)

      const centred = rect.left + rect.width / 2 - width / 2
      const left = Math.min(Math.max(centred, MARGIN), window.innerWidth - width - MARGIN)

      setPosition({ top: Math.max(top, MARGIN), left })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor, width])

  useEffect(() => {
    if (!anchor) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node
      // Clicking the anchor again is the caller's business (it toggles).
      if (panel.current?.contains(target) || anchor.contains(target)) return
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [anchor, onClose])

  if (!anchor) return null

  return createPortal(
    <div
      ref={panel}
      className="popover"
      role="dialog"
      aria-label={label}
      style={{
        width,
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        // Hide the first paint, before the position is measured.
        visibility: position ? 'visible' : 'hidden'
      }}
    >
      {children}
    </div>,
    document.body
  )
}
