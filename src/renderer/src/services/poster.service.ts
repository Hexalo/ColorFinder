import {
  FIELD_BY_ID,
  FONT_BY_ID,
  POSTER_MAX_SIZE,
  POSTER_MIN_SIZE,
  RATIO_BY_ID
} from '../data/posterPresets'
import { NO_ICON, posterIconShape } from '../data/posterIcons'
import { clamp, contrastRatio, readableTextOn } from './color.service'
import type { ImageFormat, PosterAlign, PosterConfig, PosterSwatch } from '../types'

/**
 * The poster renderer.
 *
 * One function draws the whole thing onto a 2D context, and both the live
 * preview and the exported file go through it — the preview simply scales the
 * context down first. That is why nothing here reads the DOM or the theme: the
 * only inputs are the config, the colours and an optional picture.
 *
 * All the config's measurements are percentages of the poster's short edge, so
 * everything below multiplies by `unit` before it touches a coordinate.
 */

export interface PosterScene {
  config: PosterConfig
  swatches: PosterSwatch[]
  /** Decoded background picture, or `null` when there is none loaded yet. */
  image: HTMLImageElement | null
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Canvas letter-spacing is recent enough to be worth feature-testing. */
type TrackedContext = CanvasRenderingContext2D & { letterSpacing?: string }

const JPEG_QUALITY = 0.94

/* -------------------------------------------------------------------------- */
/* Size helpers                                                                */
/* -------------------------------------------------------------------------- */

const clampSize = (value: number): number =>
  Math.round(
    clamp(Number.isFinite(value) ? value : POSTER_MIN_SIZE, POSTER_MIN_SIZE, POSTER_MAX_SIZE)
  )

/** Re-shapes the page to a ratio, keeping its long edge. */
export function withRatio(config: PosterConfig, ratioId: string): PosterConfig {
  const ratio = RATIO_BY_ID[ratioId]?.value ?? null
  if (ratio === null) return { ...config, ratio: ratioId }

  const long = Math.max(config.width, config.height)
  const width = ratio >= 1 ? long : Math.round(long * ratio)
  const height = ratio >= 1 ? Math.round(long / ratio) : long
  return { ...config, ratio: ratioId, width: clampSize(width), height: clampSize(height) }
}

/**
 * Sets one side. Under a fixed ratio the other side follows, which is what
 * makes the resolution field feel like a resolution rather than a crop.
 */
export function withSide(
  config: PosterConfig,
  side: 'width' | 'height',
  value: number
): PosterConfig {
  const size = clampSize(value)
  const ratio = RATIO_BY_ID[config.ratio]?.value ?? null
  if (ratio === null) return { ...config, [side]: size }

  return side === 'width'
    ? { ...config, width: size, height: clampSize(size / ratio) }
    : { ...config, height: size, width: clampSize(size * ratio) }
}

/** Scales the poster so its long edge lands on `value`. */
export function withLongEdge(config: PosterConfig, value: number): PosterConfig {
  const side = config.width >= config.height ? 'width' : 'height'
  return withSide(config, side, value)
}

/* -------------------------------------------------------------------------- */
/* Colour helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The colour the text takes on a band.
 *
 * `palette` is the interesting one: instead of the usual black-or-white it
 * borrows the most readable colour from the palette itself, which is what
 * gives printed colour cards their coherence — the label on the orange band is
 * the palette's own brown, not a generic dark grey.
 */
export function textToneFor(hex: string, config: PosterConfig, palette: string[]): string {
  if (config.textTone === 'custom') return config.textColor
  if (config.textTone === 'auto') return readableTextOn(hex)

  let best: { hex: string; contrast: number } | null = null
  for (const candidate of palette) {
    const contrast = contrastRatio(hex, candidate)
    if (!best || contrast > best.contrast) best = { hex: candidate, contrast }
  }
  // Under about 3:1 the label stops being readable at small sizes; a
  // monochrome palette has no useful partner, so fall back to black or white.
  return best && best.contrast >= 3 ? best.hex : readableTextOn(hex)
}

/**
 * Readable colour for the title, which sits on the page rather than on a band.
 * A picture has no single colour to measure against, so it gets white.
 */
function pageToneFor(config: PosterConfig): string {
  if (config.textTone === 'custom') return config.textColor
  if (config.background === 'image' && config.image) return '#ffffff'
  return readableTextOn(config.backgroundColor)
}

/* -------------------------------------------------------------------------- */
/* Text helpers                                                                */
/* -------------------------------------------------------------------------- */

const fontString = (weight: number, size: number, family: string): string =>
  `${weight} ${Math.max(size, 1).toFixed(2)}px ${family}`

function setTracking(ctx: CanvasRenderingContext2D, px: number): void {
  const tracked = ctx as TrackedContext
  if ('letterSpacing' in tracked) tracked.letterSpacing = `${px.toFixed(2)}px`
}

/**
 * Shrinks a size until the text fits the width it was given. Poster names are
 * user-typed and bands are narrow, so something has to give; making the type
 * smaller reads better than clipping "Outer Space (Crayola)" in half.
 */
function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  family: string,
  maxWidth: number
): number {
  if (maxWidth <= 0) return size
  let current = size
  for (let i = 0; i < 24; i += 1) {
    ctx.font = fontString(weight, current, family)
    if (ctx.measureText(text).width <= maxWidth || current <= size * 0.4) break
    current *= 0.94
  }
  return current
}

