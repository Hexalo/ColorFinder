import { useCallback, useRef, useState } from 'react'
import { toast } from '../store/toastStore'

/**
 * Copy-to-clipboard with a short "copied" flag, so buttons can show a tick
 * without every caller wiring up its own timer.
 */
export function useClipboard(resetAfter = 1400): {
  copied: string | null
  copy: (text: string, label?: string) => Promise<void>
} {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number>(0)

  const copy = useCallback(
    async (text: string, label?: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(text)
        toast.success(label ? `${label} copied` : `Copied ${text}`)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(null), resetAfter)
      } catch (error) {
        console.error('[clipboard] copy failed', error)
        toast.error('Could not access the clipboard.')
      }
    },
    [resetAfter]
  )

  return { copied, copy }
}
