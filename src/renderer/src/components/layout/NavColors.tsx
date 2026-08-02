import { useRef } from 'react'
import { Cancel01Icon } from 'hugeicons-react'
import { useRecentHeight } from '../../hooks/useRecentHeight'
import { readableTextOn } from '../../services/color.service'
import { nameColor } from '../../services/naming.service'
import { useColorStore } from '../../store/colorStore'
import { openCopyPanel } from '../../store/copyPanelStore'
import './NavColors.css'

interface NavColorsProps {
  collapsed: boolean
}

/** Swatches per row in the recent grid. */
const COLUMNS = 5

/**
 * The working colour and the recently used ones, parked at the foot of the
 * side nav so the colour you are on is visible from every page.
 *
 * Collapsed, only the current swatch survives — there is no room for a strip.
 */
export function NavColors({ collapsed }: NavColorsProps): React.JSX.Element {
  const hex = useColorStore((state) => state.hex)
  const recent = useColorStore((state) => state.recent)
  const setHex = useColorStore((state) => state.setHex)
  const forget = useColorStore((state) => state.forget)
  const clearRecent = useColorStore((state) => state.clearRecent)
  const strip = useRef<HTMLDivElement>(null)
  const { height, resizing, startResize, setHeight, reset } = useRecentHeight(strip)

  // No slicing: the strip scrolls instead of silently truncating.
  const others = recent.filter((item) => item !== hex)

  return (
    <div className={`nav-colors ${collapsed ? 'is-collapsed' : ''} ${resizing ? 'is-resizing' : ''}`}>
      <button
        type="button"
        className="nav-colors__current"
        style={{ background: hex, color: readableTextOn(hex) }}
        onClick={() => openCopyPanel({ kind: 'color', hex, label: 'Current colour' })}
        title={`${nameColor(hex)} — ${hex.toUpperCase()}`}
        aria-label={`Current colour ${nameColor(hex)}, open copy options`}
      >
        <span className="nav-colors__current-text">
          <span className="nav-colors__current-name">{nameColor(hex)}</span>
          <span className="nav-colors__current-hex mono">{hex.toUpperCase()}</span>
        </span>
      </button>

      {!collapsed && others.length > 0 ? (
        <>
          {/*
            Sits on the strip's top edge: drag up for more history, down to give
            the space back to the nav. Double-click returns it to the default.
          */}
          <div
            className="nav-colors__grip"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize the recent colours strip"
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={startResize}
            onDoubleClick={reset}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 40 : 12
              if (event.key === 'ArrowUp') setHeight(height + step)
              else if (event.key === 'ArrowDown') setHeight(height - step)
              else return
              event.preventDefault()
            }}
          />

          <div className="nav-colors__head">
            <span>
              Recent
              {/* Worth saying once the strip scrolls and the tail is out of sight. */}
              {others.length > 1 ? <span className="mono"> · {others.length}</span> : null}
            </span>
            <button
              type="button"
              className="nav-colors__clear"
              onClick={clearRecent}
              title="Clear all recent colours"
            >
              Clear all
            </button>
          </div>

          <div
            ref={strip}
            className="nav-colors__recent"
            // A ceiling rather than a height: a short history should not leave
            // a gap, it should just take the room it needs.
            style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, maxHeight: height }}
          >
          {others.map((item) => (
            <span className="nav-colors__slot" key={item}>
              <button
                type="button"
                className="nav-colors__chip"
                style={{ background: item }}
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
                className="nav-colors__remove"
                onClick={() => forget(item)}
                aria-label={`Remove ${nameColor(item)} from recent`}
                title="Remove from recent"
              >
                <Cancel01Icon size={9} strokeWidth={2.8} />
              </button>
            </span>
          ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
