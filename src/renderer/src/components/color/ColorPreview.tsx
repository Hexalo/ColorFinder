import { ColorPickerIcon, Copy01Icon } from 'hugeicons-react'
import { useEyedropper } from '../../hooks/useEyedropper'
import { contrastRatio, readableTextOn } from '../../services/color.service'
import { openCopyPanel } from '../../store/copyPanelStore'
import { Button } from '../ui/Button'
import { HexField } from './HexField'
import './ColorPreview.css'

interface ColorPreviewProps {
  hex: string
  onChange(hex: string): void
}

/**
 * The big swatch at the top of the picker: current colour, editable hex field,
 * eyedropper, and the two contrast ratios that decide whether text on this
 * colour will actually be readable.
 */
export function ColorPreview({ hex, onChange }: ColorPreviewProps): React.JSX.Element {
  const { picking, pick } = useEyedropper(onChange)

  const onWhite = contrastRatio(hex, '#ffffff')
  const onBlack = contrastRatio(hex, '#000000')

  return (
    <div className="preview card">
      <button
        type="button"
        className="preview__swatch"
        style={{ background: hex, color: readableTextOn(hex) }}
        onClick={() => openCopyPanel({ kind: 'color', hex, label: 'Current colour' })}
        title="Open copy options"
      >
        <span className="preview__hex mono">{hex.toUpperCase()}</span>
      </button>

      <div className="preview__panel">
        <div className="preview__row">
          <HexField value={hex} onChange={onChange} className="preview__input" />
          <Button
            variant="secondary"
            aria-label="Copy options"
            title="Copy options"
            onClick={() => openCopyPanel({ kind: 'color', hex, label: 'Current colour' })}
            icon={<Copy01Icon size={17} />}
          />
        </div>

        <Button
          variant="primary"
          block
          disabled={picking}
          onClick={() => void pick()}
          icon={<ColorPickerIcon size={17} />}
        >
          {picking ? 'Pick a pixel…' : 'Pick from screen'}
        </Button>

        <p className="preview__note">
          Accepts hex, rgb(), hsl(), oklch(), lab() and CSS names.
        </p>

        <dl className="preview__contrast">
          <div>
            <dt>on white</dt>
            <dd className="mono">{onWhite.toFixed(2)}:1</dd>
          </div>
          <div>
            <dt>on black</dt>
            <dd className="mono">{onBlack.toFixed(2)}:1</dd>
          </div>
          <div>
            <dt>WCAG AA text</dt>
            <dd>{Math.max(onWhite, onBlack) >= 4.5 ? 'passes' : 'fails'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
