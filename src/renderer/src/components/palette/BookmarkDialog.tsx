import { useEffect, useState } from 'react'
import { BOOKMARK_ICONS, DEFAULT_BOOKMARK_ICON, bookmarkIcon } from '../../data/bookmarkIcons'
import { randomHex } from '../../services/random.service'
import { useLibraryStore } from '../../store/libraryStore'
import { toast } from '../../store/toastStore'
import type { Bookmark } from '../../types'
import { Button } from '../ui/Button'
import { Field, TextInput } from '../ui/Field'
import { HexField } from '../color/HexField'
import { Modal } from '../ui/Modal'
import './BookmarkDialog.css'

interface BookmarkDialogProps {
  open: boolean
  /** `null` creates a new bookmark; a bookmark edits it in place. */
  bookmark: Bookmark | null
  onClose(): void
}

/** Create or restyle a bookmark: name, glyph and accent colour. */
export function BookmarkDialog({
  open,
  bookmark,
  onClose
}: BookmarkDialogProps): React.JSX.Element {
  const createFolder = useLibraryStore((state) => state.createFolder)
  const editFolder = useLibraryStore((state) => state.editFolder)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(DEFAULT_BOOKMARK_ICON)
  const [hex, setHex] = useState('#8a8f6a')

  // Reset the form each time the dialog opens, for whichever bookmark it is on.
  useEffect(() => {
    if (!open) return
    setName(bookmark?.name ?? '')
    setIcon(bookmark?.icon ?? DEFAULT_BOOKMARK_ICON)
    setHex(bookmark?.hex ?? randomHex('muted'))
  }, [open, bookmark])

  const submit = (): void => {
    if (bookmark) {
      editFolder(bookmark.id, { name, hex, icon })
      toast.success(`"${name.trim() || bookmark.name}" updated.`)
    } else {
      if (!name.trim()) return
      createFolder(name, hex, icon)
      toast.success(`"${name.trim()}" created.`)
    }
    onClose()
  }

  const Preview = bookmarkIcon(icon)

  return (
    <Modal
      open={open}
      title={bookmark ? 'Edit bookmark' : 'New bookmark'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {bookmark ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="bookmark-dialog__preview">
        <span className="bookmark-dialog__glyph" style={{ color: hex }}>
          <Preview size={20} strokeWidth={1.8} />
        </span>
        <span className="bookmark-dialog__preview-name">{name.trim() || 'Untitled bookmark'}</span>
      </div>

      <Field label="Name">
        {(id) => (
          <TextInput
            id={id}
            value={name}
            placeholder="Client work"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
          />
        )}
      </Field>

      <Field label="Colour" hint="Tints the bookmark's glyph in the library sidebar.">
        {() => (
          <div className="bookmark-dialog__colour">
            <label className="bookmark-dialog__swatch" style={{ background: hex }}>
              <span className="sr-only">Pick the bookmark colour</span>
              <input
                type="color"
                value={hex}
                onChange={(event) => setHex(event.target.value)}
              />
            </label>
            <HexField value={hex} onChange={setHex} size="sm" ariaLabel="Bookmark colour" />
          </div>
        )}
      </Field>

      <Field label="Icon">
        {() => (
          <div className="bookmark-dialog__icons" role="radiogroup" aria-label="Bookmark icon">
            {BOOKMARK_ICONS.map((definition) => {
              const Icon = definition.icon
              const active = definition.id === icon
              return (
                <button
                  key={definition.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={definition.label}
                  title={definition.label}
                  className={`bookmark-dialog__icon ${active ? 'is-active' : ''}`}
                  style={active ? { color: hex, borderColor: hex } : undefined}
                  onClick={() => setIcon(definition.id)}
                >
                  <Icon size={18} strokeWidth={1.7} />
                </button>
              )
            })}
          </div>
        )}
      </Field>
    </Modal>
  )
}
