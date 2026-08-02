import { useCallback, useState } from 'react'
import { toast } from '../store/toastStore'

/**
 * Wraps the screen colour picker. The heavy lifting happens in the main
 * process; here we only track the in-flight state and turn a blocked
 * screen-capture permission into something actionable for the user.
 */
export function useEyedropper(onPick: (hex: string) => void): {
  picking: boolean
  pick: () => Promise<void>
} {
  const [picking, setPicking] = useState(false)

  const pick = useCallback(async () => {
    if (picking) return
    setPicking(true)
    try {
      const { hex } = await window.api.picker.pickScreenColor()
      if (hex) onPick(hex)
    } catch (error) {
      console.error('[eyedropper] failed', error)
      if (window.api.system.platform === 'darwin') {
        // macOS only applies a freshly granted Screen Recording permission
        // once the app restarts, so say so rather than letting the user retry.
        toast.error('Allow Screen Recording in System Settings, then restart Color Finder.')
        void window.api.system.openScreenCaptureSettings()
      } else {
        toast.error('The screen could not be captured.')
      }
    } finally {
      setPicking(false)
    }
  }, [onPick, picking])

  return { picking, pick }
}
