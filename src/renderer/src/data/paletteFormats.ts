import { rgbValues } from '../services/color.service'

/**
 * Copy targets that only make sense for a whole palette. Individual colours
 * are handled by `codeFormats.ts`.
 */
export interface PaletteFormatDef {
  id: string
  label: string
  group: 'Web' | 'CSS' | 'Mobile' | 'Code'
  format(colors: string[], name: string): string
}

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'palette'

/** `colour-1`, `colour-2`… derived from the palette name. */
const token = (name: string, index: number): string => `${slug(name)}-${index + 1}`

export const PALETTE_FORMATS: PaletteFormatDef[] = [
  {
    id: 'hex-list',
    label: 'Hex list',
    group: 'Web',
    format: (colors) => colors.map((hex) => hex.toUpperCase()).join(', ')
  },
  {
    id: 'hex-lines',
    label: 'Hex, one per line',
    group: 'Web',
    format: (colors) => colors.map((hex) => hex.toUpperCase()).join('\n')
  },
  {
    id: 'css-vars',
    label: 'CSS custom properties',
    group: 'CSS',
    format: (colors, name) =>
      `:root {\n${colors.map((hex, i) => `  --${token(name, i)}: ${hex};`).join('\n')}\n}`
  },
  {
    id: 'scss-vars',
    label: 'SCSS variables',
    group: 'CSS',
    format: (colors, name) => colors.map((hex, i) => `$${token(name, i)}: ${hex};`).join('\n')
  },
  {
    id: 'scss-map',
    label: 'SCSS map',
    group: 'CSS',
    format: (colors, name) =>
      `$${slug(name)}: (\n${colors.map((hex, i) => `  '${i + 1}': ${hex},`).join('\n')}\n);`
  },
  {
    id: 'tailwind',
    label: 'Tailwind theme',
    group: 'CSS',
    format: (colors, name) =>
      `@theme {\n${colors.map((hex, i) => `  --color-${token(name, i)}: ${hex};`).join('\n')}\n}`
  },
  {
    id: 'swift-array',
    label: 'SwiftUI array',
    group: 'Mobile',
    format: (colors) => {
      const entries = colors.map((hex) => {
        const [r, g, b] = rgbValues(hex)
        return `  Color(red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(3)}, blue: ${(b / 255).toFixed(3)})`
      })
      return `let palette: [Color] = [\n${entries.join(',\n')}\n]`
    }
  },
  {
    id: 'android-xml',
    label: 'Android colors.xml',
    group: 'Mobile',
    format: (colors, name) =>
      `<resources>\n${colors
        .map((hex, i) => `  <color name="${token(name, i).replace(/-/g, '_')}">${hex.toUpperCase()}</color>`)
        .join('\n')}\n</resources>`
  },
  {
    id: 'compose',
    label: 'Compose values',
    group: 'Mobile',
    format: (colors, name) =>
      colors
        .map(
          (hex, i) =>
            `val ${token(name, i).replace(/-(.)/g, (_, c: string) => c.toUpperCase())} = Color(0xFF${hex.slice(1).toUpperCase()})`
        )
        .join('\n')
  },
  {
    id: 'js-array',
    label: 'JavaScript array',
    group: 'Code',
    format: (colors) => `[${colors.map((hex) => `'${hex}'`).join(', ')}]`
  },
  {
    id: 'json',
    label: 'JSON',
    group: 'Code',
    format: (colors, name) => JSON.stringify({ name, colors }, null, 2)
  },
  {
    id: 'python-list',
    label: 'Python list',
    group: 'Code',
    format: (colors) => `[${colors.map((hex) => `"${hex}"`).join(', ')}]`
  }
]

export const PALETTE_FORMAT_GROUPS = ['Web', 'CSS', 'Mobile', 'Code'] as const
