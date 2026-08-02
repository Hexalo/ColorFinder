import './picker.css'
import type { PickerFrame } from '../../../preload/index.d'

/**
 * Fullscreen eyedropper overlay.
 *
 * The main process hands us a native-resolution screenshot of this display.
 * We show it 1:1 over the display, so whatever the user sees under the cursor
 * is exactly the pixel we read out of the offscreen canvas.
 */

/** Side of the square region shown in the loupe, in source pixels. */
const ZOOM_PIXELS = 15
const LOUPE_SIZE = 148
const LOUPE_OFFSET = 22

const root = document.getElementById('root') as HTMLDivElement
root.innerHTML = `
  <img id="screen" alt="" draggable="false" />
  <div id="loupe">
    <canvas id="zoom" width="${LOUPE_SIZE}" height="${LOUPE_SIZE}"></canvas>
    <div id="readout"><span id="chip"></span><span id="hex">#000000</span></div>
  </div>
  <div id="hint">Click to pick &middot; <kbd>↑↓←→</kbd> nudge &middot; <kbd>Enter</kbd> confirm &middot; <kbd>Esc</kbd> cancel</div>
`

const screenImage = document.getElementById('screen') as HTMLImageElement
const loupe = document.getElementById('loupe') as HTMLDivElement
const zoomCanvas = document.getElementById('zoom') as HTMLCanvasElement
const chip = document.getElementById('chip') as HTMLSpanElement
const hexLabel = document.getElementById('hex') as HTMLSpanElement

const zoom = zoomCanvas.getContext('2d')!
zoom.imageSmoothingEnabled = false

/** Native-resolution copy of the screenshot, used for exact pixel reads. */
let source: HTMLCanvasElement | null = null
let sourceCtx: CanvasRenderingContext2D | null = null
let frameSize = { width: 0, height: 0 }

/** Pointer position in CSS pixels. Arrow keys nudge it by one source pixel. */
let cursor = { x: -1, y: -1 }
let currentHex = '#000000'
let pending = false

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`

/** CSS pixels -> source pixels. The overlay always covers the whole display. */
const toSource = (x: number, y: number): { x: number; y: number } => ({
  x: Math.floor((x / window.innerWidth) * frameSize.width),
  y: Math.floor((y / window.innerHeight) * frameSize.height)
})

function readPixel(sx: number, sy: number): string {
  if (!sourceCtx) return '#000000'
  const x = Math.min(Math.max(sx, 0), frameSize.width - 1)
  const y = Math.min(Math.max(sy, 0), frameSize.height - 1)
  const [r, g, b] = sourceCtx.getImageData(x, y, 1, 1).data
  return toHex(r, g, b)
}

function drawLoupe(sx: number, sy: number): void {
  if (!source) return
  const half = Math.floor(ZOOM_PIXELS / 2)
  const scale = LOUPE_SIZE / ZOOM_PIXELS

  zoom.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
  zoom.imageSmoothingEnabled = false
  zoom.drawImage(
    source,
    sx - half,
    sy - half,
    ZOOM_PIXELS,
    ZOOM_PIXELS,
    0,
    0,
    LOUPE_SIZE,
    LOUPE_SIZE
  )

  // Pixel grid, so the user can tell individual pixels apart.
  zoom.strokeStyle = 'rgba(0, 0, 0, 0.14)'
  zoom.lineWidth = 1
  for (let i = 1; i < ZOOM_PIXELS; i += 1) {
    const offset = Math.round(i * scale) + 0.5
    zoom.beginPath()
    zoom.moveTo(offset, 0)
    zoom.lineTo(offset, LOUPE_SIZE)
    zoom.moveTo(0, offset)
    zoom.lineTo(LOUPE_SIZE, offset)
    zoom.stroke()
  }

  // Highlight the pixel that will actually be picked.
  const centre = Math.round(half * scale) + 0.5
  zoom.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  zoom.lineWidth = 1
  zoom.strokeRect(centre, centre, scale - 1, scale - 1)
  zoom.strokeStyle = 'rgba(0, 0, 0, 0.85)'
  zoom.strokeRect(centre - 1, centre - 1, scale + 1, scale + 1)
}

function render(): void {
  pending = false
  if (cursor.x < 0 || !source) return

  const { x: sx, y: sy } = toSource(cursor.x, cursor.y)
  currentHex = readPixel(sx, sy)

  drawLoupe(sx, sy)
  chip.style.background = currentHex
  hexLabel.textContent = currentHex.toUpperCase()

  // Keep the loupe on screen when the cursor approaches an edge.
  const flipX = cursor.x + LOUPE_OFFSET + LOUPE_SIZE > window.innerWidth
  const flipY = cursor.y + LOUPE_OFFSET + LOUPE_SIZE + 34 > window.innerHeight
  const left = flipX ? cursor.x - LOUPE_OFFSET - LOUPE_SIZE : cursor.x + LOUPE_OFFSET
  const top = flipY ? cursor.y - LOUPE_OFFSET - LOUPE_SIZE - 34 : cursor.y + LOUPE_OFFSET

  loupe.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
  loupe.classList.add('ready')
}

function schedule(): void {
  if (pending) return
  pending = true
  requestAnimationFrame(render)
}

function moveTo(x: number, y: number): void {
  cursor = {
    x: Math.min(Math.max(x, 0), window.innerWidth - 1),
    y: Math.min(Math.max(y, 0), window.innerHeight - 1)
  }
  schedule()
}

window.addEventListener('mousemove', (event) => moveTo(event.clientX, event.clientY))

window.addEventListener('mousedown', (event) => {
  if (event.button !== 0) {
    window.pickerApi.cancel()
    return
  }
  moveTo(event.clientX, event.clientY)
  render()
  window.pickerApi.commit(currentHex)
})

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
  window.pickerApi.cancel()
})

window.addEventListener('keydown', (event) => {
  // One source pixel expressed in CSS pixels.
  const step = (event.shiftKey ? 10 : 1) * (window.innerWidth / (frameSize.width || 1))

  switch (event.key) {
    case 'Escape':
      window.pickerApi.cancel()
      break
    case 'Enter':
      if (cursor.x >= 0) window.pickerApi.commit(currentHex)
      break
    case 'ArrowLeft':
      moveTo(cursor.x - step, cursor.y)
      break
    case 'ArrowRight':
      moveTo(cursor.x + step, cursor.y)
      break
    case 'ArrowUp':
      moveTo(cursor.x, cursor.y - step)
      break
    case 'ArrowDown':
      moveTo(cursor.x, cursor.y + step)
      break
    default:
      return
  }
  event.preventDefault()
})

window.addEventListener('blur', () => loupe.classList.remove('ready'))

window.pickerApi.onFrame((frame: PickerFrame) => {
  frameSize = { width: frame.pixelWidth, height: frame.pixelHeight }
  screenImage.src = frame.dataUrl

  const image = new Image()
  image.onload = () => {
    // Trust the decoded image over the reported size — they can differ by a
    // pixel when the OS rounds a fractional scale factor.
    frameSize = { width: image.naturalWidth, height: image.naturalHeight }
    source = document.createElement('canvas')
    source.width = frameSize.width
    source.height = frameSize.height
    sourceCtx = source.getContext('2d', { willReadFrequently: true })
    sourceCtx?.drawImage(image, 0, 0)
    schedule()
  }
  image.src = frame.dataUrl
})
