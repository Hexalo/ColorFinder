import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Cancel01Icon } from 'hugeicons-react'
import { IconButton } from './Button'
import './Modal.css'

interface ModalProps {
  open: boolean
  title: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer
}: ModalProps): React.JSX.Element | null {
  const panel = useRef<HTMLDivElement>(null)

  // Read `onClose` through a ref: parents pass a fresh arrow function on every
  // render, and a changing dependency here used to re-run the autofocus below
  // on every keystroke — which stole focus back to the close button.
  const latestClose = useRef(onClose)
  latestClose.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') latestClose.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Autofocus runs once per opening, and prefers a real field over the close
  // button — `querySelector` with a comma list returns whichever element comes
  // first in the DOM, which is the header button.
  useEffect(() => {
    if (!open) return
    const node = panel.current
    if (!node) return
    const field = node.querySelector<HTMLElement>(
      'input:not([type="hidden"]), textarea, select'
    )
    ;(field ?? node.querySelector<HTMLElement>('button'))?.focus()
    if (field instanceof HTMLInputElement) field.select()
  }, [open])

  if (!open) return null

  return (
    <div className="modal" onMouseDown={onClose}>
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panel}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__head">
          <h2>{title}</h2>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <Cancel01Icon size={16} />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__foot">{footer}</footer> : null}
      </div>
    </div>
  )
}
