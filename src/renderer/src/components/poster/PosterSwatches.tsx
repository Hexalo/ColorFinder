import { useState } from 'react'
import { Delete02Icon, Refresh01Icon, Search01Icon } from 'hugeicons-react'
import { Button, IconButton } from '../ui/Button'
import { Select, TextInput } from '../ui/Field'
import { NO_ICON, POSTER_ICONS } from '../../data/posterIcons'
import { swatchHexes } from '../../services/library.service'
import { nameColor } from '../../services/naming.service'
import { useColorStore } from '../../store/colorStore'
import { useGeneratedStore } from '../../store/generatedStore'
import { useLibraryStore } from '../../store/libraryStore'
import { usePosterStore } from '../../store/posterStore'
import type { Library } from '../../types'
import { PosterLibraryModal } from './PosterLibraryModal'

/**
 * Where the poster's colours come from, and what each band says.
 *
 * The source is a single list rather than a mode switch: "the palette I just
 * made", "the colour I am holding" and everything in the library are the same
 * kind of answer to the same question. Picking a library item opens a visual
 * browser rather than a name in a dropdown — a palette shows as its own
 * swatch strip, grouped the way the Library page groups it.
 */

export const LATEST_SOURCE = 'latest'
export const CURRENT_SOURCE = 'current'

interface PosterSwatchesProps {
  source: string
  onSource(source: string): void
}

/** Label for whichever library item is currently the active source. */
function activeLibraryLabel(source: string, library: Library): string | null {
  const [kind, id] = source.split(':')
  if (kind === 'palette') return library.palettes.find((item) => item.id === id)?.name ?? null
  if (kind === 'color') return library.colors.find((item) => item.id === id)?.name ?? null
  return null
}

export function PosterSwatches({ source, onSource }: PosterSwatchesProps): React.JSX.Element {
  const library = useLibraryStore((state) => state.library)
  const generated = useGeneratedStore()
  const hex = useColorStore((state) => state.hex)

  const swatches = usePosterStore((state) => state.swatches)
  const store = usePosterStore()

  const [browsing, setBrowsing] = useState(false)

  const iconOptions = [
    { value: NO_ICON, label: 'No glyph' },
    ...POSTER_ICONS.map((icon) => ({ value: icon.id, label: icon.label }))
  ]

  const libraryLabel = activeLibraryLabel(source, library)

  return (
    <div className="poster-panel__stack">
      <div className="field">
        <span className="field__label">Colours from</span>

        <div className="poster-source">
          <button
            type="button"
            className={`poster-source__pill ${source === LATEST_SOURCE ? 'is-active' : ''}`}
            onClick={() => onSource(LATEST_SOURCE)}
          >
            <span className="poster-source__strip">
              {(generated.colors.length ? generated.colors : ['transparent'])
                .slice(0, 5)
                .map((swatchHex, index) => (
                  <span key={index} style={{ background: swatchHex }} />
                ))}
            </span>
            <span className="poster-source__text">
              Latest palette
              <span className="poster-source__hint">
                {generated.colors.length ? generated.name : 'Nothing generated yet'}
              </span>
            </span>
          </button>

          <button
            type="button"
            className={`poster-source__pill ${source === CURRENT_SOURCE ? 'is-active' : ''}`}
            onClick={() => onSource(CURRENT_SOURCE)}
          >
            <span className="poster-source__dot" style={{ background: hex }} />
            <span className="poster-source__text">
              Current colour
              <span className="poster-source__hint">{nameColor(hex)}</span>
            </span>
          </button>
        </div>

        <div className="poster-panel__row">
          <Button
            size="sm"
            variant={libraryLabel ? 'primary' : 'secondary'}
            icon={<Search01Icon size={14} />}
            onClick={() => setBrowsing(true)}
          >
            {libraryLabel ? `Library · ${libraryLabel}` : 'Browse library…'}
          </Button>
          {libraryLabel ? (
            <IconButton label="Refresh this source" size="sm" onClick={() => onSource(source)}>
              <Refresh01Icon size={15} />
            </IconButton>
          ) : null}
        </div>
      </div>

      <PosterLibraryModal open={browsing} onClose={() => setBrowsing(false)} onPick={onSource} />

      <ul className="poster-swatches">
        {swatches.map((swatch, index) => (
          <li className="poster-swatches__item" key={`${swatch.hex}-${index}`}>
            <label
              className="poster-swatches__chip"
              style={{ background: swatch.hex }}
              title={`Change colour ${index + 1}`}
            >
              <span className="sr-only">Colour {index + 1}</span>
              <input
                type="color"
                value={swatch.hex}
                onChange={(event) => store.setSwatchHex(index, event.target.value)}
              />
            </label>

            <TextInput
              value={swatch.name}
              aria-label={`Name of colour ${index + 1}`}
              onChange={(event) => store.setSwatchName(index, event.target.value)}
            />

            <Select
              className="poster-swatches__icon"
              options={iconOptions}
              value={swatch.icon}
              aria-label={`Glyph for colour ${index + 1}`}
              onChange={(event) => store.setSwatchIcon(index, event.target.value)}
            />

            <IconButton
              label={`Remove colour ${index + 1}`}
              size="sm"
              disabled={swatches.length <= 1}
              onClick={() => store.removeSwatch(index)}
            >
              <Delete02Icon size={15} />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Resolves a source id to its colours and names. Unknown ids give nothing. */
export function readSource(
  source: string,
  library: Library,
  generated: { colors: string[]; name: string },
  currentHex: string
): { colors: string[]; names: (string | undefined)[]; title: string } | null {
  if (source === LATEST_SOURCE) {
    if (generated.colors.length === 0) return null
    return { colors: generated.colors, names: [], title: generated.name }
  }

  if (source === CURRENT_SOURCE) {
    return { colors: [currentHex], names: [], title: nameColor(currentHex) }
  }

  const [kind, id] = source.split(':')

  if (kind === 'palette') {
    const palette = library.palettes.find((item) => item.id === id)
    if (!palette) return null
    return {
      colors: swatchHexes(palette),
      names: palette.swatches.map((swatch) => swatch.name),
      title: palette.name
    }
  }

  if (kind === 'color') {
    const color = library.colors.find((item) => item.id === id)
    if (!color) return null
    return { colors: [color.hex], names: [color.name], title: color.name }
  }

  return null
}
