import { useMemo, useState } from 'react'
import {
  Add01Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  Download01Icon,
  Edit02Icon,
  Folder01Icon,
  FolderOpenIcon,
  PaintBoardIcon,
  Search01Icon,
  Time04Icon,
  Upload01Icon
} from 'hugeicons-react'
import { PaletteStrip } from '../components/color/PaletteStrip'
import { PaletteBoard } from '../components/palette/PaletteBoard'
import { EmptyState, Page, Section } from '../components/layout/Page'
import { BookmarkCard } from '../components/palette/BookmarkCard'
import { BookmarkDialog } from '../components/palette/BookmarkDialog'
import { Button, IconButton } from '../components/ui/Button'
import { Field, Select, TextInput } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { bookmarkIcon } from '../data/bookmarkIcons'
import { readableTextOn } from '../services/color.service'
import { bookmarkPreview, countIn, swatchHexes } from '../services/library.service'
import { nameColor, searchTokens } from '../services/naming.service'
import { useColorStore } from '../store/colorStore'
import { openCopyPanel } from '../store/copyPanelStore'
import { RECENT_FILTER, useLibraryStore } from '../store/libraryStore'
import { useRouteStore } from '../store/routeStore'
import type { Bookmark, Palette, SavedColor } from '../types'
import './LibraryPage.css'

/** How many of the newest items the virtual "Recent" view keeps. */
const RECENT_LIMIT = 12

