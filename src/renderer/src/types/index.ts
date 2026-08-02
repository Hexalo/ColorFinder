export type {
  PosterAlign,
  PosterBackgroundMode,
  PosterConfig,
  PosterFieldDef,
  PosterFieldId,
  PosterImageFit,
  PosterInfoLayout,
  PosterOrientation,
  PosterRatio,
  PosterSwatch,
  PosterTemplate,
  PosterTextAlign,
  PosterTextPosition,
  PosterTextTone
} from './poster'

export type {
  Bookmark,
  ColorFinderApi,
  Hex,
  ImageFormat,
  Library,
  Palette,
  PaletteSource,
  SavedColor,
  ScreenPickResult,
  Settings,
  Swatch,
  TabState,
  ThemeMode
} from '../../../shared/types'

/** Colour spaces exposed by the channel-slider panel. */
export type SpaceId =
  | 'rgb'
  | 'srgb'
  | 'p3'
  | 'hsv'
  | 'hsl'
  | 'cmyk'
  | 'lab'
  | 'lch'
  | 'oklch'

export interface ChannelDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  decimals: number
  unit?: string
}

export interface ColorSpaceDef {
  id: SpaceId
  label: string
  /** Short note shown under the sliders. */
  hint: string
  channels: ChannelDef[]
  /** Hex -> channel values in display units. */
  toValues(hex: string, hueHint?: number): number[]
  /** Channel values -> hex, gamut-mapped into sRGB. */
  toHex(values: number[]): string
  /** Technical string for this space, e.g. `oklch(0.63 0.258 29.23)`. */
  format(values: number[]): string
}

export type HarmonyId =
  | 'complementary'
  | 'split-complement'
  | 'analogous'
  | 'monochromatic'
  | 'triadic'
  | 'tetradic'
  | 'unlocked'

export interface HarmonyDef {
  id: HarmonyId
  label: string
  description: string
  /** How many swatches the harmony produces, base colour included. */
  count: number
}

/** HSV is the interaction model for the wheel / square widgets. */
export interface Hsv {
  h: number
  s: number
  v: number
}

/**
 * Hue, saturation and lightness as the harmony sliders drive them: OKLCH hue
 * and lightness, with saturation expressed as a fraction of the chroma that
 * hue and lightness can actually hold in sRGB.
 *
 * The point of the third field being relative is independence — moving one of
 * these three leaves the other two exactly where they were, which raw OKLCH
 * chroma does not manage.
 */
export interface Okhsl {
  hue: number
  saturation: number
  lightness: number
}

export interface CodeFormatDef {
  id: string
  label: string
  group: 'Web' | 'CSS' | 'Mobile' | 'Code'
  format(hex: string): string
}

export interface ToastMessage {
  id: string
  text: string
  tone: 'info' | 'success' | 'error'
}
