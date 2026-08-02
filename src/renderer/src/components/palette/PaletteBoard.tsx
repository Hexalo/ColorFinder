import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Add01Icon,
  Bookmark02Icon,
  Copy01Icon,
  Download01Icon,
  ShuffleIcon,
  SquareUnlock01Icon
} from 'hugeicons-react'
import { PaletteStrip } from '../color/PaletteStrip'
import { Button } from '../ui/Button'
import { looseDocument, paletteFileName } from '../../services/export.service'
import { rotateHue } from '../../services/color.service'
import { randomHex } from '../../services/random.service'
import { openCopyPanel } from '../../store/copyPanelStore'
import { toast } from '../../store/toastStore'
import type { PaletteSource } from '../../types'
import { SavePaletteDialog } from './SavePaletteDialog'
import './PaletteBoard.css'

interface PaletteBoardProps {
  colors: string[]
  onChange(colors: string[]): void
  /** Used for the save dialog, the export filename and the copy panel title. */
  name: string
  source: PaletteSource
  locked?: boolean[]
  onToggleLock?(index: number): void
  onClearLocks?(): void
  onShuffle?(): void
  /** Emphasise shuffling where it is the page's main gesture (Random). */
  shufflePrimary?: boolean
  /**
   * Removal by index. Pass it when locks are in play so they stay aligned —
   * `onChange` alone cannot say *which* swatch went.
   */
  onRemoveAt?(index: number): void
  /** Enables drag-to-reorder. Same reason as `onRemoveAt`: locks must follow. */
  onReorder?(from: number, to: number): void
  /** Off when the palette is already stored and edits write through live. */
  showSave?: boolean
  height?: number
  minColors?: number
  maxColors?: number
  /** Page-specific controls, rendered at the start of the toolbar. */
  extras?: ReactNode
  hint?: ReactNode
}

const DEFAULT_MIN = 1
const DEFAULT_MAX = 12

/**
 * The one palette surface in the app.
 *
 * Harmonies, Random, From image and the Library all render this, so a palette
 * always offers the same things in the same place: edit a swatch in place, add
 * or remove colours, then copy, export or save the result. Pages only add
 * their own generator controls through `extras`.
 */
export function PaletteBoard({
  colors,
  onChange,
  name,
  source,
  locked,
  onToggleLock,
  onClearLocks,
  onShuffle,
  shufflePrimary = false,
  onRemoveAt,
  onReorder,
  showSave = true,
  height = 220,
  minColors = DEFAULT_MIN,
  maxColors = DEFAULT_MAX,
  extras,
  hint
}: PaletteBoardProps): React.JSX.Element {
  const [saving, setSaving] = useState(false)

  const setAt = (index: number, hex: string): void =>
    onChange(colors.map((item, i) => (i === index ? hex : item)))

  const removeAt = (index: number): void =>
    onRemoveAt ? onRemoveAt(index) : onChange(colors.filter((_, i) => i !== index))

  /** Fallback reorder for callers with no locks to keep aligned. */
  const reorder = (from: number, to: number): void => {
    const next = [...colors]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  /** New swatches continue the palette rather than dropping in a stranger. */
  const addColor = (): void => {
    const last = colors[colors.length - 1]
    onChange([...colors, last ? rotateHue(last, 32) : randomHex()])
  }

  const exportJson = async (): Promise<void> => {
    const path = await window.api.files.exportJson(
      paletteFileName(name),
      looseDocument(name, colors)
    )
    if (path) toast.success('Palette exported.')
  }

  return (
    <div className="board">
      <PaletteStrip
        colors={colors}
        locked={locked}
        onToggleLock={onToggleLock}
        onEdit={setAt}
        onRemove={colors.length > minColors ? removeAt : undefined}
        onReorder={onReorder ?? reorder}
        paletteName={name}
        height={height}
      />

      <div className="board__toolbar">
        <div className="board__group">
          {extras}
          <Button
            size="sm"
            icon={<Add01Icon size={15} />}
            disabled={colors.length >= maxColors}
            onClick={addColor}
          >
            Add colour
          </Button>
          {onShuffle ? (
            <Button
              size="sm"
              variant={shufflePrimary ? 'primary' : 'secondary'}
              icon={<ShuffleIcon size={15} />}
              onClick={onShuffle}
            >
              Shuffle unlocked
            </Button>
          ) : null}
          {onClearLocks ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<SquareUnlock01Icon size={15} />}
              onClick={onClearLocks}
            >
              Clear locks
            </Button>
          ) : null}
        </div>

        <div className="board__group">
          <Button
            size="sm"
            icon={<Copy01Icon size={15} />}
            onClick={() => openCopyPanel({ kind: 'palette', colors, name })}
          >
            Copy
          </Button>
          <Button size="sm" icon={<Download01Icon size={15} />} onClick={() => void exportJson()}>
            Export JSON
          </Button>
          {showSave ? (
            <Button
              size="sm"
              variant="primary"
              icon={<Bookmark02Icon size={15} />}
              onClick={() => setSaving(true)}
            >
              Save to library
            </Button>
          ) : null}
        </div>
      </div>

      {hint ? <p className="board__hint">{hint}</p> : null}

      <SavePaletteDialog
        open={saving}
        colors={colors}
        source={source}
        suggestedName={name}
        onClose={() => setSaving(false)}
      />
    </div>
  )
}
