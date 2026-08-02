import { SPACE_BY_ID } from './colorSpaces'
import { rgbValues } from '../services/color.service'
import type { CodeFormatDef, SpaceId } from '../types'

const rgb = (hex: string): [number, number, number] => {
  const [r, g, b] = rgbValues(hex)
  return [Math.round(r), Math.round(g), Math.round(b)]
}

const argb = (hex: string): string => `0xFF${hex.slice(1).toUpperCase()}`

const float = (value: number): string => (value / 255).toFixed(3)

/** Renders a colour with a colour space's own canonical string form. */
const space =
  (id: SpaceId) =>
  (hex: string): string => {
    const definition = SPACE_BY_ID[id]
    return definition.format(definition.toValues(hex))
  }

/**
 * Copy targets offered next to every colour. Grouped so the list stays
 * readable; `id` values are persisted in settings as the default format.
 */
export const CODE_FORMATS: CodeFormatDef[] = [
  { id: 'hex', label: 'HEX', group: 'Web', format: (hex) => hex.toUpperCase() },
  {
    id: 'hex-lower',
    label: 'HEX (lowercase)',
    group: 'Web',
    format: (hex) => hex.toLowerCase()
  },
  { id: 'rgb', label: 'RGB', group: 'Web', format: space('rgb') },
  {
    id: 'rgb-legacy',
    label: 'RGB (comma syntax)',
    group: 'Web',
    format: (hex) => {
      const [r, g, b] = rgb(hex)
      return `rgb(${r}, ${g}, ${b})`
    }
  },
  { id: 'hsl', label: 'HSL', group: 'Web', format: space('hsl') },
  { id: 'oklch', label: 'OKLCH', group: 'Web', format: space('oklch') },
  { id: 'lch', label: 'LCH', group: 'Web', format: space('lch') },
  { id: 'lab', label: 'LAB', group: 'Web', format: space('lab') },
  { id: 'p3', label: 'Display P3', group: 'Web', format: space('p3') },
  { id: 'cmyk', label: 'CMYK', group: 'Web', format: space('cmyk') },

  {
    id: 'css-var',
    label: 'CSS custom property',
    group: 'CSS',
    format: (hex) => `--color: ${hex};`
  },
  { id: 'scss', label: 'SCSS variable', group: 'CSS', format: (hex) => `$color: ${hex};` },
  { id: 'less', label: 'Less variable', group: 'CSS', format: (hex) => `@color: ${hex};` },
  {
    id: 'tailwind',
    label: 'Tailwind theme entry',
    group: 'CSS',
    format: (hex) => `--color-brand: ${hex};`
  },

  {
    id: 'swiftui',
    label: 'SwiftUI',
    group: 'Mobile',
    format: (hex) => {
      const [r, g, b] = rgb(hex)
      return `Color(red: ${float(r)}, green: ${float(g)}, blue: ${float(b)})`
    }
  },
  {
    id: 'uicolor',
    label: 'UIKit / UIColor',
    group: 'Mobile',
    format: (hex) => {
      const [r, g, b] = rgb(hex)
      return `UIColor(red: ${float(r)}, green: ${float(g)}, blue: ${float(b)}, alpha: 1.0)`
    }
  },
  {
    id: 'compose',
    label: 'Jetpack Compose',
    group: 'Mobile',
    format: (hex) => `Color(${argb(hex)})`
  },
  {
    id: 'android-xml',
    label: 'Android XML',
    group: 'Mobile',
    format: (hex) => `<color name="brand">#${hex.slice(1).toUpperCase()}</color>`
  },
  {
    id: 'flutter',
    label: 'Flutter',
    group: 'Mobile',
    format: (hex) => `const Color(${argb(hex)})`
  },

  {
    id: 'js-object',
    label: 'JavaScript object',
    group: 'Code',
    format: (hex) => {
      const [r, g, b] = rgb(hex)
      return `{ r: ${r}, g: ${g}, b: ${b} }`
    }
  },
  {
    id: 'python-tuple',
    label: 'Python tuple',
    group: 'Code',
    format: (hex) => `(${rgb(hex).join(', ')})`
  },
  {
    id: 'int',
    label: 'Integer (0xRRGGBB)',
    group: 'Code',
    format: (hex) => `0x${hex.slice(1).toUpperCase()}`
  }
]

export const CODE_FORMAT_BY_ID: Record<string, CodeFormatDef> = Object.fromEntries(
  CODE_FORMATS.map((definition) => [definition.id, definition])
)

export const CODE_FORMAT_GROUPS = ['Web', 'CSS', 'Mobile', 'Code'] as const
