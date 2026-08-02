import { useState } from 'react'
import {
  Bookmark02Icon,
  CircleIcon,
  Copy01Icon,
  FlashIcon,
  Moon01Icon,
  ShuffleIcon,
  SparklesIcon
} from 'hugeicons-react'
import { Page, Section } from '../components/layout/Page'
import { PaletteBoard } from '../components/palette/PaletteBoard'
import { SaveColorDialog } from '../components/palette/SaveColorDialog'
import { Button } from '../components/ui/Button'
import { Range, Segmented } from '../components/ui/Field'
import { useHotkey } from '../hooks/useHotkey'
import { usePaletteEditor } from '../hooks/usePaletteEditor'
import { useTab } from '../hooks/useTab'
import { readableTextOn } from '../services/color.service'
import { nameColor } from '../services/naming.service'
import { randomHex, randomPalette, type RandomFlavour } from '../services/random.service'
import { useColorStore } from '../store/colorStore'
import { openCopyPanel } from '../store/copyPanelStore'
import './RandomPage.css'

const FLAVOURS: { value: RandomFlavour; label: string; icon: React.ReactNode }[] = [
  { value: 'any', label: 'Any', icon: <ShuffleIcon size={14} strokeWidth={1.8} /> },
  { value: 'vivid', label: 'Vivid', icon: <FlashIcon size={14} strokeWidth={1.8} /> },
  { value: 'pastel', label: 'Pastel', icon: <SparklesIcon size={14} strokeWidth={1.8} /> },
  { value: 'muted', label: 'Muted', icon: <CircleIcon size={14} strokeWidth={1.8} /> },
  { value: 'dark', label: 'Dark', icon: <Moon01Icon size={14} strokeWidth={1.8} /> }
]

export function RandomPage(): React.JSX.Element {
  const [flavour, setFlavour] = useTab<RandomFlavour>('randomFlavour', 'any')
  const [size, setSize] = useState(5)

  /**
   * Rolling drives the app's working colour rather than a local one, so a
   * colour you like here is already current everywhere else — the picker, the
   * harmonies and the side nav all follow along.
   */
  const single = useColorStore((state) => state.hex)
  const setHex = useColorStore((state) => state.setHex)
  const remember = useColorStore((state) => state.remember)

  const [savingColor, setSavingColor] = useState(false)
  const editor = usePaletteEditor(randomPalette(5))

  const rollSingle = (): void => {
    const next = randomHex(flavour)
    setHex(next)
    remember(next)
  }

  const rollPalette = (): void => {
    const fresh = randomPalette(size, flavour)
    // Locked swatches survive the roll; everything else is replaced.
    editor.setColors(
      Array.from({ length: size }, (_, index) =>
        editor.locked[index] ? (editor.colors[index] ?? fresh[index]) : fresh[index]
      )
    )
  }

  useHotkey(' ', rollPalette)
  useHotkey('r', rollSingle)

  return (
    <Page
      title="Random"
      actions={
        <Segmented
          ariaLabel="Random flavour"
          size="sm"
          value={flavour}
          options={FLAVOURS}
          onChange={setFlavour}
        />
      }
    >
      <Section title="Current colour" hint="Press R to roll another.">
        <div className="random__single card">
          <button
            type="button"
            className="random__swatch"
            style={{ background: single, color: readableTextOn(single) }}
            onClick={() => openCopyPanel({ kind: 'color', hex: single, label: nameColor(single) })}
            title="Open copy options"
          >
            <span className="random__swatch-hex mono">{single.toUpperCase()}</span>
            <span className="random__swatch-name">{nameColor(single)}</span>
          </button>

          <div className="random__single-actions">
            <Button variant="primary" icon={<ShuffleIcon size={16} />} onClick={rollSingle}>
              Roll again
            </Button>
            <Button
              icon={<Copy01Icon size={16} />}
              onClick={() => openCopyPanel({ kind: 'color', hex: single, label: nameColor(single) })}
            >
              Copy&hellip;
            </Button>
            <Button
              icon={<Bookmark02Icon size={16} />}
              onClick={() => setSavingColor(true)}
            >
              Save to library
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Random palette"
        hint="Press Space to reshuffle the unlocked swatches."
        actions={
          <div className="random__size">
            <Range
              label="Swatches"
              min={2}
              max={10}
              value={size}
              onChange={(next) => {
                setSize(next)
                editor.setColors(randomPalette(next, flavour))
              }}
            />
          </div>
        }
      >
        <PaletteBoard
          colors={editor.colors}
          onChange={editor.setColors}
          name="Random palette"
          source="random"
          locked={editor.locked}
          onToggleLock={editor.toggleLock}
          onClearLocks={editor.clearLocks}
          onRemoveAt={editor.removeAt}
        onReorder={editor.moveColor}
          onShuffle={rollPalette}
          shufflePrimary
          height={220}
        />
      </Section>

      <SaveColorDialog
        open={savingColor}
        hex={single}
        onClose={() => setSavingColor(false)}
      />
    </Page>
  )
}
