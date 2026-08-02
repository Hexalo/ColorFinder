import type { ImageFormat } from '../../../shared/types'

/**
 * The poster model.
 *
 * Every measurement that has to survive a change of resolution is stored as a
 * percentage of the poster's *short edge*, never in pixels: the same config
 * then renders identically at 1080px and at 4000px, which is the whole point
 * of letting people pick a resolution.
 */

/** Bands stacked down the poster, or columns across it. */
export type PosterOrientation = 'vertical' | 'horizontal'

/** Where a band sits on the axis it does not fill, once it is narrower than the page. */
export type PosterAlign = 'start' | 'center' | 'end' | 'cascade'

/** Where the text block sits inside its band. */
export type PosterTextPosition = 'start' | 'center' | 'end'

export type PosterTextAlign = 'left' | 'center' | 'right'

/** How the value rows are arranged under the colour name. */
export type PosterInfoLayout = 'columns' | 'stacked' | 'inline'

/** A value that can be printed under a colour name. */
export type PosterFieldId = 'hex' | 'rgb' | 'hsl' | 'cmyk' | 'oklch' | 'index'

/**
 * `auto` picks black or white for contrast, `palette` borrows the most
 * readable colour from the palette itself — which is what the reference
 * posters do — and `custom` takes the user's colour as given.
 */
export type PosterTextTone = 'auto' | 'palette' | 'custom'

export type PosterBackgroundMode = 'solid' | 'gradient' | 'image'

export type PosterImageFit = 'cover' | 'contain' | 'stretch'

/** One rectangle of the poster: a colour, its printed name and its glyph. */
export interface PosterSwatch {
  hex: string
  name: string
  /** Id from `data/posterIcons.ts`, or `'none'`. */
  icon: string
}

export interface PosterConfig {
  /* Canvas ------------------------------------------------------------- */
  /** Id from `RATIOS`; `'custom'` means width and height move independently. */
  ratio: string
  width: number
  height: number
  format: ImageFormat

  /* Background --------------------------------------------------------- */
  background: PosterBackgroundMode
  backgroundColor: string
  /** `data:` URL of the picture behind the bands. */
  image: string | null
  imageFit: PosterImageFit
  /** Black veil over the picture, 0–1, so text stays readable. */
  imageDim: number
  /** Blur radius as a percentage of the short edge. */
  imageBlur: number

  /* Bands -------------------------------------------------------------- */
  orientation: PosterOrientation
  /** Space between bands, in % of the short edge. 0 glues them together. */
  gap: number
  /** Margin around the whole set of bands, in % of the short edge. */
  padding: number
  /** Corner radius, in % of the short edge. */
  radius: number
  opacity: number
  /** Share of the cross axis a band covers, 0.3–1. */
  bandScale: number
  align: PosterAlign

  /* Type --------------------------------------------------------------- */
  /** Id from `POSTER_FONTS`. */
  fontId: string
  /** All type sizes are a percentage of the short edge. */
  nameSize: number
  nameWeight: number
  valueSize: number
  labelSize: number
  /** Tracking of the small caps labels, in em. */
  labelTracking: number
  uppercaseNames: boolean
  textTone: PosterTextTone
  textColor: string
  textPosition: PosterTextPosition
  textAlign: PosterTextAlign

  /* Information -------------------------------------------------------- */
  showName: boolean
  fields: PosterFieldId[]
  showLabels: boolean
  infoLayout: PosterInfoLayout
  /** `#F6724B` rather than `F6724B`. */
  hashPrefix: boolean

  /* Extras ------------------------------------------------------------- */
  showTitle: boolean
  title: string
  titleSize: number
  iconSize: number
}

/** A named starting point offered on the page. */
export interface PosterTemplate {
  id: string
  label: string
  hint: string
  /** Applied over the current config; the colours themselves are untouched. */
  config: Partial<PosterConfig>
  /** Glyph given to every band when the template is applied. */
  icon: string
}

export interface PosterRatio {
  id: string
  label: string
  /** width / height. `null` for the free ratio. */
  value: number | null
}

export interface PosterFieldDef {
  id: PosterFieldId
  /** Caps label printed above the value, e.g. `RGB`. */
  label: string
  format(hex: string, index: number): string
}
