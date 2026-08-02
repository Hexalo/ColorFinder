import { cmykValues, hslValues, oklchValues, rgbValues, round } from '../services/color.service'
import type { PosterConfig, PosterFieldDef, PosterRatio, PosterTemplate } from '../types'

/**
 * Everything the poster page offers as a ready-made choice: page ratios,
 * export resolutions, typefaces, printable values and the templates.
 */

export const POSTER_RATIOS: PosterRatio[] = [
  { id: '2:3', label: '2:3 · portrait', value: 2 / 3 },
  { id: '4:5', label: '4:5 · portrait', value: 4 / 5 },
  { id: '3:4', label: '3:4 · portrait', value: 3 / 4 },
  { id: '9:16', label: '9:16 · story', value: 9 / 16 },
  { id: 'a4', label: 'A4 · portrait', value: 1 / Math.SQRT2 },
  { id: '1:1', label: '1:1 · square', value: 1 },
  { id: '4:3', label: '4:3 · landscape', value: 4 / 3 },
  { id: '3:2', label: '3:2 · landscape', value: 3 / 2 },
  { id: '16:9', label: '16:9 · landscape', value: 16 / 9 },
  { id: 'a4-landscape', label: 'A4 · landscape', value: Math.SQRT2 },
  { id: 'custom', label: 'Free', value: null }
]

export const RATIO_BY_ID: Record<string, PosterRatio> = Object.fromEntries(
  POSTER_RATIOS.map((ratio) => [ratio.id, ratio])
)

/** Long-edge presets. Anything else is typed straight into the size fields. */
export const POSTER_SIZES: { value: number; label: string }[] = [
  { value: 900, label: 'Draft · 900 px' },
  { value: 1200, label: 'Web · 1200 px' },
  { value: 1800, label: 'Large · 1800 px' },
  { value: 2400, label: 'Print · 2400 px' },
  { value: 3600, label: 'Poster · 3600 px' }
]

export const POSTER_MIN_SIZE = 200
export const POSTER_MAX_SIZE = 6000

export interface PosterFontDef {
  id: string
  label: string
  /** A stack, not a family: the poster has to survive a missing font. */
  stack: string
  weights: number[]
}

/**
 * Quicksand and Playwrite ship with the app; the rest are system faces, listed
 * with enough fallbacks that a poster still looks deliberate on a machine that
 * has none of them.
 */
export const POSTER_FONTS: PosterFontDef[] = [
  {
    id: 'serif',
    label: 'Serif · Georgia',
    stack: "Georgia, 'Times New Roman', Times, serif",
    weights: [400, 700]
  },
  {
    id: 'didone',
    label: 'Didone · Didot',
    stack: "Didot, 'Bodoni 72', 'Playfair Display', Georgia, serif",
    weights: [400, 700]
  },
  {
    id: 'grotesk',
    label: 'Grotesk · Helvetica',
    stack: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    weights: [300, 400, 500, 700, 900]
  },
  {
    id: 'geometric',
    label: 'Geometric · Futura',
    stack: "Futura, 'Avenir Next', 'Century Gothic', system-ui, sans-serif",
    weights: [400, 500, 600, 700]
  },
  {
    id: 'condensed',
    label: 'Condensed · Impact',
    stack: "Impact, Haettenschweiler, 'Arial Narrow', sans-serif",
    weights: [400]
  },
  {
    id: 'quicksand',
    label: 'Rounded · Quicksand',
    stack: "'Quicksand', ui-sans-serif, system-ui, sans-serif",
    weights: [300, 400, 500, 600, 700]
  },
  {
    id: 'playwrite',
    label: 'Handwritten · Playwrite',
    stack: "'Playwrite GB S', cursive",
    weights: [100, 200, 300, 400]
  },
  {
    id: 'mono',
    label: 'Mono · SF Mono',
    stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    weights: [400, 500, 600, 700]
  },
  {
    id: 'system',
    label: 'System sans',
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    weights: [300, 400, 500, 600, 700, 800]
  }
]

export const FONT_BY_ID: Record<string, PosterFontDef> = Object.fromEntries(
  POSTER_FONTS.map((font) => [font.id, font])
)

/**
 * Values are printed the way a colour card prints them — bare figures, no
 * `rgb(...)` wrapper — which is what the reference posters do.
 */
export const POSTER_FIELDS: PosterFieldDef[] = [
  {
    id: 'hex',
    label: 'HEX',
    format: (hex) => hex.replace('#', '').toUpperCase()
  },
  {
    id: 'rgb',
    label: 'RGB',
    format: (hex) => rgbValues(hex).join(', ')
  },
  {
    id: 'hsl',
    label: 'HSL',
    format: (hex) => {
      const [h, s, l] = hslValues(hex)
      return `${round(h)}°, ${round(s)}%, ${round(l)}%`
    }
  },
  {
    id: 'cmyk',
    label: 'CMYK',
    format: (hex) => cmykValues(hex).map((channel) => `${round(channel)}%`).join(', ')
  },
  {
    id: 'oklch',
    label: 'OKLCH',
    format: (hex) => {
      const [l, c, h] = oklchValues(hex)
      return `${round(l, 2)} ${round(c, 3)} ${round(h)}`
    }
  },
  {
    id: 'index',
    label: 'No.',
    format: (_hex, index) => String(index + 1).padStart(2, '0')
  }
]

export const FIELD_BY_ID: Record<string, PosterFieldDef> = Object.fromEntries(
  POSTER_FIELDS.map((field) => [field.id, field])
)

