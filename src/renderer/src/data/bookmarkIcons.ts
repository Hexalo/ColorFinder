import {
  AnchorIcon,
  Bookmark02Icon,
  Briefcase01Icon,
  BulbIcon,
  Camera01Icon,
  Cards01Icon,
  ChartRingIcon,
  Coffee01Icon,
  ColorsIcon,
  ComputerIcon,
  Diamond01Icon,
  DropletIcon,
  FavouriteIcon,
  Fire02Icon,
  FlowerIcon,
  Folder01Icon,
  GameIcon,
  GlobeIcon,
  Home01Icon,
  Layers01Icon,
  MapsIcon,
  MoonEclipseIcon,
  Moon02Icon,
  MountainIcon,
  MusicNote01Icon,
  PackageIcon,
  PaintBoardIcon,
  PaintBrush02Icon,
  PenTool01Icon,
  RainbowIcon,
  RocketIcon,
  ShoppingBag01Icon,
  SnowIcon,
  SparklesIcon,
  StarIcon,
  Sun03Icon,
  Tag01Icon,
  Tree01Icon,
  Wallet01Icon,
  WorkflowSquare01Icon
} from 'hugeicons-react'
import type { ComponentType } from 'react'

export type IconComponent = ComponentType<{
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}>

export interface BookmarkIconDef {
  id: string
  label: string
  icon: IconComponent
}

/**
 * Curated glyphs a bookmark can wear. Ids are persisted in `library.json`, so
 * only ever append here — renaming an id would orphan existing bookmarks.
 */
export const BOOKMARK_ICONS: BookmarkIconDef[] = [
  { id: 'folder', label: 'Folder', icon: Folder01Icon },
  { id: 'bookmark', label: 'Bookmark', icon: Bookmark02Icon },
  { id: 'star', label: 'Star', icon: StarIcon },
  { id: 'heart', label: 'Heart', icon: FavouriteIcon },
  { id: 'sparkles', label: 'Sparkles', icon: SparklesIcon },
  { id: 'palette', label: 'Palette', icon: ColorsIcon },
  { id: 'brush', label: 'Brush', icon: PaintBrush02Icon },
  { id: 'droplet', label: 'Droplet', icon: DropletIcon },
  { id: 'fire', label: 'Fire', icon: Fire02Icon },
  { id: 'sun', label: 'Sun', icon: Sun03Icon },
  { id: 'moon', label: 'Moon', icon: Moon02Icon },
  { id: 'flower', label: 'Flower', icon: FlowerIcon },
  { id: 'coffee', label: 'Coffee', icon: Coffee01Icon },
  { id: 'camera', label: 'Camera', icon: Camera01Icon },
  { id: 'diamond', label: 'Diamond', icon: Diamond01Icon },
  { id: 'rocket', label: 'Rocket', icon: RocketIcon },
  { id: 'briefcase', label: 'Work', icon: Briefcase01Icon },
  { id: 'home', label: 'Home', icon: Home01Icon },
  { id: 'globe', label: 'Globe', icon: GlobeIcon },
  { id: 'tag', label: 'Tag', icon: Tag01Icon },
  { id: 'layers', label: 'Layers', icon: Layers01Icon },
  { id: 'package', label: 'Package', icon: PackageIcon },
  { id: 'rainbow', label: 'Rainbow', icon: RainbowIcon },
  { id: 'board', label: 'Paint board', icon: PaintBoardIcon },
  { id: 'pen', label: 'Pen tool', icon: PenTool01Icon },
  { id: 'wheel', label: 'Colour wheel', icon: ChartRingIcon },
  { id: 'bulb', label: 'Idea', icon: BulbIcon },
  { id: 'cards', label: 'Cards', icon: Cards01Icon },
  { id: 'workflow', label: 'Workflow', icon: WorkflowSquare01Icon },
  { id: 'computer', label: 'Screen', icon: ComputerIcon },
  { id: 'game', label: 'Game', icon: GameIcon },
  { id: 'music', label: 'Music', icon: MusicNote01Icon },
  { id: 'tree', label: 'Tree', icon: Tree01Icon },
  { id: 'mountain', label: 'Mountain', icon: MountainIcon },
  { id: 'snow', label: 'Snow', icon: SnowIcon },
  { id: 'eclipse', label: 'Eclipse', icon: MoonEclipseIcon },
  { id: 'anchor', label: 'Anchor', icon: AnchorIcon },
  { id: 'map', label: 'Map', icon: MapsIcon },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag01Icon },
  { id: 'wallet', label: 'Wallet', icon: Wallet01Icon }
]

export const DEFAULT_BOOKMARK_ICON = 'folder'

const BY_ID = new Map(BOOKMARK_ICONS.map((definition) => [definition.id, definition]))

/** Always returns something drawable, even for an unknown or missing id. */
export const bookmarkIcon = (id: string | undefined): IconComponent =>
  (id ? BY_ID.get(id)?.icon : undefined) ?? Folder01Icon
