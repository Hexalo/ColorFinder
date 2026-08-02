import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  ColorsIcon,
  Copy01Icon,
  GlobeIcon,
  PaintBucketIcon,
  SlidersHorizontalIcon,
  SourceCodeIcon,
  SmartPhone01Icon,
  Tick02Icon,
  CssThreeIcon
} from 'hugeicons-react'
import { CODE_FORMATS, CODE_FORMAT_BY_ID, CODE_FORMAT_GROUPS } from '../../data/codeFormats'
import { COLOR_SPACES } from '../../data/colorSpaces'
import { PALETTE_FORMATS, PALETTE_FORMAT_GROUPS } from '../../data/paletteFormats'
import { useClipboard } from '../../hooks/useClipboard'
import { usePanelResize } from '../../hooks/usePanelResize'
import {
  contrastRatio,
  hueOf,
  lightnessOf,
  luminanceOf,
  readableTextOn
} from '../../services/color.service'
import { nameColor } from '../../services/naming.service'
import { useColorStore } from '../../store/colorStore'
import { useCopyPanelStore } from '../../store/copyPanelStore'
import { useLibraryStore } from '../../store/libraryStore'
import { useRouteStore } from '../../store/routeStore'
import { useSettingsStore } from '../../store/settingsStore'
import { SaveColorDialog } from '../palette/SaveColorDialog'
import { Button, IconButton } from '../ui/Button'
import { Disclosure } from '../ui/Disclosure'
import './CopyPanel.css'

/** One glyph per format family, so the groups are scannable when collapsed. */
const GROUP_ICONS: Record<string, React.ReactNode> = {
  Web: <GlobeIcon size={14} strokeWidth={1.8} />,
  CSS: <CssThreeIcon size={14} strokeWidth={1.8} />,
  Mobile: <SmartPhone01Icon size={14} strokeWidth={1.8} />,
  Code: <SourceCodeIcon size={14} strokeWidth={1.8} />
}

/**
 * The single place colours get copied from. Every copy affordance in the app
 * opens this drawer instead of writing straight to the clipboard, so the same
 * full set of formats is one click away everywhere.
 *
 * It is deliberately non-modal: you can keep clicking swatches behind it and
 * the panel just re-targets.
 */
