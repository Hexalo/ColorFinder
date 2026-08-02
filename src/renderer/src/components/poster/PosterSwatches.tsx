import { useMemo } from 'react'
import { Delete02Icon, Refresh01Icon } from 'hugeicons-react'
import { IconButton } from '../ui/Button'
import { Field, Select, TextInput } from '../ui/Field'
import { NO_ICON, POSTER_ICONS } from '../../data/posterIcons'
import { nameColor } from '../../services/naming.service'
import { swatchHexes } from '../../services/library.service'
import { useColorStore } from '../../store/colorStore'
import { useGeneratedStore } from '../../store/generatedStore'
import { useLibraryStore } from '../../store/libraryStore'
import { usePosterStore } from '../../store/posterStore'
import type { Library } from '../../types'

/**
 * Where the poster's colours come from, and what each band says.
 *
 * The source is a single list rather than a mode switch: "the palette I just
 * made", "the colour I am holding" and everything in the library are the same
 * kind of answer to the same question.
 */

export const LATEST_SOURCE = 'latest'
export const CURRENT_SOURCE = 'current'

interface PosterSwatchesProps {
  source: string
  onSource(source: string): void
}

export function PosterSwatches({ source, onSource }: PosterSwatchesProps): React.JSX.Element {
  const library = useLibraryStore((state) => state.library)
  const generated = useGeneratedStore()
  const hex = useColorStore((state) => state.hex)

  const swatches = usePosterStore((state) => state.swatches)
  const store = usePosterStore()

  const options = useMemo(
    () => [
      {
        value: LATEST_SOURCE,
        label: generated.colors.length
          ? `Latest palette · ${generated.name}`
          : 'Latest palette · nothing generated yet'
      },
      { value: CURRENT_SOURCE, label: `Current colour · ${nameColor(hex)}` },
      ...library.palettes.map((palette) => ({
        value: `palette:${palette.id}`,
        label: `Library · ${palette.name}`
      })),
      ...library.colors.map((color) => ({
        value: `color:${color.id}`,
        label: `Library colour · ${color.name}`
      }))
    ],
    [generated.colors.length, generated.name, hex, library.palettes, library.colors]
  )

  const iconOptions = [
    { value: NO_ICON, label: 'No glyph' },
    ...POSTER_ICONS.map((icon) => ({ value: icon.id, label: icon.label }))
  ]

  return (
    <div className="poster-panel__stack">
      <Field label="Colours from">
        {(id) => (
          <div className="poster-panel__row">
            <Select
              id={id}
              options={options}
              value={source}
              onChange={(event) => onSource(event.target.value)}
            />
            <IconButton label="Reload this source" onClick={() => onSource(source)}>
              <Refresh01Icon size={16} />
            </IconButton>
          </div>
        )}
      </Field>

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