/** X anchor + canvas alignment for the poster's text alignment. */
function anchorFor(align: PosterConfig['textAlign'], box: { x: number; w: number }): number {
  if (align === 'center') return box.x + box.w / 2
  if (align === 'right') return box.x + box.w
  return box.x
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

function alignOffset(align: PosterAlign, slack: number, index: number, count: number): number {
  if (slack <= 0) return 0
  switch (align) {
    case 'center':
      return slack / 2
    case 'end':
      return slack
    case 'cascade':
      return count > 1 ? (slack * index) / (count - 1) : slack / 2
    default:
      return 0
  }
}

/** Where each band lands on the page, in poster pixels. */
export function bandRects(config: PosterConfig, count: number): Rect[] {
  if (count < 1) return []

  const unit = Math.min(config.width, config.height) / 100
  const pad = config.padding * unit
  const gap = config.gap * unit

  const area: Rect = {
    x: pad,
    y: pad + titleBand(config, unit),
    w: config.width - pad * 2,
    h: config.height - pad * 2 - titleBand(config, unit)
  }

  const vertical = config.orientation === 'vertical'
  const along = vertical ? area.h : area.w
  const across = vertical ? area.w : area.h
  const size = (along - gap * (count - 1)) / count
  if (size <= 0 || across <= 0) return []

  const bandAcross = across * config.bandScale
  const slack = across - bandAcross

  return Array.from({ length: count }, (_, index) => {
    const offset = index * (size + gap)
    const cross = alignOffset(config.align, slack, index, count)
    return vertical
      ? { x: area.x + cross, y: area.y + offset, w: bandAcross, h: size }
      : { x: area.x + offset, y: area.y + cross, w: size, h: bandAcross }
  })
}

/** Vertical room the title takes off the top of the page, title gap included. */
function titleBand(config: PosterConfig, unit: number): number {
  if (!config.showTitle || !config.title.trim()) return 0
  return config.titleSize * unit * 1.9
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                     */
/* -------------------------------------------------------------------------- */

function fillPage(ctx: CanvasRenderingContext2D, scene: PosterScene, unit: number): void {
  const { config, swatches, image } = scene

  ctx.fillStyle = config.backgroundColor
  ctx.fillRect(0, 0, config.width, config.height)

  if (config.background === 'gradient' && swatches.length > 0) {
    const gradient = ctx.createLinearGradient(0, 0, config.width, config.height)
    swatches.forEach((swatch, index) => {
      const stop = swatches.length === 1 ? index : index / (swatches.length - 1)
      gradient.addColorStop(stop, swatch.hex)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, config.width, config.height)
    return
  }

  if (config.background !== 'image' || !image) return

  const blur = config.imageBlur * unit
  const frame = imageRect(config, image, blur)

  ctx.save()
  // Blur samples transparent pixels past the edges, so the picture is drawn a
  // little larger than the page to keep the halo out of frame.
  if (blur > 0) ctx.filter = `blur(${blur.toFixed(2)}px)`
  ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h)
  ctx.restore()

  if (config.imageDim > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${config.imageDim})`
    ctx.fillRect(0, 0, config.width, config.height)
  }
}

function imageRect(config: PosterConfig, image: HTMLImageElement, bleed: number): Rect {
  const box = {
    x: -bleed * 2,
    y: -bleed * 2,
    w: config.width + bleed * 4,
    h: config.height + bleed * 4
  }
  if (config.imageFit === 'stretch') return box

  const source = image.naturalWidth / image.naturalHeight
  const target = box.w / box.h
  const cover = config.imageFit === 'cover'
  const wide = cover ? source > target : source < target

  const w = wide ? box.h * source : box.w
  const h = wide ? box.h : box.w / source
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}

function pathBand(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  const limit = Math.min(rect.w, rect.h) / 2
  ctx.beginPath()
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.max(0, Math.min(radius, limit)))
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  shape: Path2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.fillStyle = color
  ctx.fill(shape)
  ctx.restore()
}

interface BandText {
  /** Draws the block with its top-left at `y`, and reports the height used. */
  height: number
  draw(y: number): void
}

/**
 * Builds the text block for one band: the name, then the values in whichever
 * arrangement the config asks for. Measuring and drawing are split so the
 * block can be positioned by its total height.
 */
function bandText(
  ctx: CanvasRenderingContext2D,
  scene: PosterScene,
  swatch: PosterSwatch,
  index: number,
  box: Rect,
  color: string,
  unit: number
): BandText {
  const { config } = scene
  const family = FONT_BY_ID[config.fontId]?.stack ?? FONT_BY_ID.system.stack
  const anchor = anchorFor(config.textAlign, box)
  const steps: { height: number; draw(y: number): void }[] = []

  const values = config.fields
    .map((id) => FIELD_BY_ID[id])
    .filter((field) => field !== undefined)
    .map((field) => ({
      label: field.label,
      value:
        field.id === 'hex' && config.hashPrefix
          ? `#${field.format(swatch.hex, index)}`
          : field.format(swatch.hex, index)
    }))

  ctx.textBaseline = 'top'
  ctx.textAlign = config.textAlign

  if (config.showName && swatch.name.trim()) {
    const text = config.uppercaseNames ? swatch.name.toUpperCase() : swatch.name
    setTracking(ctx, 0)
    const size = fitSize(ctx, text, config.nameWeight, config.nameSize * unit, family, box.w)
    steps.push({
      height: size * 1.16,
      draw: (y) => {
        setTracking(ctx, 0)
        ctx.font = fontString(config.nameWeight, size, family)
        ctx.fillStyle = color
        ctx.fillText(text, anchor, y)
      }
    })
  }

  if (values.length > 0) {
    steps.push({ height: unit * 1.6, draw: () => undefined })

    const labelSize = config.labelSize * unit
    const valueSize = config.valueSize * unit
    const tracking = config.labelTracking * labelSize

    if (config.infoLayout === 'inline') {
      const text = values.map((entry) => entry.value).join('   ·   ')
      const size = fitSize(ctx, text, 500, valueSize, family, box.w)
      steps.push({
        height: size * 1.4,
        draw: (y) => {
          setTracking(ctx, 0)
          ctx.font = fontString(500, size, family)
          ctx.fillStyle = color
          ctx.fillText(text, anchor, y)
        }
      })
    } else if (config.infoLayout === 'columns') {
      const columnWidth = box.w / values.length
      const labelHeight = config.showLabels ? labelSize * 1.5 : 0
      steps.push({
        height: labelHeight + valueSize * 1.35,
        draw: (y) => {
          values.forEach((entry, column) => {
            const cell = { x: box.x + column * columnWidth, w: columnWidth * 0.94 }
            const cellAnchor = anchorFor(config.textAlign, cell)
            if (config.showLabels) {
              setTracking(ctx, tracking)
              ctx.font = fontString(600, labelSize, family)
              ctx.fillStyle = color
              ctx.globalAlpha = 0.72
              ctx.fillText(entry.label, cellAnchor, y)
              ctx.globalAlpha = 1
            }
            setTracking(ctx, 0)
            const size = fitSize(ctx, entry.value, 600, valueSize, family, cell.w)
            ctx.font = fontString(600, size, family)
            ctx.fillStyle = color
            ctx.fillText(entry.value, cellAnchor, y + labelHeight)
          })
        }
      })
    } else {
      values.forEach((entry, row) => {
        const labelHeight = config.showLabels ? labelSize * 1.5 : 0
        steps.push({
          height: labelHeight + valueSize * 1.45,
          draw: (y) => {
            if (config.showLabels) {
              setTracking(ctx, tracking)
              ctx.font = fontString(600, labelSize, family)
              ctx.fillStyle = color
              ctx.globalAlpha = 0.72
              ctx.fillText(entry.label, anchor, y)
              ctx.globalAlpha = 1
            }
            setTracking(ctx, 0)
            const size = fitSize(ctx, entry.value, 600, valueSize, family, box.w)
            ctx.font = fontString(600, size, family)
            ctx.fillStyle = color
            ctx.fillText(entry.value, anchor, y + labelHeight)
          }
        })
        if (row < values.length - 1) steps.push({ height: unit * 0.5, draw: () => undefined })
      })
    }
  }

  const height = steps.reduce((total, step) => total + step.height, 0)
  return {
    height,
    draw: (top) => {
      let y = top
      for (const step of steps) {
        step.draw(y)
        y += step.height
      }
    }
  }
}

