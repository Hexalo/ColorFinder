import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Cancel01Icon,
  Copy01Icon,
  DragDropHorizontalIcon,
  Edit02Icon,
  SquareLock01Icon,
  SquareUnlock01Icon
} from 'hugeicons-react'
import { readableTextOn } from '../../services/color.service'
import { nameColor } from '../../services/naming.service'
import { openCopyPanel } from '../../store/copyPanelStore'
import { Popover } from '../ui/Popover'
import { QuickPicker } from './QuickPicker'
import './PaletteStrip.css'

interface PaletteStripProps {
  colors: string[]
  /** Omit to hide the lock affordance entirely (library previews, etc.). */
  locked?: boolean[]
  onToggleLock?(index: number): void
  /** Enables in-place editing through the essential picker popover. */
  onEdit?(index: number, hex: string): void
  /** Enables the per-swatch remove button. */
  onRemove?(index: number): void
  /** Enables drag-to-reorder by the swatch's grip. */
  onReorder?(from: number, to: number): void
  height?: number
  showLabels?: boolean
  /** Name carried into the copy panel when a swatch is opened from here. */
  paletteName?: string
  className?: string
}

function reorderArray<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * The strip of swatches used everywhere a palette appears. Clicking a swatch
 * opens the copy panel; the hover controls edit, lock and remove it. Keeping
 * all of that in one component is what makes a palette behave the same on
 * every page.
 */