export function CopyPanel(): React.JSX.Element | null {
  const { target, parent, back, close, drillTo } = useCopyPanelStore()
  const { width, resizing, startResize } = usePanelResize()

  useEffect(() => {
    if (!target) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [target, close])

  if (!target) return null

  return (
    <aside
      className={`copy-panel ${resizing ? 'is-resizing' : ''}`}
      style={{ width }}
      role="complementary"
      aria-label="Copy options"
    >
      <div
        className="copy-panel__resizer"
        role="separator"
        aria-label="Resize copy panel"
        aria-orientation="vertical"
        onPointerDown={startResize}
      />

      <header className="copy-panel__head">
        {parent ? (
          <IconButton label="Back to the palette" size="sm" onClick={back}>
            <ArrowLeft01Icon size={16} />
          </IconButton>
        ) : null}
        <h2 className="copy-panel__heading">
          {target.kind === 'color' ? (target.label ?? nameColor(target.hex)) : target.name}
        </h2>
        <IconButton label="Close copy panel" size="sm" onClick={close}>
          <Cancel01Icon size={16} />
        </IconButton>
      </header>

      <div className="copy-panel__scroll">
        {target.kind === 'color' ? (
          <ColorContent hex={target.hex} />
        ) : (
          <PaletteContent colors={target.colors} name={target.name} onDrill={drillTo} />
        )}
      </div>
    </aside>
  )
}

/* -------------------------------------------------------------------------- */

function CopyRow({
  label,
  value,
  multiline = false
}: {
  label: string
  value: string
  multiline?: boolean
}): React.JSX.Element {
  const { copied, copy } = useClipboard()

  return (
    <button
      type="button"
      className={`copy-row ${multiline ? 'is-multiline' : ''}`}
      onClick={() => void copy(value, label)}
      title={`Copy ${label}`}
    >
      <span className="copy-row__label">{label}</span>
      <span className="copy-row__value mono">{value}</span>
      <span className="copy-row__icon" aria-hidden="true">
        {copied === value ? <Tick02Icon size={15} /> : <Copy01Icon size={15} />}
      </span>
    </button>
  )
}

/** What to do with this colour, beyond copying it. */
function ColorActions({ hex }: { hex: string }): React.JSX.Element {
  const current = useColorStore((state) => state.hex)
  const setHex = useColorStore((state) => state.setHex)
  const remember = useColorStore((state) => state.remember)
  const navigate = useRouteStore((state) => state.navigate)
  const [saving, setSaving] = useState(false)

  const makeCurrent = (): void => {
    setHex(hex)
    remember(hex)
  }

  const sendTo = (route: 'picker' | 'harmonies'): void => {
    makeCurrent()
    navigate(route)
  }

  const isCurrent = current.toLowerCase() === hex.toLowerCase()

  return (
    <div className="copy-panel__actions">
      {/* Adopts the colour without leaving the page you are on. */}
      <Button
        size="sm"
        variant={isCurrent ? 'secondary' : 'primary'}
        className="copy-panel__action-wide"
        icon={isCurrent ? <Tick02Icon size={15} /> : <PaintBucketIcon size={15} />}
        disabled={isCurrent}
        onClick={makeCurrent}
      >
        {isCurrent ? 'Current colour' : 'Make it the current colour'}
      </Button>

      <Button
        size="sm"
        icon={<SlidersHorizontalIcon size={15} />}
        onClick={() => sendTo('picker')}
      >
        Picker
      </Button>
      <Button size="sm" icon={<ColorsIcon size={15} />} onClick={() => sendTo('harmonies')}>
        Harmonies
      </Button>
      <Button size="sm" icon={<Bookmark02Icon size={15} />} onClick={() => setSaving(true)}>
        Save
      </Button>

      <SaveColorDialog open={saving} hex={hex} onClose={() => setSaving(false)} />
    </div>
  )
}

function ColorContent({ hex }: { hex: string }): React.JSX.Element {
  const preferred = useSettingsStore((state) => state.settings.defaultCopyFormat)
  const { copied, copy } = useClipboard()

  const pinned = CODE_FORMAT_BY_ID[preferred] ?? CODE_FORMAT_BY_ID.hex
  const pinnedValue = pinned.format(hex)
  const name = nameColor(hex)

  const onWhite = contrastRatio(hex, '#ffffff')
  const onBlack = contrastRatio(hex, '#000000')
  const best = Math.max(onWhite, onBlack)

  return (
    <>
      <div className="copy-panel__hero" style={{ background: hex, color: readableTextOn(hex) }}>
        <span className="copy-panel__hero-name">{name}</span>
        <span className="copy-panel__hex mono">{hex.toUpperCase()}</span>
      </div>

      <ColorActions hex={hex} />

      {/* One-tap shortcut for the format chosen in Settings. */}
      <button
        type="button"
        className="copy-panel__primary"
        onClick={() => void copy(pinnedValue, pinned.label)}
      >
        {copied === pinnedValue ? <Tick02Icon size={16} /> : <Copy01Icon size={16} />}
        <span>
          Copy as <strong>{pinned.label}</strong>
        </span>
        <span className="copy-panel__primary-value mono">{pinnedValue}</span>
      </button>

      <Disclosure title="Details" defaultOpen>
        <dl className="copy-info">
          <div>
            <dt>Name</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt>Best text colour</dt>
            <dd>{readableTextOn(hex) === '#ffffff' ? 'white' : 'black'}</dd>
          </div>
          <div>
            <dt>Contrast on white</dt>
            <dd className="mono">{onWhite.toFixed(2)}:1</dd>
          </div>
          <div>
            <dt>Contrast on black</dt>
            <dd className="mono">{onBlack.toFixed(2)}:1</dd>
          </div>
          <div>
            <dt>WCAG body text</dt>
            <dd>{best >= 7 ? 'AAA' : best >= 4.5 ? 'AA' : 'fails'}</dd>
          </div>
          <div>
            <dt>WCAG large text</dt>
            <dd>{best >= 4.5 ? 'AAA' : best >= 3 ? 'AA' : 'fails'}</dd>
          </div>
          <div>
            <dt>Relative luminance</dt>
            <dd className="mono">{luminanceOf(hex).toFixed(4)}</dd>
          </div>
          <div>
            <dt>OKLCH lightness</dt>
            <dd className="mono">{lightnessOf(hex).toFixed(3)}</dd>
          </div>
          <div>
            <dt>Hue angle</dt>
            <dd className="mono">{hueOf(hex).toFixed(1)}&deg;</dd>
          </div>
        </dl>

        <div className="copy-info__spaces">
          {COLOR_SPACES.map((space) => (
            <CopyRow key={space.id} label={space.label} value={space.format(space.toValues(hex))} />
          ))}
        </div>
      </Disclosure>

      {CODE_FORMAT_GROUPS.map((group) => {
        const formats = CODE_FORMATS.filter((format) => format.group === group)
        return (
          <Disclosure key={group} title={group} icon={GROUP_ICONS[group]} badge={formats.length}>
            {formats.map((format) => (
              <CopyRow key={format.id} label={format.label} value={format.format(hex)} />
            ))}
          </Disclosure>
        )
      })}
    </>
  )
}

function PaletteContent({
  colors,
  name,
  onDrill
}: {
  colors: string[]
  name: string
  onDrill(target: { kind: 'color'; hex: string; label?: string }): void
}): React.JSX.Element {
  const savePalette = useLibraryStore((state) => state.savePalette)

  const formatsByGroup = useMemo(
    () =>
      PALETTE_FORMAT_GROUPS.map((group) => ({
        group,
        formats: PALETTE_FORMATS.filter((format) => format.group === group)
      })),
    []
  )

  return (
    <>
      <div className="copy-panel__strip">
        {colors.map((hex, index) => (
          <button
            key={index}
            type="button"
            className="copy-panel__strip-cell"
            style={{ background: hex }}
            title={`${nameColor(hex)} — its own formats`}
            aria-label={`Copy options for ${nameColor(hex)}`}
            onClick={() => onDrill({ kind: 'color', hex, label: `${name} · ${index + 1}` })}
          />
        ))}
      </div>

      <p className="copy-panel__note">
        {colors.length} colours &middot; tap a swatch for its own formats
      </p>

      <div className="copy-panel__actions">
        <Button
          size="sm"
          icon={<Bookmark02Icon size={15} />}
          onClick={() => savePalette(name, colors, 'manual')}
        >
          Save palette to library
        </Button>
      </div>

      {formatsByGroup.map(({ group, formats }) => (
        <Disclosure key={group} title={group} icon={GROUP_ICONS[group]} badge={formats.length}>
          {formats.map((format) => (
            <CopyRow
              key={format.id}
              label={format.label}
              value={format.format(colors, name)}
              multiline
            />
          ))}
        </Disclosure>
      ))}
    </>
  )
}
