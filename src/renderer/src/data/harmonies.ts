import {
  ArrowDataTransferHorizontalIcon,
  BlendIcon,
  ChartRingIcon,
  Hexagon01Icon,
  Layers02Icon,
  ShuffleIcon,
  TriangleIcon
} from 'hugeicons-react'
import type { IconComponent } from './bookmarkIcons'
import type { HarmonyDef, HarmonyId } from '../types'

export const HARMONIES: (HarmonyDef & { icon: IconComponent })[] = [
  {
    id: 'complementary',
    label: 'Complementary',
    description: 'The base colour and its opposite. Maximum contrast, two colours.',
    count: 2,
    icon: ArrowDataTransferHorizontalIcon
  },
  {
    id: 'split-complement',
    label: 'Split complement',
    description: 'The base plus the two neighbours of its opposite. Softer than complementary.',
    count: 3,
    icon: BlendIcon
  },
  {
    id: 'analogous',
    label: 'Analogous',
    description: 'Neighbouring hues. Calm and cohesive.',
    count: 5,
    icon: ChartRingIcon
  },
  {
    id: 'monochromatic',
    label: 'Monochromatic',
    description: 'One hue, stepped through lightness. Great for UI scales.',
    count: 5,
    icon: Layers02Icon
  },
  {
    id: 'triadic',
    label: 'Triadic',
    description: 'Three hues evenly spaced around the wheel.',
    count: 3,
    icon: TriangleIcon
  },
  {
    id: 'tetradic',
    label: 'Tetradic',
    description: 'Two complementary pairs. Rich, needs a dominant colour.',
    count: 4,
    icon: Hexagon01Icon
  },
  {
    id: 'unlocked',
    label: 'Unlocked',
    description: 'No rule. Lock the swatches you like and reshuffle the rest.',
    count: 5,
    icon: ShuffleIcon
  }
]

export const HARMONY_BY_ID: Record<HarmonyId, HarmonyDef & { icon: IconComponent }> =
  Object.fromEntries(HARMONIES.map((harmony) => [harmony.id, harmony])) as Record<
    HarmonyId,
    HarmonyDef & { icon: IconComponent }
  >
