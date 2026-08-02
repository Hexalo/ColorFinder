import { useEffect, useRef, useState } from 'react'
import { drawPoster } from '../../services/poster.service'
import type { PosterScene } from '../../services/poster.service'
import './PosterCanvas.css'

interface PosterCanvasProps {
  scene: PosterScene
  /** Reported back so the page can show the zoom level. */
  onScale?(scale: number): void
}

/** Never allocate a backing store larger than this on either side. */
const MAX_BACKING = 3000

/**
 * The live preview.
 *
 * It is the exporter's own renderer, drawn into a smaller context: the canvas
 * is scaled to fit the pane and `drawPoster` still works in poster pixels, so
 * what is on screen cannot drift from what lands in the file.
 */
export function PosterCanvas({ scene, onScale }: PosterCanvasProps): React.JSX.Element {
  const frame = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  /** Canvas text falls back to a system face until the app fonts are in. */
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const node = frame.current
    if (!node) return undefined

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox({ width, height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const { config } = scene
  const scale =
    box.width > 0 && box.height > 0
      ? Math.min(box.width / config.width, box.height / config.height)
      : 0

  useEffect(() => {
    onScale?.(scale)
  }, [scale, onScale])

  useEffect(() => {
    const node = canvas.current
    if (!node || scale <= 0) return

    // Draw above CSS resolution so the small type in the preview stays crisp,
    // within a ceiling that keeps the backing store sane on a 5K display.
    const density = Math.min(
      window.devicePixelRatio || 1,
      MAX_BACKING / Math.max(config.width * scale, config.height * scale)
    )
    const pixels = scale * Math.max(density, 1)

    node.width = Math.round(config.width * pixels)
    node.height = Math.round(config.height * pixels)
    node.style.width = `${config.width * scale}px`
    node.style.height = `${config.height * scale}px`

    const ctx = node.getContext('2d')
    if (!ctx) return

    ctx.setTransform(pixels, 0, 0, pixels, 0, 0)
    drawPoster(ctx, scene)
    // `fontsReady` is not read here: it is a dependency so the poster is drawn
    // again once the bundled faces have loaded.
  }, [scene, scale, config.width, config.height, fontsReady])

  return (
    <div className="poster-canvas" ref={frame}>
      {scene.swatches.length === 0 ? (
        <p className="poster-canvas__empty">Choose some colours to compose a poster.</p>
      ) : (
        <canvas className="poster-canvas__surface" ref={canvas} />
      )}
    </div>
  )
}
