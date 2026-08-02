import { useEffect, useRef, useState } from 'react'
import { ColorPickerIcon, ColorsIcon, LibraryIcon, Time04Icon } from 'hugeicons-react'
import { useEyedropper } from '../../hooks/useEyedropper'
import { hexToHsv, hsvToHex, readableTextOn } from '../../services/color.service'
import { nameColor } from '../../services/naming.service'
import { useColorStore } from '../../store/colorStore'
import { useLibraryStore } from '../../store/libraryStore'
import { useRouteStore } from '../../store/routeStore'
import { Button } from '../ui/Button'
import { ColorSquare } from './ColorSquare'
import { HexField } from './HexField'
import './QuickPicker.css'

interface QuickPickerProps {
  hex: string
  onChange(hex: string): void
  /** Called after the panel's own "done" affordances. */
  onClose(): void
}

/** How many colours each strip offers before it starts scrolling. */
const SWATCH_LIMIT = 24

/**
 * The "essential" picker: the same saturation square and hue bar as the full
 * Picker page, shrunk to fit a popover, plus a hex field, the eyedropper and
 * one-tap access to colours already in the library.
 *
 * This is what you get when you edit a swatch anywhere in the app, so editing
 * a colour feels identical in Harmonies, Random, From image and the Library.
 */
export function QuickPicker({ hex, onChange, onClose }: QuickPickerProps): React.JSX.Element {
  // HSV is the interaction model, kept locally so greys keep their hue while
  // the user drags the value down and back up.
  const [hsv, setHsv] = useState(() => hexToHsv(hex))

  /**
   * Mirror of `hsv` for the drag handler: pointer moves arrive faster than
   * React re-renders, so reading state from the closure would drop samples.
   */
  const hsvRef = useRef(hsv)
  hsvRef.current = hsv

  /**
   * The last hex this picker produced.
   *
   * `hsv -> hex` quantises to 8 bits, so converting straight back gives a
   * *slightly* different HSV. Without this guard the prop echo would re-seed
   * the state mid-drag and the handle would fight the pointer.
   */
  const lastEmitted = useRef<string | null>(null)

  // Follow the colour when it changes from outside (hex field, eyedropper,
  // library) — but never when it is merely our own value coming back.
  useEffect(() => {
    if (hex === lastEmitted.current) return
    setHsv(hexToHsv(hex, hsvRef.current.h))
  }, [hex])

  const applyHsv = (patch: Partial<typeof hsv>): void => {
    const next = { ...hsvRef.current, ...patch }
    hsvRef.current = next
    setHsv(next)

    const nextHex = hsvToHex(next)
    lastEmitted.current = nextHex
    onChange(nextHex)
  }

  /** External sources set the hex directly; drop the echo guard so it applies. */
  const applyHex = (next: string): void => {
    lastEmitted.current = null
    onChange(next)
  }

  const { picking, pick } = useEyedropper(applyHex)

  const savedColors = useLibraryStore((state) => state.library.colors)
  const recent = useColorStore((state) => state.recent)
  const setStoreHex = useColorStore((state) => state.setHex)
  const remember = useColorStore((state) => state.remember)
  const navigate = useRouteStore((state) => state.navigate)

  // Two distinct sources, kept apart: "saved on purpose" and "used lately"
  // are different things, and merging them hid the recent ones.
  const saved = savedColors.map((color) => ({ hex: color.hex, name: color.name }))
  const lately = recent.map((item) => ({ hex: item, name: nameColor(item) }))

  const swatchRow = (
    items: { hex: string; name: string }[],
    emptyText: string
  ): React.JSX.Element =>
    items.length > 0 ? (
      <div className="quick-picker__swatches">
        {items.slice(0, SWATCH_LIMIT).map((item) => (
          <button
            key={item.hex}
            type="button"
            className={`quick-picker__swatch ${item.hex === hex ? 'is-active' : ''}`}
            style={{ background: item.hex }}
            title={`${item.name} — ${item.hex.toUpperCase()}`}
            aria-label={`Use ${item.name}`}
            onClick={() => applyHex(item.hex)}
          />
        ))}
      </div>
    ) : (
      <p className="quick-picker__empty">{emptyText}</p>
    )

  return (
    <div className="quick-picker">
      <ColorSquare hsv={hsv} onChange={applyHsv} size={200} />

      <div className="quick-picker__row">
        <span
          className="quick-picker__chip"
          style={{ background: hex, color: readableTextOn(hex) }}
          aria-hidden="true"
        />
        <HexField value={hex} onChange={applyHex} size="sm" className="quick-picker__hex" />
        <Button
          size="sm"
          aria-label="Pick from screen"
          title="Pick from screen"
          disabled={picking}
          onClick={() => void pick()}
          icon={<ColorPickerIcon size={15} />}
        />
      </div>

      <p className="quick-picker__name">{nameColor(hex)}</p>

      <div className="quick-picker__source">
        <span className="quick-picker__source-head">
          <LibraryIcon size={13} strokeWidth={1.8} />
          From your library
        </span>
        {swatchRow(saved, 'Colours you save to the library show up here.')}
      </div>

      <div className="quick-picker__source">
        <span className="quick-picker__source-head">
          <Time04Icon size={13} strokeWidth={1.8} />
          Recent
        </span>
        {swatchRow(lately, 'Colours you work with show up here.')}
      </div>

      <div className="quick-picker__links">
        <Button
          size="sm"
          variant="ghost"
          icon={<ColorsIcon size={15} />}
          onClick={() => {
            setStoreHex(hex)
            remember(hex)
            navigate('harmonies')
            onClose()
          }}
        >
          Build harmonies
        </Button>
      </div>
    </div>
  )
}
