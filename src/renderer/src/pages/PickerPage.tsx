import {
  Cancel01Icon,
  CircleIcon,
  Delete02Icon,
  GridIcon,
  SlidersHorizontalIcon
} from 'hugeicons-react'
import { ChannelSliders } from '../components/color/ChannelSliders'
import { ColorPreview } from '../components/color/ColorPreview'
import { ColorSquare } from '../components/color/ColorSquare'
import { ColorWheel } from '../components/color/ColorWheel'
import { Page, Section } from '../components/layout/Page'
import { IconButton } from '../components/ui/Button'
import { Segmented } from '../components/ui/Field'
import { COLOR_SPACES, SPACE_BY_ID } from '../data/colorSpaces'
import { useTab } from '../hooks/useTab'
import { readableTextOn } from '../services/color.service'
import { nameColor } from '../services/naming.service'
import { useColorStore } from '../store/colorStore'
import { openCopyPanel } from '../store/copyPanelStore'
import type { SpaceId } from '../types'
import './PickerPage.css'

type PickerMode = 'wheel' | 'square' | 'sliders'

const MODE_OPTIONS = [
  { value: 'wheel' as const, label: 'Wheel', icon: <CircleIcon size={15} /> },
  { value: 'square' as const, label: 'Square', icon: <GridIcon size={15} /> },
  { value: 'sliders' as const, label: 'Sliders', icon: <SlidersHorizontalIcon size={15} /> }
]

const SPACE_OPTIONS = COLOR_SPACES.map((space) => ({ value: space.id, label: space.label }))

export function PickerPage(): React.JSX.Element {
  const { hex, hsv, recent, setHex, setHsv, remember, forget, clearRecent } = useColorStore()
  const [mode, setMode] = useTab<PickerMode>('pickerMode', 'wheel')
  const [spaceId, setSpaceId] = useTab<SpaceId>('pickerSpace', 'oklch')

  const space = SPACE_BY_ID[spaceId]

  /** Every commit-worthy change also lands in the recent strip. */
  const applyHex = (next: string): void => {
    setHex(next)
    remember(next)
  }

  return (
    <Page
      title="Picker"
    >
      <ColorPreview hex={hex} onChange={applyHex} />

      <div className="picker__grid">
        <Section
          title="Choose"
          actions={
            <Segmented
              ariaLabel="Picker style"
              size="sm"
              value={mode}
              options={MODE_OPTIONS}
              onChange={setMode}
            />
          }
        >
          <div className="picker__stage card">
            {mode === 'wheel' ? <ColorWheel hsv={hsv} onChange={setHsv} /> : null}
            {mode === 'square' ? <ColorSquare hsv={hsv} onChange={setHsv} /> : null}
            {mode === 'sliders' ? (
              <div className="picker__sliders">
                <Segmented
                  ariaLabel="Colour space"
                  size="sm"
                  value={spaceId}
                  options={SPACE_OPTIONS}
                  onChange={setSpaceId}
                />
                <ChannelSliders space={space} hex={hex} hueHint={hsv.h} onChange={setHex} />
              </div>
            ) : null}
          </div>
        </Section>

        {/*
          Live read-out of every space. This is feedback while dragging, not a
          copy surface — copying happens in the panel behind the copy button.
        */}
        <Section title="Values">
          <div className="picker__spaces card">
            {COLOR_SPACES.map((definition) => (
              <div className="picker__space" key={definition.id}>
                <span className="picker__space-label">{definition.label}</span>
                <span className="picker__space-value mono">
                  {definition.format(definition.toValues(hex, hsv.h))}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {recent.length > 0 ? (
        <Section
          title="Recent"
          actions={
            <IconButton label="Clear recent colours" size="sm" onClick={clearRecent}>
              <Delete02Icon size={15} />
            </IconButton>
          }
        >
          <div className="picker__recent">
            {recent.map((item) => (
              <span className="picker__recent-slot" key={item}>
                <button
                  type="button"
                  className="picker__recent-chip"
                  style={{ background: item, color: readableTextOn(item) }}
                  onClick={() => setHex(item)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    openCopyPanel({ kind: 'color', hex: item })
                  }}
                  title={`${nameColor(item)} — click to use, right-click to copy`}
                  aria-label={`Use ${nameColor(item)}`}
                />
                <button
                  type="button"
                  className="picker__recent-remove"
                  onClick={() => forget(item)}
                  aria-label={`Remove ${nameColor(item)} from recent`}
                  title="Remove from recent"
                >
                  <Cancel01Icon size={10} strokeWidth={2.6} />
                </button>
              </span>
            ))}
          </div>
        </Section>
      ) : null}
    </Page>
  )
}
