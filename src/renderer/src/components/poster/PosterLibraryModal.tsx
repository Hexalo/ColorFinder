import { useEffect, useMemo, useState } from 'react'
import { Search01Icon } from 'hugeicons-react'
import { Modal } from '../ui/Modal'
import { bookmarkIcon } from '../../data/bookmarkIcons'
import { swatchHexes } from '../../services/library.service'
import { searchTokens } from '../../services/naming.service'
import { useLibraryStore } from '../../store/libraryStore'
import type { Palette, SavedColor } from '../../types'
import './PosterLibraryModal.css'

interface PosterLibraryModalProps {
  open: boolean
  onClose(): void
  /** A `palette:<id>` or `color:<id>` source id — see `readSource`. */
  onPick(source: string): void
}

interface Group {
  id: string | null
  name: string
  iconId: string | undefined
  accent: string | undefined
  palettes: Palette[]
  colors: SavedColor[]
}

/**
 * Organised, visual stand-in for a flat "choose a palette" dropdown: the
 * library laid out the way the Library page itself groups it — by bookmark,
 * each palette shown as its actual swatch strip rather than a name in a list.
 */
export function PosterLibraryModal({
  open,
  onClose,
  onPick
}: PosterLibraryModalProps): React.JSX.Element {
  const library = useLibraryStore((state) => state.library)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const needle = query.trim().toLowerCase()

  const matchesPalette = (palette: Palette): boolean =>
    !needle ||
    palette.name.toLowerCase().includes(needle) ||
    swatchHexes(palette).some((hex) => searchTokens(hex).includes(needle))

  const matchesColor = (color: SavedColor): boolean =>
    !needle || color.name.toLowerCase().includes(needle) || searchTokens(color.hex).includes(needle)

  const groups = useMemo<Group[]>(() => {
    const all: Group[] = [
      { id: null, name: 'No bookmark', iconId: undefined, accent: undefined, palettes: [], colors: [] },
      ...library.bookmarks.map((bookmark) => ({
        id: bookmark.id,
        name: bookmark.name,
        iconId: bookmark.icon,
        accent: bookmark.hex,
        palettes: [] as Palette[],
        colors: [] as SavedColor[]
      }))
    ]
    const byId = new Map(all.map((group) => [group.id, group]))

    for (const palette of library.palettes) {
      if (!matchesPalette(palette)) continue
      byId.get(palette.bookmarkId ?? null)?.palettes.push(palette)
    }
    for (const color of library.colors) {
      if (!matchesColor(color)) continue
      byId.get(color.bookmarkId ?? null)?.colors.push(color)
    }

    return all.filter((group) => group.palettes.length > 0 || group.colors.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.bookmarks, library.palettes, library.colors, needle])

  const pick = (source: string): void => {
    onPick(source)
    onClose()
  }

  return (
    <Modal open={open} title="Choose colours from the library" onClose={onClose}>
      <div className="poster-library__search">
        <Search01Icon size={15} />
        <input
          type="search"
          value={query}
          placeholder="Search palettes, colours, hex…"
          aria-label="Search the library"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {groups.length === 0 ? (
        <p className="poster-panel__note">
          {needle
            ? `Nothing matches "${query.trim()}".`
            : 'Nothing saved yet — palettes and colours you save show up here.'}
        </p>
      ) : (
        <div className="poster-library__groups">
          {groups.map((group) => {
            const Glyph = bookmarkIcon(group.iconId)
            return (
              <section className="poster-library__group" key={group.id ?? 'root'}>
                <h3 className="poster-library__heading">
                  <span
                    className="poster-library__heading-icon"
                    style={group.accent ? { color: group.accent } : undefined}
                  >
                    <Glyph size={14} strokeWidth={1.8} />
                  </span>
                  {group.name}
                </h3>
                <div className="poster-library__items">
                  {group.palettes.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      className="poster-library__palette"
                      title={`${palette.name} — ${palette.swatches.length} colours`}
                      onClick={() => pick(`palette:${palette.id}`)}
                    >
                      <span className="poster-library__strip">
                        {swatchHexes(palette)
                          .slice(0, 6)
                          .map((hex, index) => (
                            <span key={index} style={{ background: hex }} />
                          ))}
                      </span>
                      <span className="poster-library__label">{palette.name}</span>
                    </button>
                  ))}
                  {group.colors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      className="poster-library__color"
                      title={color.name}
                      onClick={() => pick(`color:${color.id}`)}
                    >
                      <span className="poster-library__dot" style={{ background: color.hex }} />
                      <span className="poster-library__label">{color.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
