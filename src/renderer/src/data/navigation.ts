import {
  ColorPickerIcon,
  ColorsIcon,
  Image02Icon,
  LibraryIcon,
  Settings01Icon,
  ShuffleIcon
} from 'hugeicons-react'
import type { ComponentType } from 'react'

/**
 * The free Hugeicons set ships the rounded *stroke* variant only; the bulk
 * variant asked for in the brief is behind their paid plan, so we stay on the
 * free one and keep the rounded family the brief wanted.
 */
export type RouteId = 'picker' | 'harmonies' | 'image' | 'random' | 'library' | 'settings'

export interface NavItem {
  id: RouteId
  label: string
  hint: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'picker',
    label: 'Picker',
    hint: 'Pick from the screen and fine-tune in any colour space',
    icon: ColorPickerIcon
  },
  {
    id: 'harmonies',
    label: 'Harmonies',
    hint: 'Build a palette from one colour',
    icon: ColorsIcon
  },
  {
    id: 'image',
    label: 'From image',
    hint: 'Extract a palette out of a picture',
    icon: Image02Icon
  },
  {
    id: 'random',
    label: 'Random',
    hint: 'Generate colours and palettes',
    icon: ShuffleIcon
  },
  {
    id: 'library',
    label: 'Library',
    hint: 'Your saved palettes and bookmarks',
    icon: LibraryIcon
  },
  {
    id: 'settings',
    label: 'Settings',
    hint: 'Theme, defaults and data location',
    icon: Settings01Icon
  }
]
