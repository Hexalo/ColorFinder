import { useState } from 'react'
import { Delete01Icon, Edit02Icon, FloppyDiskIcon } from 'hugeicons-react'
import { Button, IconButton } from '../ui/Button'
import { Field, TextInput } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useLibraryStore } from '../../store/libraryStore'
import { usePosterStore } from '../../store/posterStore'
import { SavePosterDialog } from './SavePosterDialog'
import type { SavedPoster } from '../../types'
import './PosterSavedConfigs.css'

/**
 * Configurations saved to the library: a full poster setup — page, layout,
 * type, background — filed under a name so it can be pulled back later. The
 * same list also lives on the Library page; this one exists for when you are
 * already mid-poster and just want last week's look back.
 */
export function PosterSavedConfigs(): React.JSX.Element {
  const posters = useLibraryStore((state) => state.library.posters)
  const deletePoster = useLibraryStore((state) => state.deletePoster)
  const renamePoster = useLibraryStore((state) => state.renamePoster)

  const editingPosterId = usePosterStore((state) => state.editingPosterId)
  const loadPreset = usePosterStore((state) => state.loadPreset)

  const [saving, setSaving] = useState(false)
  const [renaming, setRenaming] = useState<SavedPoster | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const saveRename = (): void => {
    if (renaming) renamePoster(renaming.id, renameDraft)
    setRenaming(null)
  }

  return (
    <div className="poster-panel__stack">
      <Button
        size="sm"
        variant="primary"
        icon={<FloppyDiskIcon size={15} />}
        onClick={() => setSaving(true)}
      >
        Save this configuration…
      </Button>

      {posters.length === 0 ? (
        <p className="poster-panel__note">
          Nothing saved yet — configurations you save appear here and in the Library.
        </p>
      ) : (
        <ul className="poster-configs">
          {posters.map((poster) => (
            <li
              key={poster.id}
              className={`poster-configs__item ${editingPosterId === poster.id ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className="poster-configs__preview"
                title={`Load "${poster.name}"`}
                onClick={() => loadPreset(poster)}
              >
                {poster.swatches.slice(0, 6).map((swatch, index) => (
                  <span key={index} style={{ background: swatch.hex }} />
                ))}
              </button>

              <button
                type="button"
                className="poster-configs__name"
                title={`Load "${poster.name}"`}
                onClick={() => loadPreset(poster)}
              >
                {poster.name}
              </button>

              <IconButton
                label={`Rename "${poster.name}"`}
                size="sm"
                onClick={() => {
                  setRenaming(poster)
                  setRenameDraft(poster.name)
                }}
              >
                <Edit02Icon size={13} />
              </IconButton>
              <IconButton
                label={`Delete "${poster.name}"`}
                size="sm"
                variant="danger"
                onClick={() => deletePoster(poster.id)}
              >
                <Delete01Icon size={13} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <SavePosterDialog open={saving} onClose={() => setSaving(false)} />

      <Modal
        open={renaming !== null}
        title="Rename poster configuration"
        onClose={() => setRenaming(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveRename}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Name">
          {(id) => (
            <TextInput
              id={id}
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveRename()
              }}
            />
          )}
        </Field>
      </Modal>
    </div>
  )
}
