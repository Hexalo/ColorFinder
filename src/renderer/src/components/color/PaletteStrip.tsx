import { useRef, useState } from 'react'
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
  /** Index being dragged, and the cell currently under the pointer. */
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const anchors = useRef<(HTMLButtonElement | null)[]>([])

  return (
    <div className={`strip ${className}`} style={{ height }}>
      {colors.map((hex, index) => {
        const ink = readableTextOn(hex)
        const isLocked = locked?.[index] ?? false

        return (
          <div
            /* Keep the controls visible while this swatch's picker is open. */
            className={[
              'strip__cell',
              editing === index ? 'is-editing' : '',
              dragFrom === index ? 'is-dragging' : '',
              dragOver === index && dragFrom !== null && dragFrom !== index ? 'is-drop-target' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onDragOver={
              onReorder && dragFrom !== null
                ? (event) => {
                    // Without preventDefault the browser refuses the drop.
                    event.preventDefault()
                    setDragOver(index)
                  }
                : undefined
            }
            onDrop={
              onReorder
                ? (event) => {
                    event.preventDefault()
                    if (dragFrom !== null) onReorder(dragFrom, index)
                    setDragFrom(null)
                    setDragOver(null)
                  }
                : undefined
            }
            /*
             * Keyed by position, not by colour. Including the hex would make
             * React remount the cell on every edit — which recreates the
             * popover's anchor node mid-drag and replays the entry animation.
             */
            key={index}
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
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      // Firefox ignores a drag with no payload.
                      event.dataTransfer.setData('text/plain', String(index))
                      setDragFrom(index)
                    }}
                    onDragEnd={() => {
                      setDragFrom(null)
                      setDragOver(null)
                    }}
                    onKeyDown={(event) => {
                      // Keyboard equivalent, since dragging is pointer-only.
                      if (event.key === 'ArrowLeft' && index > 0) onReorder(index, index - 1)
                      else if (event.key === 'ArrowRight' && index < colors.length - 1) {
                        onReorder(index, index + 1)
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
                    onClick={() => onRemove(index)}
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
    </div>
  )
}