/** The look the page opens on: the classic colour spec sheet. */
export const createDefaultPoster = (): PosterConfig => ({
  ratio: '2:3',
  width: 1200,
  height: 1800,
  format: 'png',

  background: 'solid',
  backgroundColor: '#1c1a17',
  image: null,
  imageFit: 'cover',
  imageDim: 0.25,
  imageBlur: 0,

  orientation: 'vertical',
  gap: 0,
  padding: 0,
  radius: 0,
  opacity: 1,
  bandScale: 1,
  align: 'start',

  fontId: 'serif',
  nameSize: 5.4,
  nameWeight: 700,
  valueSize: 1.5,
  labelSize: 1.2,
  labelTracking: 0.14,
  uppercaseNames: false,
  textTone: 'palette',
  textColor: '#ffffff',
  textPosition: 'start',
  textAlign: 'left',

  showName: true,
  fields: ['hex', 'rgb', 'cmyk'],
  showLabels: true,
  infoLayout: 'columns',
  hashPrefix: false,

  showTitle: false,
  title: '',
  titleSize: 3.2,
  iconSize: 5
})

/**
 * A template is a look, not a document: the picture, the title, the export
 * format and the resolution belong to the poster the user is working on and
 * must survive a change of template. The spec sheet is the defaults minus
 * exactly those, and the rest only carry what they actually care about.
 */
const {
  image: _image,
  title: _title,
  showTitle: _showTitle,
  format: _format,
  width: _width,
  height: _height,
  ...SPEC_SHEET
} = createDefaultPoster()

export const POSTER_TEMPLATES: PosterTemplate[] = [
  {
    id: 'spec-sheet',
    label: 'Spec sheet',
    hint: 'Full-bleed bands with HEX, RGB and CMYK in columns.',
    icon: 'none',
    config: SPEC_SHEET
  },
  {
    id: 'city-lights',
    label: 'City lights',
    hint: 'Offset bands floating over your own picture.',
    icon: 'none',
    config: {
      ratio: '2:3',
      background: 'image',
      imageDim: 0.2,
      orientation: 'vertical',
      gap: 1.4,
      padding: 7,
      radius: 0,
      opacity: 0.97,
      bandScale: 0.66,
      align: 'cascade',
      fontId: 'didone',
      nameSize: 4.2,
      nameWeight: 400,
      valueSize: 1.5,
      textTone: 'auto',
      textPosition: 'center',
      textAlign: 'left',
      showName: true,
      fields: ['hex'],
      showLabels: false,
      infoLayout: 'stacked',
      hashPrefix: false
    }
  },
  {
    id: 'retro',
    label: 'Retro',
    hint: 'Wide-tracked labels and a glyph on every band.',
    icon: 'sparkle',
    config: {
      ratio: '2:3',
      background: 'solid',
      backgroundColor: '#3a2318',
      orientation: 'vertical',
      gap: 0,
      padding: 0,
      radius: 0,
      opacity: 1,
      bandScale: 1,
      align: 'start',
      fontId: 'serif',
      nameSize: 5.6,
      nameWeight: 700,
      valueSize: 1.4,
      labelSize: 1.4,
      labelTracking: 0.3,
      textTone: 'palette',
      textPosition: 'center',
      textAlign: 'left',
      showName: true,
      fields: ['hex', 'rgb', 'cmyk'],
      showLabels: true,
      infoLayout: 'columns',
      iconSize: 5.6
    }
  },
  {
    id: 'columns',
    label: 'Columns',
    hint: 'Colours side by side, names along the bottom.',
    icon: 'none',
    config: {
      ratio: '3:2',
      background: 'solid',
      backgroundColor: '#f4f0ea',
      orientation: 'horizontal',
      gap: 0,
      padding: 0,
      radius: 0,
      opacity: 1,
      bandScale: 1,
      align: 'start',
      fontId: 'grotesk',
      nameSize: 2.6,
      nameWeight: 500,
      valueSize: 1.7,
      textTone: 'auto',
      textPosition: 'end',
      textAlign: 'left',
      showName: true,
      fields: ['hex'],
      showLabels: false,
      infoLayout: 'stacked'
    }
  },
  {
    id: 'cards',
    label: 'Cards',
    hint: 'Rounded, spaced-out tiles on a plain page.',
    icon: 'none',
    config: {
      ratio: '4:5',
      background: 'solid',
      backgroundColor: '#f4f0ea',
      orientation: 'vertical',
      gap: 2.4,
      padding: 6,
      radius: 3.4,
      opacity: 1,
      bandScale: 1,
      align: 'center',
      fontId: 'quicksand',
      nameSize: 3.6,
      nameWeight: 600,
      valueSize: 1.6,
      labelSize: 1.2,
      labelTracking: 0.16,
      textTone: 'auto',
      textPosition: 'center',
      textAlign: 'left',
      showName: true,
      fields: ['hex', 'rgb'],
      showLabels: true,
      infoLayout: 'columns'
    }
  },
  {
    id: 'minimal',
    label: 'Minimal',
    hint: 'Just the colours, with the hex whispered underneath.',
    icon: 'none',
    config: {
      ratio: '1:1',
      background: 'solid',
      backgroundColor: '#faf7f2',
      orientation: 'horizontal',
      gap: 1.2,
      padding: 8,
      radius: 1.2,
      opacity: 1,
      bandScale: 1,
      align: 'center',
      fontId: 'mono',
      nameSize: 2,
      nameWeight: 500,
      valueSize: 1.4,
      textTone: 'auto',
      textPosition: 'end',
      textAlign: 'center',
      showName: false,
      fields: ['hex'],
      showLabels: false,
      infoLayout: 'stacked'
    }
  }
]

export const TEMPLATE_BY_ID: Record<string, PosterTemplate> = Object.fromEntries(
  POSTER_TEMPLATES.map((template) => [template.id, template])
)
