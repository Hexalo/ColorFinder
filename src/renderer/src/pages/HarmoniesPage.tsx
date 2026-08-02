import { useEffect, useRef } from 'react'
import { ColorPickerIcon } from 'hugeicons-react'
import { HarmonyWheel } from '../components/color/HarmonyWheel'
import { WheelControls } from '../components/color/WheelControls'
import { HexField } from '../components/color/HexField'
import { Page, Section } from '../components/layout/Page'
import { PaletteBoard } from '../components/palette/PaletteBoard'
import { Button } from '../components/ui/Button'
import { Segmented } from '../components/ui/Field'
import { HARMONIES, HARMONY_BY_ID } from '../data/harmonies'
import { useEyedropper } from '../hooks/useEyedropper'
import { useHotkey } from '../hooks/useHotkey'
import { usePaletteEditor } from '../hooks/usePaletteEditor'
import { useTab } from '../hooks/useTab'
import {
  chromaOf,
  hueOf,
  rotateHue,
  shiftOkhsl,
  withChroma,
  withHueChroma
} from '../services/color.service'
import { buildHarmony } from '../services/harmony.service'
import { nameColor } from '../services/naming.service'
import { useColorStore } from '../store/colorStore'
import { openCopyPanel } from '../store/copyPanelStore'
import type { HarmonyId, Okhsl } from '../types'
import './HarmoniesPage.css'

const HARMONY_OPTIONS = HARMONIES.map((harmony) => ({
  value: harmony.id,
  label: harmony.label,
  icon: <harmony.icon size={14} strokeWidth={1.8} />
}))

export function HarmoniesPage(): React.JSX.Element {
  const hex = useColorStore((state) => state.hex)
  const setHex = useColorStore((state) => state.setHex)

  const [harmony, setHarmony] = useTab<HarmonyId>('harmony', 'analogous')

  const editor = usePaletteEditor(buildHarmony(hex, harmony))
  const { applyRespectingLocks } = editor

  /**
   * Rebuild whenever the base colour or the rule changes — except under
   * "Unlocked", which has no rule to apply. Regenerating there would throw
   * away the palette you just arrived with from another rule, which is
   * usually the whole reason for switching to it.
   */
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (harmony === 'unlocked') return
    applyRespectingLocks(buildHarmony(hex, harmony))
  }, [hex, harmony, applyRespectingLocks])

  const { picking, pick } = useEyedropper(setHex)

  const definition = HARMONY_BY_ID[harmony]
  /**
   * Every other rule derives its swatches from the base colour, so shuffling
   * would just rebuild the identical palette. Only "Unlocked" has anything to
   * reshuffle.
   */
  const canShuffle = harmony === 'unlocked'
  useHotkey(' ', () => editor.shuffle(harmony, hex), canShuffle)

  /**
   * Dragging a point on the wheel.
   *
   * Under a rule the palette is a function of the base colour, so a point can
   * only move by moving everything: we turn the base by the same angle and
   * scale its chroma by the same factor, and the rule redraws the rest at
   * their fixed offsets. Under "Unlocked" there is no rule to respect, so the
   * point moves alone.
   */
  const moveWheelPoint = (index: number, hue: number, chroma: number): void => {
    const current = editor.colors[index]
    if (!current) return

    if (canShuffle) {
      if (editor.locked[index]) return
      editor.setColorAt(index, withHueChroma(current, hue, chroma))
      return
    }

    const deltaHue = hue - hueOf(current)
    const currentChroma = chromaOf(current)
    const scale = currentChroma > 0.001 ? chroma / currentChroma : 1

    setHex(withChroma(rotateHue(hex, deltaHue), chromaOf(hex) * scale))
  }

  /**
   * The whole-palette sliders, offered only under "Unlocked".
   *
   * Under a rule there is nothing to shift as a group: the sliders drive the
   * base colour instead, and the rule redraws the rest. Here each swatch stands
   * on its own, so the move lands on all of them at once — locked ones excepted.
   */
  const shiftPalette = (channel: keyof Okhsl, delta: number): void => {
    editor.setColors(
      editor.colors.map((item, index) =>
        editor.locked[index] ? item : shiftOkhsl(item, channel, delta)
      )
    )
  }

  /** Per-colour equivalent, offered only where colours are independent. */
  const setColor = (index: number, next: string): void => {
    if (editor.locked[index]) return
    editor.setColorAt(index, next)
  }

  return (
    <Page
      title="Harmonies"
      actions={
        <Segmented
          ariaLabel="Harmony rule"
          size="sm"
          value={harmony}
          options={HARMONY_OPTIONS}
          onChange={setHarmony}
        />
      }
    >
      <div className="harmony__base">
        <span className="harmony__base-label">Base</span>

        <button
          type="button"
          className="harmony__base-chip"
          style={{ background: hex }}
          title={`${nameColor(hex)} — copy options`}
          aria-label={`Copy options for ${nameColor(hex)}`}
          onClick={() => openCopyPanel({ kind: 'color', hex, label: 'Base colour' })}
        />

        <HexField value={hex} onChange={setHex} size="sm" ariaLabel="Base colour" />

        <label className="harmony__base-edit">
          <span className="sr-only">Choose base colour with the system picker</span>
          <input type="color" value={hex} onChange={(event) => setHex(event.target.value)} />
          Change
        </label>

        <Button
          size="sm"
          disabled={picking}
          icon={<ColorPickerIcon size={15} />}
          onClick={() => void pick()}
        >
          From screen
        </Button>

        <span className="harmony__description">{definition.description}</span>
      </div>

      <PaletteBoard
        colors={editor.colors}
        onChange={editor.setColors}
        name={`${definition.label} · ${nameColor(hex)}`}
        source="harmony"
        locked={editor.locked}
        onToggleLock={editor.toggleLock}
        onClearLocks={editor.clearLocks}
        onRemoveAt={editor.removeAt}
        onReorder={editor.moveColor}
        onShuffle={canShuffle ? () => editor.shuffle(harmony, hex) : undefined}
        height={240}
        hint={
          canShuffle ? (
            <>
              No rule here — lock the swatches you want to keep, then press <kbd>Space</kbd>{' '}
              to give the rest fresh random colours.
            </>
          ) : undefined
        }
      />

      <Section title="On the wheel">
        <div className="harmony__wheel card">
          <HarmonyWheel
            colors={editor.colors}
            locked={editor.locked}
            mode={canShuffle ? 'free' : 'rule'}
            // Which dot the base sliders are holding. `buildHarmony` drops the
            // base in verbatim, so it is the one that matches exactly.
            base={canShuffle ? undefined : editor.colors.indexOf(hex)}
            onMove={moveWheelPoint}
          />

          <WheelControls
            colors={editor.colors}
            locked={editor.locked}
            base={canShuffle ? undefined : hex}
            onBase={canShuffle ? undefined : setHex}
            onShift={canShuffle ? shiftPalette : undefined}
            onColor={canShuffle ? setColor : undefined}
          />
        </div>
      </Section>
    </Page>
  )
}
