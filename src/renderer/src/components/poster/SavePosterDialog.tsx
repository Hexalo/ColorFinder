import { useEffect, useState } from 'react'
import { PaletteStrip } from '../color/PaletteStrip'
import { Button } from '../ui/Button'
import { Field, Segmented, Select, TextInput } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { usePosterStore } from '../../store/posterStore'
import { useLibraryStore } from '../../store/libraryStore'
import { toast } from '../../store/toastStore'

interface SavePosterDialogProps {
  open: boolean
  onClose(): void
}

/**
 * Names and files a snapshot of the current poster. When the poster already
 * came from a saved configuration, this offers to overwrite it instead of
 * always creating a new entry — the same choice `SavePaletteDialog` does not
 * need, because a palette is not usually edited in place.
 */
export function SavePosterDialog({ open, onClose }: SavePosterDialogProps): React.JSX.Element {
  const config = usePosterStore((state) => state.config)
  const swatches = usePosterStore((state) => state.swatches)
  const editingPosterId = usePosterStore((state) => state.editingPosterId)
  const setEditingPosterId = usePosterStore((state) => state.setEditingPosterId)

  const bookmarks = useLibraryStore((state) => state.library.bookmarks)
  const posters = useLibraryStore((state) => state.library.posters)
  const savePoster = useLibraryStore((state) => state.savePoster)
  const updatePosterEntry = useLibraryStore((state) => state.updatePosterEntry)

  const editingPoster = posters.find((poster) => poster.id === editingPosterId) ?? null

  const [name, setName] = useState('')
  const [bookmarkId, setBookmarkId] = useState('')
  const [mode, setMode] = useState<'update' | 'new'>('update')

  useEffect(() => {
    if (!open) return
    setName(editingPoster?.name ?? (config.title.trim() || 'Untitled poster'))
    setBookmarkId(editingPoster?.bookmarkId ?? '')
    setMode(editingPoster ? 'update' : 'new')
  }, [open, editingPoster, config.title])

  const save = (): void => {
    const trimmed = name.trim() || 'Untitled poster'
    if (mode === 'update' && editingPoster) {
      updatePosterEntry(editingPoster.id, {
        name: trimmed,
        bookmarkId: bookmarkId || null,
        config,
        swatches
      })
      toast.success(`Updated "${trimmed}".`)
    } else {
      const saved = savePoster(trimmed, config, swatches, bookmarkId || null)
      setEditingPosterId(saved.id)
      toast.success(`Saved "${saved.name}" to the library.`)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Save poster configuration"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <PaletteStrip colors={swatches.map((swatch) => swatch.hex)} height={64} showLabels={false} />

      {editingPoster ? (
        <Field label="Save as" hint="Overwrite the loaded configuration, or file this as a new one.">
          {() => (
            <Segmented
              ariaLabel="Save mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'update', label: `Update "${editingPoster.name}"` },
                { value: 'new', label: 'Save as new' }
              ]}
            />
          )}
        </Field>
      ) : null}

      <Field label="Name">
        {(id) => (
          <TextInput
            id={id}
            value={name}
            placeholder="Autumn spec sheet"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save()
            }}
          />
        )}
      </Field>

      <Field label="Bookmark" hint="Bookmarks are folders you can create in the Library.">
        {(id) => (
          <Select
            id={id}
            value={bookmarkId}
            onChange={(event) => setBookmarkId(event.target.value)}
            options={[
              { value: '', label: 'No bookmark' },
              ...bookmarks.map((bookmark) => ({ value: bookmark.id, label: bookmark.name }))
            ]}
          />
        )}
      </Field>
    </Modal>
  )
}
