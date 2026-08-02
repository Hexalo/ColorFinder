import { useEffect, useRef } from 'react'

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

/**
 * Binds a document-level shortcut. Ignored while the user is typing, so
 * pressing Space in a name field does not reshuffle their palette.
 */
export function useHotkey(key: string, handler: () => void, enabled = true): void {
  const latest = useRef(handler)
  latest.current = handler

  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== key.toLowerCase()) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      latest.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, enabled])
}
