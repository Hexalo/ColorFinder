import { useCallback, useEffect, useRef, useState } from 'react'

export interface DragPoint {
  /** Position inside the element, normalised to 0–1. */
  x: number
  y: number
}

/**
 * Pointer dragging for the canvas colour widgets. Captures the pointer so the
 * drag keeps tracking when the cursor leaves the wheel or the square, which is
 * what makes fine adjustments at the edges feel right.
 */
export function useDragValue(
  onChange: (point: DragPoint, event: PointerEvent | React.PointerEvent) => void
): {
  dragging: boolean
  handlers: { onPointerDown: (event: React.PointerEvent<HTMLElement>) => void }
} {
  const [dragging, setDragging] = useState(false)
  const element = useRef<HTMLElement | null>(null)
  const latest = useRef(onChange)
  latest.current = onChange

  const emit = useCallback((clientX: number, clientY: number, event: PointerEvent | React.PointerEvent) => {
    const node = element.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    latest.current(
      {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height
      },
      event
    )
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      element.current = event.currentTarget
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
      emit(event.clientX, event.clientY, event)
    },
    [emit]
  )

  useEffect(() => {
    if (!dragging) return undefined
    const onMove = (event: PointerEvent): void => emit(event.clientX, event.clientY, event)
    const onUp = (): void => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, emit])

  return { dragging, handlers: { onPointerDown } }
}
