import { useEffect, useState } from 'react'
import { Cancel01Icon, FolderOpenIcon, Refresh01Icon } from 'hugeicons-react'
import { AppMark } from './AppMark'
import { IconButton } from '../ui/Button'
import { Button } from '../ui/Button'
import './AboutDialog.css'

interface AboutDialogProps {
  open: boolean
  onClose(): void
}

const APP_VERSION = __APP_VERSION__

/**
 * About panel that replays the boot splash.
 *
 * The animation is keyed by a `replay` counter: bumping it remounts the stage,
 * which restarts every CSS animation inside it from zero — the same sequence
 * the real splash window plays at launch.
 */
export function AboutDialog({ open, onClose }: AboutDialogProps): React.JSX.Element | null {
  const [replay, setReplay] = useState(0)
  const [dataPath, setDataPath] = useState('')

  useEffect(() => {
    if (!open) return undefined
    // Every opening is a fresh performance.
    setReplay((value) => value + 1)
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    window.api?.library
      .path()
      .then(setDataPath)
      .catch(() => setDataPath(''))
  }, [open])

  if (!open) return null

  return (
    <div className="about" onMouseDown={onClose}>
      <div
        className="about__panel"
        role="dialog"
        aria-modal="true"
        aria-label="About Color Finder"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="about__close">
          <IconButton label="Close" size="sm" onClick={onClose}>
            <Cancel01Icon size={16} />
          </IconButton>
        </div>

        <div className="about__stage" key={replay}>
          <div className="about__mark">
            <AppMark size={84} animated />
          </div>
          <h1 className="about__title display">Color Finder</h1>
          <p className="about__tagline">Pick &middot; Mix &middot; Keep</p>
        </div>

        <dl className="about__facts">
          <div>
            <dt>Version</dt>
            <dd className="mono">{APP_VERSION}</dd>
          </div>
          <div>
            <dt>Made by</dt>
            <dd>hexalo</dd>
          </div>
          <div>
            <dt>Colour maths</dt>
            <dd>culori &middot; OKLCH</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>Quicksand &amp; Playwrite</dd>
          </div>
          <div>
            <dt>Icons</dt>
            <dd>Hugeicons (free set)</dd>
          </div>
        </dl>

        {dataPath ? (
          <div className="about__data">
            <code className="mono">{dataPath}</code>
          </div>
        ) : null}

        <div className="about__actions">
          <Button
            size="sm"
            icon={<Refresh01Icon size={15} />}
            onClick={() => setReplay((value) => value + 1)}
          >
            Replay
          </Button>
          {window.api ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<FolderOpenIcon size={15} />}
              onClick={() => void window.api.library.revealInFolder()}
            >
              Show data folder
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