function drawBand(
  ctx: CanvasRenderingContext2D,
  scene: PosterScene,
  swatch: PosterSwatch,
  index: number,
  rect: Rect,
  palette: string[],
  unit: number
): void {
  const { config } = scene

  ctx.save()
  ctx.globalAlpha = config.opacity
  pathBand(ctx, rect, config.radius * unit)
  ctx.fillStyle = swatch.hex
  ctx.fill()
  ctx.restore()

  const color = textToneFor(swatch.hex, config, palette)

  ctx.save()
  // Nothing a band draws may spill onto its neighbours.
  pathBand(ctx, rect, config.radius * unit)
  ctx.clip()

  const inset = Math.min(unit * 3.4, Math.min(rect.w, rect.h) * 0.16)
  const box: Rect = {
    x: rect.x + inset,
    y: rect.y + inset,
    w: rect.w - inset * 2,
    h: rect.h - inset * 2
  }

  const shape = swatch.icon === NO_ICON ? null : posterIconShape(swatch.icon)
  const iconSize = Math.min(config.iconSize * unit, Math.min(rect.w, rect.h) * 0.6)

  if (shape) {
    if (config.orientation === 'vertical') {
      // The glyph takes the end of the band that the text is not using.
      const onLeft = config.textAlign === 'right'
      const x = onLeft ? box.x : box.x + box.w - iconSize
      drawIcon(ctx, shape, x, rect.y + (rect.h - iconSize) / 2, iconSize, color)
      box.x += onLeft ? iconSize + inset : 0
      box.w -= iconSize + inset
    } else {
      drawIcon(ctx, shape, rect.x + (rect.w - iconSize) / 2, box.y, iconSize, color)
      box.y += iconSize + inset
      box.h -= iconSize + inset
    }
  }

  if (box.w > 0 && box.h > 0) {
    const text = bandText(ctx, scene, swatch, index, box, color, unit)
    const slack = Math.max(0, box.h - text.height)
    const offset =
      config.textPosition === 'center' ? slack / 2 : config.textPosition === 'end' ? slack : 0
    text.draw(box.y + offset)
  }

  ctx.restore()
}

