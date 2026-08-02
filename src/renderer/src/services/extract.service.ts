import { lightnessOf, perceptualDistance, toHex } from './color.service'

/**
 * Extracts a palette from an image with median cut — the same family of
 * algorithm as ColorThief, implemented here so the app keeps one colour
 * pipeline and no extra dependency.
 */

/** Longest edge the image is downsampled to before analysis. */
const SAMPLE_EDGE = 220
/** Pixels closer than this in OKLab are treated as the same colour. */
const DEDUPE_DISTANCE = 0.045

type Pixel = [number, number, number]

export interface ExtractedColor {
  hex: string
  /** Share of the sampled pixels this colour represents, 0–1. */
  weight: number
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The image could not be decoded.'))
    image.src = src
  })
}

function samplePixels(image: HTMLImageElement): Pixel[] {
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas is unavailable.')
  context.drawImage(image, 0, 0, width, height)

  const { data } = context.getImageData(0, 0, width, height)
  const pixels: Pixel[] = []
  for (let i = 0; i < data.length; i += 4) {
    // Skip mostly transparent pixels; they would drag every bucket to black.
    if (data[i + 3] < 125) continue
    pixels.push([data[i], data[i + 1], data[i + 2]])
  }
  return pixels
}

/** Widest channel of a bucket, and how wide it is. */
function widestChannel(bucket: Pixel[]): { channel: 0 | 1 | 2; range: number } {
  const min: Pixel = [255, 255, 255]
  const max: Pixel = [0, 0, 0]
  for (const pixel of bucket) {
    for (let channel = 0; channel < 3; channel += 1) {
      if (pixel[channel] < min[channel]) min[channel] = pixel[channel]
      if (pixel[channel] > max[channel]) max[channel] = pixel[channel]
    }
  }
  const ranges = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  const channel = ranges.indexOf(Math.max(...ranges)) as 0 | 1 | 2
  return { channel, range: ranges[channel] }
}

function medianCut(pixels: Pixel[], targetBuckets: number): Pixel[][] {
  let buckets: Pixel[][] = [pixels]

  while (buckets.length < targetBuckets) {
    // Always split the bucket that still covers the widest colour range;
    // splitting anything else would not reduce the overall error as much.
    let bestIndex = -1
    let bestRange = 0
    let bestChannel: 0 | 1 | 2 = 0

    buckets.forEach((bucket, index) => {
      if (bucket.length < 2) return
      const { channel, range } = widestChannel(bucket)
      if (range > bestRange) {
        bestRange = range
        bestIndex = index
        bestChannel = channel
      }
    })

    if (bestIndex === -1) break

    const bucket = buckets[bestIndex]
    bucket.sort((a, b) => a[bestChannel] - b[bestChannel])
    const middle = Math.floor(bucket.length / 2)
    buckets = [
      ...buckets.slice(0, bestIndex),
      bucket.slice(0, middle),
      bucket.slice(middle),
      ...buckets.slice(bestIndex + 1)
    ]
  }

  return buckets.filter((bucket) => bucket.length > 0)
}

const averageOf = (bucket: Pixel[]): string => {
  const total = bucket.reduce(
    (sum, pixel) => [sum[0] + pixel[0], sum[1] + pixel[1], sum[2] + pixel[2]] as Pixel,
    [0, 0, 0] as Pixel
  )
  return toHex({
    mode: 'rgb',
    r: total[0] / bucket.length / 255,
    g: total[1] / bucket.length / 255,
    b: total[2] / bucket.length / 255
  })
}

/**
 * @param source  A `data:` URL or object URL for the image.
 * @param count   How many colours to return (the user picks this in the UI).
 */
export async function extractPalette(source: string, count: number): Promise<ExtractedColor[]> {
  const image = await loadImage(source)
  const pixels = samplePixels(image)
  if (pixels.length === 0) return []

  // Ask for extra buckets so we still hit `count` after deduplication.
  const buckets = medianCut(pixels, Math.min(count * 2, 64))

  const candidates = buckets
    .map((bucket) => ({ hex: averageOf(bucket), weight: bucket.length / pixels.length }))
    .sort((a, b) => b.weight - a.weight)

  const chosen: ExtractedColor[] = []
  for (const candidate of candidates) {
    if (chosen.length >= count) break
    const tooClose = chosen.some(
      (kept) => perceptualDistance(kept.hex, candidate.hex) < DEDUPE_DISTANCE
    )
    if (!tooClose) chosen.push(candidate)
  }

  // If dedup was aggressive on a flat image, top the list back up.
  for (const candidate of candidates) {
    if (chosen.length >= count) break
    if (!chosen.some((kept) => kept.hex === candidate.hex)) chosen.push(candidate)
  }

  return chosen.sort((a, b) => lightnessOf(b.hex) - lightnessOf(a.hex))
}

/** Reads a dropped or chosen `File` into a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })
}
