import { useCallback, useEffect, useState } from 'react'
import { ImageAdd01Icon, Refresh01Icon } from 'hugeicons-react'
import { EmptyState, Page, Section } from '../components/layout/Page'
import { PaletteBoard } from '../components/palette/PaletteBoard'
import { Button } from '../components/ui/Button'
import { Range } from '../components/ui/Field'
import { extractPalette, fileToDataUrl } from '../services/extract.service'
import { toast } from '../store/toastStore'
import './ImagePage.css'

const MIN_COLORS = 2
const MAX_COLORS = 12

export function ImagePage(): React.JSX.Element {
  const [image, setImage] = useState<string | null>(null)
  const [count, setCount] = useState(6)
  const [colors, setColors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const run = useCallback(async (source: string, howMany: number) => {
    setBusy(true)
    try {
      const extracted = await extractPalette(source, howMany)
      setColors(extracted.map((entry) => entry.hex))
    } catch (error) {
      console.error('[image] extraction failed', error)
      toast.error('That image could not be read.')
    } finally {
      setBusy(false)
    }
  }, [])

  // Re-extract whenever the image or the requested count changes.
  useEffect(() => {
    if (image) void run(image, count)
  }, [image, count, run])

  const chooseFile = async (): Promise<void> => {
    const dataUrl = await window.api.files.openImage()
    if (dataUrl) setImage(dataUrl)
  }

  const onDrop = async (event: React.DragEvent): Promise<void> => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('That file is not an image.')
      return
    }
    setImage(await fileToDataUrl(file))
  }

  return (
    <Page title="From image">
      <div className="image__layout">
        <div
          className={`image__drop card ${dragOver ? 'is-over' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => void onDrop(event)}
        >
          {image ? (
            <>
              <img src={image} alt="Source for colour extraction" />
              <div className="image__drop-actions">
                <Button size="sm" onClick={() => void chooseFile()}>
                  Replace
                </Button>
                <Button
                  size="sm"
                  icon={<Refresh01Icon size={15} />}
                  onClick={() => void run(image, count)}
                >
                  Re-extract
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<ImageAdd01Icon size={30} />}
              title="Drop an image here"
              description="PNG, JPEG, WebP, GIF, BMP or AVIF — nothing leaves your machine."
              action={
                <Button variant="primary" onClick={() => void chooseFile()}>
                  Choose a file
                </Button>
              }
            />
          )}
        </div>

        <div className="image__side">
          <Section title="Extraction">
            <div className="image__panel card">
              <Range
                label="Colours to extract"
                min={MIN_COLORS}
                max={MAX_COLORS}
                value={count}
                onChange={setCount}
              />
              <p className="image__note">
                Colours are clustered on a downsampled copy of the image, then
                near-duplicates are merged so you get {count} genuinely distinct swatches.
              </p>
            </div>
          </Section>
        </div>
      </div>

      <Section title="Palette">
        {busy ? (
          <div className="image__busy card">Reading the image…</div>
        ) : colors.length > 0 ? (
          <PaletteBoard
            colors={colors}
            onChange={setColors}
            name="Image palette"
            source="image"
            height={200}
          />
        ) : (
          <EmptyState
            title="No palette yet"
            description="Choose an image and its colours will show up here."
          />
        )}
      </Section>
    </Page>
  )
}