function drawTitle(ctx: CanvasRenderingContext2D, config: PosterConfig, unit: number): void {
  if (!config.showTitle || !config.title.trim()) return

  const family = FONT_BY_ID[config.fontId]?.stack ?? FONT_BY_ID.system.stack
  const pad = config.padding * unit
  const box = { x: pad, w: config.width - pad * 2 }
  const size = fitSize(ctx, config.title, 600, config.titleSize * unit, family, box.w)

  setTracking(ctx, 0)
  ctx.textBaseline = 'top'
  ctx.textAlign = config.textAlign
  ctx.font = fontString(600, size, family)
  ctx.fillStyle = pageToneFor(config)
  ctx.fillText(config.title, anchorFor(config.textAlign, box), pad + config.titleSize * unit * 0.25)
}

/**
 * Draws the whole poster in its own pixel coordinates. Callers scale the
 * context first when they want it smaller — the preview does exactly that.
 */
export function drawPoster(ctx: CanvasRenderingContext2D, scene: PosterScene): void {
  const { config, swatches } = scene
  const unit = Math.min(config.width, config.height) / 100

  ctx.save()
  ctx.clearRect(0, 0, config.width, config.height)
  fillPage(ctx, scene, unit)
  drawTitle(ctx, config, unit)

  const palette = swatches.map((swatch) => swatch.hex)
  const rects = bandRects(config, swatches.length)
  rects.forEach((rect, index) => {
    drawBand(ctx, scene, swatches[index], index, rect, palette, unit)
  })

  ctx.restore()
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

/** Decodes a `data:` URL into an image the renderer can draw. */
export function loadPosterImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The picture could not be decoded.'))
    image.src = source
  })
}

/**
 * Renders at full resolution on an off-screen canvas and encodes the result.
 * Returns the raw bytes, which the main process writes wherever the user says.
 */
export async function renderPosterBytes(scene: PosterScene): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = scene.config.width
  canvas.height = scene.config.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This machine has no 2D canvas to render on.')

  drawPoster(ctx, scene)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, `image/${scene.config.format}`, JPEG_QUALITY)
  })
  if (!blob) throw new Error('The poster could not be encoded.')

  return new Uint8Array(await blob.arrayBuffer())
}

const EXTENSION: Record<ImageFormat, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' }

export function posterFileName(name: string, format: ImageFormat): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'poster'
  return `${slug}.${EXTENSION[format]}`
}
