import { useEffect, useState } from 'react'
import { loadPosterImage } from '../services/poster.service'

/**
 * Decodes the poster's background picture once, so the preview can redraw on
 * every keystroke without going back through the decoder.
 */
export function usePosterImage(source: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!source) {
      setImage(null)
      return undefined
    }

    let cancelled = false
    void loadPosterImage(source)
      .then((loaded) => {
        if (!cancelled) setImage(loaded)
      })
      .catch((error: unknown) => {
        console.error('[poster] the picture could not be decoded', error)
        if (!cancelled) setImage(null)
      })

    return () => {
      cancelled = true
    }
  }, [source])

  return image
}
