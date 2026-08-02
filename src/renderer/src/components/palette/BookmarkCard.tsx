import type { ReactNode } from 'react'
import './BookmarkCard.css'

interface BookmarkCardProps {
  name: string
  count: number
  /** One row per palette — see `bookmarkPreview`. */
  rows: string[][]
  icon: ReactNode
  /** Tints the glyph; the plate behind it stays neutral so it always reads. */
  accent?: string
  active: boolean
  onClick(): void
  onDoubleClick?(): void
  title?: string
  tools?: ReactNode
}

/** Square tile for a bookmark (or a virtual view like "Everything"). */
export function BookmarkCard({
  name,
  count,
  rows,
  icon,
  accent,
  active,
  onClick,
  onDoubleClick,
  title,
  tools
}: BookmarkCardProps): React.JSX.Element {
  return (
    <div className="bookmark-tile">
      <button
        type="button"
        className={`bookmark-card ${active ? 'is-active' : ''}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        title={title}
      >
        <span className="bookmark-card__preview">
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <span className="bookmark-card__row" key={rowIndex}>
                {row.map((hex, index) => (
                  <span key={`${hex}-${index}`} style={{ background: hex }} />
                ))}
              </span>
            ))
          ) : (
            <span className="bookmark-card__row">
              <span style={{ background: 'var(--surface-sunken)' }} />
            </span>
          )}
        </span>

        {/*
          The glyph sits on its own plate. Blending it into the palette made it
          disappear on busy or light thumbnails. The bookmark's colour rings the
          plate rather than tinting the glyph, which would be unreadable
          whenever that colour is close to the surface behind it.
        */}
        <span
          className="bookmark-card__glyph"
          style={accent ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}33` } : undefined}
        >
          {icon}
        </span>

        <span className="bookmark-card__label">
          <span className="bookmark-card__name">{name}</span>
          <span className="bookmark-card__count">{count}</span>
        </span>
      </button>

      {tools ? <div className="bookmark-card__tools">{tools}</div> : null}
    </div>
  )
}