export function LibraryPage(): React.JSX.Element {
  const library = useLibraryStore((state) => state.library)
  const filter = useLibraryStore((state) => state.filter)
  const setFilter = useLibraryStore((state) => state.setFilter)
  const store = useLibraryStore()

  const setHex = useColorStore((state) => state.setHex)
  const navigate = useRouteStore((state) => state.navigate)

  const [query, setQuery] = useState('')
  /** `null` while closed; `{ bookmark: null }` means "create a new one". */
  const [folderDialog, setFolderDialog] = useState<{ bookmark: Bookmark | null } | null>(null)
  const [editing, setEditing] = useState<Palette | null>(null)
  const [editingColor, setEditingColor] = useState<SavedColor | null>(null)
  const [editingName, setEditingName] = useState('')
  /** Palette currently open in the full editor. */
  const [openPalette, setOpenPalette] = useState<string | null>(null)

  const needle = query.trim().toLowerCase()

  /**
   * A palette matches on its own name, on any of its colours' names, or on a
   * hex — so "sage", "#c2724f" and "autumn" all find something.
   */
  const matchesPalette = (palette: Palette): boolean =>
    !needle ||
    palette.name.toLowerCase().includes(needle) ||
    swatchHexes(palette).some((hex) => searchTokens(hex).includes(needle))

  const matchesColor = (color: SavedColor): boolean =>
    !needle || color.name.toLowerCase().includes(needle) || searchTokens(color.hex).includes(needle)

  const inFilter = (bookmarkId: string | null): boolean =>
    filter === null || filter === RECENT_FILTER || bookmarkId === filter

  const newestFirst = <T extends { createdAt: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const palettes = useMemo(() => {
    const found = library.palettes.filter(
      (palette) => inFilter(palette.bookmarkId) && matchesPalette(palette)
    )
    return filter === RECENT_FILTER ? newestFirst(found).slice(0, RECENT_LIMIT) : found
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.palettes, filter, needle])

  const colors = useMemo(() => {
    const found = library.colors.filter(
      (color) => inFilter(color.bookmarkId) && matchesColor(color)
    )
    return filter === RECENT_FILTER ? newestFirst(found).slice(0, RECENT_LIMIT) : found
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.colors, filter, needle])

  /** Library reordered newest-first, so the Recent tile previews recent work. */
  const recentLibrary = useMemo(
    () => ({
      ...library,
      palettes: newestFirst(library.palettes).slice(0, RECENT_LIMIT),
      colors: newestFirst(library.colors).slice(0, RECENT_LIMIT)
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library]
  )

  const activeBookmark = library.bookmarks.find((bookmark) => bookmark.id === filter) ?? null
  const empty = palettes.length === 0 && colors.length === 0

  const saveRename = (): void => {
    if (editing) store.renamePalette(editing.id, editingName)
    if (editingColor) store.renameColor(editingColor.id, editingName)
    setEditing(null)
    setEditingColor(null)
  }

  const bookmarkOptions = [
    { value: '', label: 'No bookmark' },
    ...library.bookmarks.map((bookmark) => ({ value: bookmark.id, label: bookmark.name }))
  ]

  return (
    <Page
      title="Library"
      actions={
        <>
          <div className="library__search">
            <Search01Icon size={15} />
            <input
              type="search"
              value={query}
              placeholder="Search names, colours, hex…"
              aria-label="Search the library"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                <Cancel01Icon size={14} />
              </button>
            ) : null}
          </div>
          <Button icon={<Upload01Icon size={16} />} onClick={() => void store.importLibrary()}>
            Import
          </Button>
          <Button icon={<Download01Icon size={16} />} onClick={() => void store.exportLibrary()}>
            Export
          </Button>
        </>
      }
    >
      {/* Bookmarks as cards: a glance at what is inside beats a list of names. */}
      <Section
        title="Bookmarks"
        actions={
          <Button
            size="sm"
            variant="ghost"
            icon={<Add01Icon size={15} />}
            onClick={() => setFolderDialog({ bookmark: null })}
          >
            New bookmark
          </Button>
        }
      >
        <ul className="library__bookmarks">
          <li>
            <BookmarkCard
              name="Everything"
              count={library.palettes.length + library.colors.length}
              rows={bookmarkPreview(library, null)}
              icon={<FolderOpenIcon size={24} strokeWidth={1.7} />}
              active={filter === null}
              onClick={() => setFilter(null)}
            />
          </li>

          <li>
            <BookmarkCard
              name="Recent"
              count={Math.min(library.palettes.length + library.colors.length, RECENT_LIMIT * 2)}
              rows={bookmarkPreview(recentLibrary, null)}
              icon={<Time04Icon size={24} strokeWidth={1.7} />}
              active={filter === RECENT_FILTER}
              onClick={() => setFilter(RECENT_FILTER)}
            />
          </li>

          {library.bookmarks.map((bookmark) => {
            const Glyph = bookmarkIcon(bookmark.icon)
            return (
              <li key={bookmark.id}>
                <BookmarkCard
                  name={bookmark.name}
                  count={countIn(library, bookmark.id)}
                  rows={bookmarkPreview(library, bookmark.id)}
                  icon={<Glyph size={24} strokeWidth={1.7} />}
                  accent={bookmark.hex}
                  active={filter === bookmark.id}
                  onClick={() => setFilter(bookmark.id)}
                  onDoubleClick={() => setFolderDialog({ bookmark })}
                  title={`${bookmark.name} — double-click to edit`}
                  tools={
                    <>
                      <IconButton
                        label={`Edit bookmark ${bookmark.name}`}
                        size="sm"
                        variant="solid"
                        onClick={() => setFolderDialog({ bookmark })}
                      >
                        <Edit02Icon size={14} />
                      </IconButton>
                      <IconButton
                        label={`Delete bookmark ${bookmark.name}`}
                        size="sm"
                        variant="solid"
                        onClick={() => store.deleteFolder(bookmark.id)}
                      >
                        <Delete01Icon size={14} />
                      </IconButton>
                    </>
                  }
                />
              </li>
            )
          })}
        </ul>
      </Section>

      {colors.length > 0 ? (
        <Section title="Colours" hint={`${colors.length} saved on their own`}>
          <ul className="library__colors">
            {colors.map((color) => (
              <li key={color.id} className="colour-card card">
                <button
                  type="button"
                  className="colour-card__swatch"
                  style={{ background: color.hex, color: readableTextOn(color.hex) }}
                  onClick={() => openCopyPanel({ kind: 'color', hex: color.hex, label: color.name })}
                  title={`${color.name} — copy options`}
                >
                  <span className="mono">{color.hex.toUpperCase()}</span>
                </button>
                <div className="colour-card__meta">
                  <p className="colour-card__name">{color.name}</p>
                  <div className="colour-card__tools">
                    <IconButton
                      label="Rename colour"
                      size="sm"
                      onClick={() => {
                        setEditingColor(color)
                        setEditingName(color.name)
                      }}
                    >
                      <Edit02Icon size={14} />
                    </IconButton>
                    <IconButton
                      label="Open in picker"
                      size="sm"
                      onClick={() => {
                        setHex(color.hex)
                        navigate('picker')
                      }}
                    >
                      <PaintBoardIcon size={14} />
                    </IconButton>
                    <IconButton
                      label="Delete colour"
                      size="sm"
                      variant="danger"
                      onClick={() => store.deleteColor(color.id)}
                    >
                      <Delete01Icon size={14} />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title="Palettes"
        hint={
          activeBookmark
            ? `In ${activeBookmark.name}`
            : filter === RECENT_FILTER
              ? 'Newest first'
              : undefined
        }
      >
        {empty ? (
          <EmptyState
            icon={<Folder01Icon size={30} />}
            title={
              needle
                ? `Nothing matches “${query.trim()}”`
                : filter === null
                  ? 'No palettes saved yet'
                  : 'This bookmark is empty'
            }
            description={
              needle
                ? 'Search covers palette names, colour names and hex values.'
                : 'Save a palette from the Harmonies, From image or Random pages and it will show up here.'
            }
          />
        ) : (
          <ul className="library__grid">
            {palettes.map((palette) => (
              <li
                className={`library__card card ${openPalette === palette.id ? 'is-editing' : ''}`}
                key={palette.id}
              >
                {openPalette === palette.id ? (
                  /*
                   * Editing writes straight through to the stored palette, so
                   * the board's own "Save to library" would only ever make a
                   * duplicate — it is hidden here.
                   */
                  <div className="library__editor">
                    <PaletteBoard
                      colors={swatchHexes(palette)}
                      onChange={(next) => store.replaceColors(palette.id, next)}
                      name={palette.name}
                      source={palette.source}
                      showSave={false}
                      height={150}
                    />
                  </div>
                ) : (
                  <PaletteStrip
                    colors={swatchHexes(palette)}
                    height={92}
                    showLabels={false}
                    paletteName={palette.name}
                    className="library__preview"
                  />
                )}

                <div className="library__meta">
                  <div className="library__meta-text">
                    <p className="library__name">{palette.name}</p>
                    <p className="library__sub">
                      {palette.swatches.length} colours · {palette.source} ·{' '}
                      {new Date(palette.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="library__tools">
                    <IconButton
                      label="Copy options"
                      size="sm"
                      onClick={() =>
                        openCopyPanel({
                          kind: 'palette',
                          colors: swatchHexes(palette),
                          name: palette.name
                        })
                      }
                    >
                      <Copy01Icon size={15} />
                    </IconButton>
                    <IconButton
                      label={openPalette === palette.id ? 'Close editor' : 'Edit colours'}
                      size="sm"
                      variant={openPalette === palette.id ? 'solid' : 'ghost'}
                      onClick={() =>
                        setOpenPalette(openPalette === palette.id ? null : palette.id)
                      }
                    >
                      <PaintBoardIcon size={15} />
                    </IconButton>
                    <IconButton
                      label="Rename palette"
                      size="sm"
                      onClick={() => {
                        setEditing(palette)
                        setEditingName(palette.name)
                      }}
                    >
                      <Edit02Icon size={15} />
                    </IconButton>
                    <IconButton
                      label="Export palette as JSON"
                      size="sm"
                      onClick={() => void store.exportPalette(palette)}
                    >
                      <Download01Icon size={15} />
                    </IconButton>
                    <IconButton
                      label="Delete palette"
                      size="sm"
                      variant="danger"
                      onClick={() => store.deletePalette(palette.id)}
                    >
                      <Delete01Icon size={15} />
                    </IconButton>
                  </div>
                </div>

                <div className="library__foot">
                  <Select
                    aria-label="Move to bookmark"
                    value={palette.bookmarkId ?? ''}
                    onChange={(event) =>
                      store.assignBookmark(palette.id, event.target.value || null)
                    }
                    options={bookmarkOptions}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setHex(palette.swatches[0]?.hex ?? '#000000')
                      navigate('picker')
                    }}
                  >
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <BookmarkDialog
        open={folderDialog !== null}
        bookmark={folderDialog?.bookmark ?? null}
        onClose={() => setFolderDialog(null)}
      />

      <Modal
        open={editing !== null || editingColor !== null}
        title={editingColor ? 'Rename colour' : 'Rename palette'}
        onClose={() => {
          setEditing(null)
          setEditingColor(null)
        }}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null)
                setEditingColor(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={saveRename}>
              Save
            </Button>
          </>
        }
      >
        <Field
          label="Name"
          hint={
            editingColor ? `Suggested: ${nameColor(editingColor.hex)}` : undefined
          }
        >
          {(id) => (
            <TextInput
              id={id}
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveRename()
              }}
            />
          )}
        </Field>
      </Modal>
    </Page>
  )
}
