/**
 * Glyphs a poster band can wear, as raw path data in a 24×24 box.
 *
 * They are plain path strings rather than React components because the poster
 * is drawn on a canvas: the same string feeds a `Path2D` for the export and an
 * `<svg>` for the picker in the settings panel, so the two can never drift.
 * Paths are filled with the non-zero rule, so a hole has to be wound the other
 * way round — see `ring`.
 */

const round = (value: number): string => (Math.round(value * 100) / 100).toString()

/** Regular polygon, first point at the top. */
function polygon(points: number, radius: number, rotation = -90): string {
  const parts: string[] = []
  for (let i = 0; i < points; i += 1) {
    const angle = (((360 / points) * i + rotation) * Math.PI) / 180
    parts.push(
      `${i === 0 ? 'M' : 'L'}${round(12 + radius * Math.cos(angle))} ${round(
        12 + radius * Math.sin(angle)
      )}`
    )
  }
  return `${parts.join(' ')} Z`
}

/** Pointed star: alternates the outer and inner radius. */
function star(points: number, outer: number, inner: number, rotation = -90): string {
  const parts: string[] = []
  const steps = points * 2
  for (let i = 0; i < steps; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (((360 / steps) * i + rotation) * Math.PI) / 180
    parts.push(
      `${i === 0 ? 'M' : 'L'}${round(12 + radius * Math.cos(angle))} ${round(
        12 + radius * Math.sin(angle)
      )}`
    )
  }
  return `${parts.join(' ')} Z`
}

const circle = (cx: number, cy: number, r: number, clockwise = true): string => {
  const sweep = clockwise ? 1 : 0
  return `M${round(cx - r)} ${round(cy)} A${round(r)} ${round(r)} 0 1 ${sweep} ${round(
    cx + r
  )} ${round(cy)} A${round(r)} ${round(r)} 0 1 ${sweep} ${round(cx - r)} ${round(cy)} Z`
}

/** Disc plus eight tapered rays. */
function sun(): string {
  const parts = [circle(12, 12, 5.1)]
  for (let i = 0; i < 8; i += 1) {
    const angle = ((360 / 8) * i * Math.PI) / 180
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const point = (distance: number, offset: number): string =>
      `${round(12 + dx * distance - dy * offset)} ${round(12 + dy * distance + dx * offset)}`
    parts.push(
      `M${point(7.2, 1.2)} L${point(11.4, 0.8)} L${point(11.4, -0.8)} L${point(7.2, -1.2)} Z`
    )
  }
  return parts.join(' ')
}

/**
 * Six petals around a small heart. The petals only just touch — any more
 * overlap and the glyph reads as a blob rather than a flower.
 */
function flower(): string {
  const parts: string[] = []
  for (let i = 0; i < 6; i += 1) {
    const angle = ((360 / 6) * i * Math.PI) / 180
    parts.push(circle(12 + Math.cos(angle) * 6.7, 12 + Math.sin(angle) * 6.7, 3.9))
  }
  parts.push(circle(12, 12, 3.4))
  return parts.join(' ')
}

export interface PosterIconDef {
  id: string
  label: string
  path: string
}

/**
 * Ids are stored on the swatches, so only ever append here.
 */
export const POSTER_ICONS: PosterIconDef[] = [
  {
    id: 'sparkle',
    label: 'Sparkle',
    path: 'M12 1 C12.6 8.2 15.8 11.4 23 12 C15.8 12.6 12.6 15.8 12 23 C11.4 15.8 8.2 12.6 1 12 C8.2 11.4 11.4 8.2 12 1 Z'
  },
  { id: 'star', label: 'Star', path: star(5, 11, 4.6) },
  { id: 'burst', label: 'Burst', path: star(8, 11, 3.6) },
  { id: 'circle', label: 'Circle', path: circle(12, 12, 10.5) },
  {
    id: 'ring',
    label: 'Ring',
    path: `${circle(12, 12, 10.5)} ${circle(12, 12, 5.6, false)}`
  },
  { id: 'square', label: 'Square', path: 'M2 2 H22 V22 H2 Z' },
  {
    id: 'rounded',
    label: 'Rounded square',
    path: 'M6.5 2 H17.5 A4.5 4.5 0 0 1 22 6.5 V17.5 A4.5 4.5 0 0 1 17.5 22 H6.5 A4.5 4.5 0 0 1 2 17.5 V6.5 A4.5 4.5 0 0 1 6.5 2 Z'
  },
  { id: 'diamond', label: 'Diamond', path: 'M12 1 L23 12 L12 23 L1 12 Z' },
  { id: 'triangle', label: 'Triangle', path: 'M12 2 L22.5 21 L1.5 21 Z' },
  { id: 'hexagon', label: 'Hexagon', path: polygon(6, 11) },
  { id: 'pentagon', label: 'Pentagon', path: polygon(5, 11) },
  {
    id: 'droplet',
    label: 'Droplet',
    path: 'M12 1.4 C12 1.4 20 9.6 20 15 A8 8 0 0 1 4 15 C4 9.6 12 1.4 12 1.4 Z'
  },
  {
    id: 'heart',
    label: 'Heart',
    path: 'M12 22 C12 22 1.8 15.6 1.8 9 A5.6 5.6 0 0 1 12 6 A5.6 5.6 0 0 1 22.2 9 C22.2 15.6 12 22 12 22 Z'
  },
  {
    id: 'leaf',
    label: 'Leaf',
    path: 'M21.5 2.5 C21.5 13.6 14.6 21.5 3 21.5 C3 10.4 9.9 2.5 21.5 2.5 Z'
  },
  {
    id: 'moon',
    label: 'Moon',
    path: 'M20.5 16.6 A10 10 0 1 1 9.6 2.3 A8.2 8.2 0 0 0 20.5 16.6 Z'
  },
  { id: 'sun', label: 'Sun', path: sun() },
  { id: 'flower', label: 'Flower', path: flower() },
  {
    id: 'bolt',
    label: 'Bolt',
    path: 'M13.8 1.5 L4.5 13.8 H10.4 L9.6 22.5 L19.5 9.6 H13 Z'
  },
  {
    id: 'cross',
    label: 'Cross',
    path: 'M9.8 1.8 H14.2 V9.8 H22.2 V14.2 H14.2 V22.2 H9.8 V14.2 H1.8 V9.8 H9.8 Z'
  }
]

export const NO_ICON = 'none'

const BY_ID = new Map(POSTER_ICONS.map((definition) => [definition.id, definition]))

export const posterIconPath = (id: string): string | null => BY_ID.get(id)?.path ?? null

const cache = new Map<string, Path2D>()

/** Memoised `Path2D`, so a preview redraw does not re-parse every glyph. */
export function posterIconShape(id: string): Path2D | null {
  if (id === NO_ICON) return null
  const cached = cache.get(id)
  if (cached) return cached

  const path = posterIconPath(id)
  if (!path) return null

  const shape = new Path2D(path)
  cache.set(id, shape)
  return shape
}
