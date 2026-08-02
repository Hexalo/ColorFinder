import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import './Disclosure.css'

interface DisclosureProps {
  title: string
  /** Small count/badge shown next to the title. */
  badge?: ReactNode
  /** Glyph shown before the title, so collapsed groups stay scannable. */
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * Animated collapsible section.
 *
 * The open/close animation uses `grid-template-rows: 0fr -> 1fr` (see
 * animations.css) so it eases to the content's natural height without
 * measuring anything in JavaScript.
 */
export function Disclosure({
  title,
  badge,
  icon,
  defaultOpen = false,
  children
}: DisclosureProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <section className={`disclosure ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="disclosure__trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <svg className="disclosure__chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M6 4l4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {icon ? (
          <span className="disclosure__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="disclosure__title">{title}</span>
        {badge != null ? <span className="disclosure__badge">{badge}</span> : null}
      </button>

      <div id={id} className={`disclosure__content ${open ? 'is-open' : ''}`}>
        <div className="disclosure__inner">
          <div className="disclosure__body">{children}</div>
        </div>
      </div>
    </section>
  )
}
