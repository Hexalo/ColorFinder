import { useEffect, useState } from 'react'
import { bookmarkIcon } from '../../data/bookmarkIcons'
import { readableTextOn } from '../../services/color.service'
import { nameColor } from '../../services/naming.service'
import { useLibraryStore } from '../../store/libraryStore'
import { Button } from '../ui/Button'
import { Field, TextInput } from '../ui/Field'
import { Modal } from '../ui/Modal'
import './SaveColorDialog.css'

interface SaveColorDialogProps {
  open: boolean
  hex: string
  onClose(): void
}

/**
 * Name-and-file prompt for a single colour, mirroring `SavePaletteDialog` so
 * saving a colour and saving a palette feel like the same action.
 */
export function SaveColorDialog({ open, hex, onClose }: SaveColorDialogProps): React.JSX.Element {
  const bookmarks = useLibraryStore((state) => state.library.bookmarks)
  const saveColor = useLibraryStore((state) => state.saveColor)

  const [name, setName] = useState('')
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)

  // Seed with the generated name each time the dialog opens.
  useEffect(() => {
    if (!open) return
    setName(nameColor(hex))
    setBookmarkId(null)
  }, [open, hex])

  const submit = (): void => {
    saveColor(hex, name, bookmarkId)
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Save colour"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <div
        className="save-colour__hero"
        style={{ background: hex, color: readableTextOn(hex) }}
      >
        <span className="mono">{hex.toUpperCase()}</span>
      </div>

      <Field label="Name">
        {(id) => (
          <TextInput
            id={id}
            value={name}
            placeholder={nameColor(hex)}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
          />
        )}
      </Field>

      {/* A grid rather than a <select>: bookmarks carry an icon and a colour. */}
      <Field label="Bookmark" hint="Bookmarks are folders you can create in the Library.">
        {() => (
          <div className="save-colour__bookmarks" role="radiogroup" aria-label="Bookmark">
            <button
              type="button"
              role="radio"
              aria-checked={bookmarkId === null}
              className={`save-colour__bookmark ${bookmarkId === null ? 'is-active' : ''}`}
              onClick={() => setBookmarkId(null)}
            >
              None
            </button>

            {bookmarks.map((bookmark) => {
              const Glyph = bookmarkIcon(bookmark.icon)
              const active = bookmarkId === bookmark.id
              return (
                <button
                  key={bookmark.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`save-colour__bookmark ${active ? 'is-active' : ''}`}
                  onClick={() => setBookmarkId(bookmark.id)}
                >
                  <Glyph size={15} strokeWidth={1.8} style={{ color: bookmark.hex }} />
                  {bookmark.name}
                </button>
              )
            })}
          </div>
        )}
      </Field>
    </Modal>
  )
}
