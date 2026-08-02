import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download01Icon } from 'hugeicons-react'
import { Page } from '../components/layout/Page'
import { PosterCanvas } from '../components/poster/PosterCanvas'
import { PosterSettings } from '../components/poster/PosterSettings'
import { CURRENT_SOURCE, LATEST_SOURCE, readSource } from '../components/poster/PosterSwatches'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import { fileToDataUrl } from '../services/extract.service'
import { usePosterImage } from '../hooks/usePosterImage'
import { usePosterSplit } from '../hooks/usePosterSplit'
import { useTab } from '../hooks/useTab'
import { posterFileName, renderPosterBytes } from '../services/poster.service'
import { useColorStore } from '../store/colorStore'
import { useGeneratedStore } from '../store/generatedStore'
import { useLibraryStore } from '../store/libraryStore'
import { usePosterStore } from '../store/posterStore'
import { toast } from '../store/toastStore'
import type { ImageFormat } from '../types'
import './PosterPage.css'

const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' }
]

/**
 * Turns a colour or a palette into an image worth sharing.
 *
 * The page is two panes: the poster as it will be exported on the left, every
 * control on the right, with a divider the user can drag. Both halves read the
 * same store, so the preview is the settings — there is nothing to apply.
 */
export function PosterPage(): React.JSX.Element {
  const config = usePosterStore((state) => state.config)
  const swatches = usePosterStore((state) => state.swatches)
  const ready = usePosterStore((state) => state.ready)
  const store = usePosterStore()

  const library = useLibraryStore((state) => state.library)
  const generated = useGeneratedStore()
  const hex = useColorStore((state) => state.hex)

  const source = usePosterStore((state) => state.source)
  const loadedKey = usePosterStore((state) => state.loadedKey)

  const [template, setTemplate] = useTab<string>('posterTemplate', 'spec-sheet')
  const [scale, setScale] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const split = useRef<HTMLDivElement>(null)
  const { split: fraction, resizing, startResize } = usePosterSplit(split)

  const image = usePosterImage(config.image)

  /** Pulls a source into the poster. Unknown or empty sources are left alone. */
  const applySource = useCallback(
    (next: string) => {
      store.setSource(next)
      const found = readSource(next, library, generated, hex)
      if (!found) return
      store.loadColors(found.colors, found.names, found.title)
    },
    // `store` is stable; `generated` and `library` are what this reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library, generated, hex]
  )

  const applyTemplate = (id: string): void => {
    setTemplate(id)
    store.applyTemplate(id)
  }

  /**
   * First arrival: restore the template the user last chose and fill the
   * poster with whatever they have been working on.
   */
  useEffect(() => {
    if (ready) return
    store.applyTemplate(template)
    applySource(LATEST_SOURCE)
    if (usePosterStore.getState().swatches.length === 0) applySource(CURRENT_SOURCE)
    store.markReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  /**
   * While "latest palette" is the source, generating a new one elsewhere has
   * to show up here — otherwise the poster quietly contradicts its own source
   * line. Any other source is a deliberate choice and is left alone.
   */
  useEffect(() => {
    if (!ready || source !== LATEST_SOURCE) return
    const key = generated.colors.join(',')
    if (key && key !== loadedKey) applySource(LATEST_SOURCE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, source, loadedKey, generated.colors])

  // Memoised so the canvas only redraws when the poster itself has changed.
  const scene = useMemo(() => ({ config, swatches, image }), [config, swatches, image])

  /**
   * A picture dropped anywhere on the preview becomes the poster's
   * background — the file dialog is the long way round for something the user
   * already has in a Finder window.
   */
  const dropImage = async (event: React.DragEvent): Promise<void> => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('That file is not an image.')
      return
    }
    store.update({
      image: await fileToDataUrl(file),
      background: 'image',
      backgroundDim: config.backgroundDim || 0.25,
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0
    })
  }

  const exportPoster = async (): Promise<void> => {
    if (swatches.length === 0) return
    setBusy(true)
    try {
      const bytes = await renderPosterBytes(scene)
      const name = config.title.trim() || generated.name || 'poster'
      const path = await window.api.files.exportImage(
        posterFileName(name, config.format),
        bytes,
        config.format
      )
      if (path) toast.success('Poster exported.')
    } catch (error) {
      console.error('[poster] export failed', error)
      toast.error('The poster could not be exported.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page
      title="Poster"
      actions={
        <>
          <Select
            className="poster__format"
            aria-label="Export format"
            options={FORMATS}
            value={config.format}
            onChange={(event) =>
              store.update({ format: event.target.value as ImageFormat })
            }
          />
          <Button
            variant="primary"
            icon={<Download01Icon size={16} />}
            disabled={busy || swatches.length === 0}
            onClick={() => void exportPoster()}
          >
            {busy ? 'Exporting…' : 'Export image'}
          </Button>
        </>
      }
      fill
    >
      <div className={`poster ${resizing ? 'is-resizing' : ''}`} ref={split}>
        <div
          className={`poster__preview ${dragOver ? 'is-over' : ''}`}
          style={{ flexBasis: `${fraction * 100}%` }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => void dropImage(event)}
        >
          <PosterCanvas scene={scene} onScale={setScale} />
          <p className="poster__meta mono">
            {config.width} × {config.height} px
            {scale > 0 ? ` · ${Math.round(scale * 100)}%` : ''}
          </p>
        </div>

        <div
          className="poster__divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the preview"
          onPointerDown={startResize}
        >
          <span className="poster__grip" />
        </div>

        <div className="poster__panel">
          <PosterSettings
            source={source}
            onSource={applySource}
            template={template}
            onTemplate={applyTemplate}
          />
        </div>
      </div>
    </Page>
  )
}
