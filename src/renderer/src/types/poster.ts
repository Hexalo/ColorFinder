/**
 * `PosterConfig` and its companion types live in `shared/types.ts` — a saved
 * poster is part of `library.json`, so the main process's migration code has
 * to know its shape too. This file only adds the renderer-only types that
 * never leave the UI: templates, ratio presets and the field catalogue (whose
 * `format` is a function, so it cannot be persisted).
 */
import type {
  PosterConfig,
  PosterFieldId
} from '../../../shared/types'

export type {
  PosterAlign,
  PosterBackgroundMode,
  PosterConfig,
  PosterFieldId,
  PosterImageFit,
  PosterInfoLayout,
  PosterOrientation,
  PosterSwatch,
  PosterTextAlign,
  PosterTextPosition,
  PosterTextTone,
  SavedPoster
} from '../../../shared/types'

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
