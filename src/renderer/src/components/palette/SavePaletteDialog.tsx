import { useEffect, useState } from 'react'
import { useLibraryStore } from '../../store/libraryStore'
import { toast } from '../../store/toastStore'
import type { PaletteSource } from '../../types'
import { Button } from '../ui/Button'
import { Field, Select, TextInput } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { PaletteStrip } from '../color/PaletteStrip'

interface SavePaletteDialogProps {
  open: boolean
  colors: string[]
  source: PaletteSource
  suggestedName: string
  onClose(): void
}

/** Name + bookmark prompt shared by every screen that can save a palette. */
export function SavePaletteDialog({
  open,
  colors,
  source,
  suggestedName,
  onClose
}: SavePaletteDialogProps): React.JSX.Element {
  const bookmarks = useLibraryStore((state) => state.library.bookmarks)
  const savePalette = useLibraryStore((state) => state.savePalette)

  const [name, setName] = useState(suggestedName)
  const [bookmarkId, setBookmarkId] = useState<string>('')

  useEffect(() => {
    if (open) setName(suggestedName)
  }, [open, suggestedName])

  const save = (): void => {
    savePalette(name, colors, source, bookmarkId || null)
    toast.success(`Saved "${name.trim() || 'Untitled palette'}" to the library.`)
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Save palette"
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
      <PaletteStrip colors={colors} height={64} showLabels={false} />

      <Field label="Name">
        {(id) => (
          <TextInput
            id={id}
            value={name}
            placeholder="Autumn kitchen"
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
