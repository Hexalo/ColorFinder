import type { ReactNode } from 'react'
import './Page.css'

interface PageProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Common page chrome: draggable header strip, title, actions, scroll body.
 *
 * There is deliberately no description slot — a paragraph next to the actions
 * reflows badly at every window width, and the pages explain themselves.
 */
export function Page({ title, actions, children }: PageProps): React.JSX.Element {
  return (
    <div className="page">
      <header className="page__head">
        <h1 className="page__title display">{title}</h1>
        {actions ? <div className="page__actions">{actions}</div> : null}
      </header>
      <div className="page__body">{children}</div>
    </div>
  )
}

interface SectionProps {
  title?: string
  hint?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({
  title,
  hint,
  actions,
  children,
  className = ''
}: SectionProps): React.JSX.Element {
  return (
    <section className={`section ${className}`}>
      {title || actions ? (
        <div className="section__head">
          <div>
            {title ? <h2 className="section__title">{title}</h2> : null}
            {hint ? <p className="section__hint">{hint}</p> : null}
          </div>
          {actions ? <div className="section__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="empty">
      {icon ? <div className="empty__icon">{icon}</div> : null}
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__description">{description}</p> : null}
      {action}
    </div>
  )
}