export function PaletteStrip({
  colors,
  locked,
  onToggleLock,
  onEdit,
  onRemove,
  onReorder,
  height = 200,
  showLabels = true,
  paletteName,
  className = ''
}: PaletteStripProps): React.JSX.Element {
  const [editing, setEditing] = useState<number | null>(null)
  const anchors = useRef<(HTMLButtonElement | null)[]>([])

  /**
   * Stable per-swatch identity, independent of the swatch's colour or its
   * position. Reordering moves ids around with the data; editing never
   * touches them. That split is what lets a dragged swatch keep its DOM node
   * (so it can be measured and animated) without remounting on every hex
   * change.
   */
  const [ids, setIds] = useState<number[]>(() => colors.map((_, i) => i))
  const idsRef = useRef(ids)
  idsRef.current = ids
  const nextIdRef = useRef(colors.length)

  if (ids.length !== colors.length) {
    // Swatches were added or removed through a path we don't own locally
    // (e.g. "Add colour", or a whole new palette dropped in). Extend from
    // the end when it grew — the only shape our own callers produce — and
    // fall back to a full resync otherwise.
    const next =
      colors.length > ids.length
        ? [
            ...ids,
            ...Array.from(
              { length: colors.length - ids.length },
              (_, i) => nextIdRef.current + i
            )
          ]
        : colors.map((_, i) => i)
    nextIdRef.current = Math.max(nextIdRef.current, colors.length, ...next) + 1
    idsRef.current = next
    setIds(next)
  }

  const cellRefs = useRef(new Map<number, HTMLDivElement>())
  const flipPrevRects = useRef<Map<number, DOMRect> | null>(null)
  const dragRef = useRef<{
    id: number
    grabDX: number
    grabDY: number
    width: number
    height: number
    startX: number
    startY: number
  } | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)

  const captureRects = (): Map<number, DOMRect> => {
    const rects = new Map<number, DOMRect>()
    idsRef.current.forEach((id) => {
      const el = cellRefs.current.get(id)
      if (el) rects.set(id, el.getBoundingClientRect())
    })
    return rects
  }

  /** Reorders ids and data together, then lets the FLIP effect settle the layout. */
  const commitReorder = (from: number, to: number): void => {
    if (!onReorder || from === to || from < 0 || to < 0) return
    flipPrevRects.current = captureRects()
    const next = reorderArray(idsRef.current, from, to)
    idsRef.current = next
    setIds(next)
    onReorder(from, to)
  }

  // FLIP: after ids settle into a new order, undo the visual jump for every
  // swatch that moved (skipping the one currently following the cursor) and
  // let it ease back to zero — that's the "slide into place" animation.
  useLayoutEffect(() => {
    const prev = flipPrevRects.current
    flipPrevRects.current = null
    if (!prev) return
    ids.forEach((id) => {
      if (id === dragRef.current?.id) return
      const el = cellRefs.current.get(id)
      const prevRect = prev.get(id)
      if (!el || !prevRect) return
      const newRect = el.getBoundingClientRect()
      const dx = prevRect.left - newRect.left
      if (Math.abs(dx) < 1) return
      el.style.transitionProperty = 'none'
      el.style.transform = `translateX(${dx}px)`
      // Force a reflow so the jump above paints before we release it below.
      el.getBoundingClientRect()
      requestAnimationFrame(() => {
        el.style.transitionProperty = ''
        el.style.transform = ''
      })
    })
  }, [ids])

  const updateHoverTarget = (clientX: number): void => {
    const drag = dragRef.current
    if (!drag) return
    const currentIds = idsRef.current
    const currentIndex = currentIds.indexOf(drag.id)
    let targetIndex = currentIndex
    let bestDist = Infinity
    currentIds.forEach((id, i) => {
      const el = cellRefs.current.get(id)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(clientX - (rect.left + rect.width / 2))
      if (dist < bestDist) {
        bestDist = dist
        targetIndex = i
      }
    })
    if (targetIndex !== currentIndex) commitReorder(currentIndex, targetIndex)
  }

  const positionGhost = (clientX: number, clientY: number): void => {
    const drag = dragRef.current
    const el = ghostRef.current
    if (!drag || !el) return
    el.style.left = `${clientX - drag.grabDX}px`
    el.style.top = `${clientY - drag.grabDY}px`
  }

  const handleGripPointerDown = (event: React.PointerEvent<HTMLButtonElement>, index: number): void => {
    if (!onReorder || event.button !== 0) return
    const id = ids[index]
    const cell = cellRefs.current.get(id)
    if (!cell) return
    event.preventDefault()
    const rect = cell.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      id,
      grabDX: event.clientX - rect.left,
      grabDY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      startX: event.clientX,
      startY: event.clientY
    }
    setDraggingId(id)
  }

  // Anchor the ghost under the grab point before its first paint, so it
  // never flashes at the origin.
  useLayoutEffect(() => {
    if (draggingId === null || !dragRef.current) return
    positionGhost(dragRef.current.startX, dragRef.current.startY)
  }, [draggingId])

  const handlePointerMoveRef = useRef<(event: PointerEvent) => void>(() => {})
  handlePointerMoveRef.current = (event: PointerEvent): void => {
    positionGhost(event.clientX, event.clientY)
    updateHoverTarget(event.clientX)
  }

  useLayoutEffect(() => {
    if (draggingId === null) return undefined
    const onMove = (event: PointerEvent): void => handlePointerMoveRef.current(event)
    const endDrag = (): void => {
      dragRef.current = null
      setDraggingId(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [draggingId])

  const draggedIndex = draggingId !== null ? ids.indexOf(draggingId) : -1
  const draggedHex = draggedIndex >= 0 ? colors[draggedIndex] : null

  return (
    <div className={`strip ${draggingId !== null ? 'strip--dragging' : ''} ${className}`} style={{ height }}>
      {colors.map((hex, index) => {
        const ink = readableTextOn(hex)
        const isLocked = locked?.[index] ?? false
        const id = ids[index] ?? index

        return (
          <div
            className={[
              'strip__cell',
              editing === index ? 'is-editing' : '',
              draggingId === id ? 'is-dragging' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            key={id}
            ref={(el) => {
              if (el) cellRefs.current.set(id, el)
              else cellRefs.current.delete(id)
            }}
            style={{ background: hex, color: ink }}
          >
            <button
              type="button"
              className="strip__copy"
              onClick={() =>
                openCopyPanel({
                  kind: 'color',
                  hex,
                  label: paletteName ? `${paletteName} · ${index + 1}` : undefined
                })
              }
              aria-label={`Copy options for ${nameColor(hex)}, ${hex.toUpperCase()}`}
              title={`${nameColor(hex)} — click for copy options`}
            >
              <span className="strip__icon" aria-hidden="true">
                <Copy01Icon size={17} />
              </span>
            </button>

            <div className="strip__foot">
              {showLabels ? (
                <span className="strip__labels">
                  <span className="strip__hex mono">{hex.toUpperCase()}</span>
                  <span className="strip__name">{nameColor(hex)}</span>
                </span>
              ) : null}

              <div className="strip__actions">
                {onReorder ? (
                  <button
                    type="button"
                    className="strip__action strip__grip"
                    onPointerDown={(event) => handleGripPointerDown(event, index)}
                    onKeyDown={(event) => {
                      // Keyboard equivalent, since dragging is pointer-only.
                      if (event.key === 'ArrowLeft' && index > 0) commitReorder(index, index - 1)
                      else if (event.key === 'ArrowRight' && index < colors.length - 1) {
                        commitReorder(index, index + 1)
                      } else return
                      event.preventDefault()
                    }}
                    aria-label={`Move colour ${index + 1}. Drag, or use the arrow keys.`}
                    title="Drag to reorder"
                  >
                    <DragDropHorizontalIcon size={15} />
                  </button>
                ) : null}

                {onEdit ? (
                  <button
                    type="button"
                    className="strip__action"
                    ref={(node) => {
                      anchors.current[index] = node
                    }}
                    onClick={() => setEditing(editing === index ? null : index)}
                    aria-label={`Edit colour ${index + 1}`}
                    title="Edit this colour"
                  >
                    <Edit02Icon size={15} />
                  </button>
                ) : null}

                {onToggleLock ? (
                  <button
                    type="button"
                    className={`strip__action ${isLocked ? 'is-locked' : ''}`}
                    onClick={() => onToggleLock(index)}
                    aria-pressed={isLocked}
                    aria-label={isLocked ? `Unlock colour ${index + 1}` : `Lock colour ${index + 1}`}
                    title={isLocked ? 'Locked — kept when shuffling' : 'Unlocked'}
                  >
                    {isLocked ? <SquareLock01Icon size={15} /> : <SquareUnlock01Icon size={15} />}
                  </button>
                ) : null}

                {onRemove ? (
                  <button
                    type="button"
                    className="strip__action"
                    onClick={() => {
                      const next = ids.filter((_, i) => i !== index)
                      idsRef.current = next
                      setIds(next)
                      onRemove(index)
                    }}
                    aria-label={`Remove colour ${index + 1}`}
                    title="Remove this colour"
                  >
                    <Cancel01Icon size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}

      {onEdit && editing !== null ? (
        <Popover
          anchor={anchors.current[editing] ?? null}
          label="Edit colour"
          onClose={() => setEditing(null)}
        >
          <QuickPicker
            hex={colors[editing]}
            onChange={(next) => onEdit(editing, next)}
            onClose={() => setEditing(null)}
          />
        </Popover>
      ) : null}

      {draggingId !== null && draggedHex && dragRef.current
        ? createPortal(
            <div
              ref={ghostRef}
              className="strip__ghost"
              style={{
                width: dragRef.current.width,
                height: dragRef.current.height,
                background: draggedHex,
                color: readableTextOn(draggedHex)
              }}
            >
              <span className="strip__ghost-icon" aria-hidden="true">
                <DragDropHorizontalIcon size={16} />
              </span>
              <span className="strip__ghost-hex mono">{draggedHex.toUpperCase()}</span>
              <span className="strip__ghost-name">{nameColor(draggedHex)}</span>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
