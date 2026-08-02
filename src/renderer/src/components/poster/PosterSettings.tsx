import type { ReactNode } from 'react'
import {
  ArtboardIcon,
  ColorsIcon,
  ImageAdd01Icon,
  Layout01Icon,
  PaintBoardIcon,
  SparklesIcon,
  TextFontIcon,
  TextIndentIcon
} from 'hugeicons-react'
import { Disclosure } from '../ui/Disclosure'
import { Field, Range, Segmented, Select, TextInput, Toggle } from '../ui/Field'
import { Button, IconButton } from '../ui/Button'
import { HexField } from '../color/HexField'
import { NO_ICON, POSTER_ICONS } from '../../data/posterIcons'
import {
  FONT_BY_ID,
  POSTER_FIELDS,
  POSTER_FONTS,
  POSTER_MAX_SIZE,
  POSTER_MIN_SIZE,
  POSTER_RATIOS,
  POSTER_SIZES,
  POSTER_TEMPLATES
} from '../../data/posterPresets'
import { usePosterStore } from '../../store/posterStore'
import { toast } from '../../store/toastStore'
import type {
  PosterAlign,
  PosterBackgroundMode,
  PosterFieldId,
  PosterImageFit,
  PosterInfoLayout,
  PosterOrientation,
  PosterTextAlign,
  PosterTextPosition,
  PosterTextTone
} from '../../types'
import { PosterSwatches } from './PosterSwatches'
import './PosterPanel.css'

interface GroupProps {
  label: string
  hint?: string
  children: ReactNode
}

/**
 * `Field` for controls that are not a single input — a segmented control, a
 * grid of switches. It wears the same label, but not a `<label for>` pointing
 * at an element that does not exist.
 */
function Group({ label, hint, children }: GroupProps): React.JSX.Element {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}

interface PosterSettingsProps {
  source: string
  onSource(source: string): void
  template: string
  onTemplate(id: string): void
}

/** Right-hand pane: every knob the poster has, grouped and mostly collapsed. */
export function PosterSettings({
  source,
  onSource,
  template,
  onTemplate
}: PosterSettingsProps): React.JSX.Element {
  const config = usePosterStore((state) => state.config)
  const defaultIcon = usePosterStore((state) => state.defaultIcon)
  const store = usePosterStore()

  const font = FONT_BY_ID[config.fontId] ?? FONT_BY_ID.system

  const longEdge = Math.max(config.width, config.height)
  const sizeOptions = POSTER_SIZES.map((size) => ({
    value: String(size.value),
    label: size.label
  }))
  // A hand-typed width is a legitimate resolution; the select has to be able
  // to show it rather than snapping back to the nearest preset.
  if (!POSTER_SIZES.some((size) => size.value === longEdge)) {
    sizeOptions.push({ value: String(longEdge), label: `Custom · ${longEdge} px` })
  }

  const chooseImage = async (): Promise<void> => {
    try {
      const dataUrl = await window.api.files.openImage()
      if (dataUrl) store.update({ image: dataUrl, background: 'image' })
    } catch (error) {
      console.error('[poster] could not open the picture', error)
      toast.error('That picture could not be opened.')
    }
  }

  const toggleField = (id: PosterFieldId, on: boolean): void => {
    const fields = POSTER_FIELDS.map((field) => field.id).filter((field) =>
      field === id ? on : config.fields.includes(field)
    )
    store.update({ fields })
  }

  return (
    <div className="poster-panel">
      <div className="poster-panel__scroll">
        <section className="poster-panel__templates">
          <h2 className="poster-panel__heading">Templates</h2>
          <div className="poster-templates">
            {POSTER_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.hint}
                className={`poster-templates__item ${template === item.id ? 'is-active' : ''}`}
                onClick={() => onTemplate(item.id)}
              >
                <span className="poster-templates__label">{item.label}</span>
                <span className="poster-templates__hint">{item.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <Disclosure title="Colours" icon={<ColorsIcon size={16} />} defaultOpen>
          <PosterSwatches source={source} onSource={onSource} />
        </Disclosure>

        <Disclosure title="Page" icon={<ArtboardIcon size={16} />} defaultOpen>
          <div className="poster-panel__stack">
            <Field label="Ratio">
              {(id) => (
                <Select
                  id={id}
                  options={POSTER_RATIOS.map((ratio) => ({
                    value: ratio.id,
                    label: ratio.label
                  }))}
                  value={config.ratio}
                  onChange={(event) => store.setRatio(event.target.value)}
                />
              )}
            </Field>

            <Field label="Resolution" hint="The long edge; the other side follows the ratio.">
              {(id) => (
                <Select
                  id={id}
                  options={sizeOptions}
                  value={String(longEdge)}
                  onChange={(event) =>
                    store.setSide(
                      config.width >= config.height ? 'width' : 'height',
                      Number(event.target.value)
                    )
                  }
                />
              )}
            </Field>

            <div className="poster-panel__pair">
              <Field label="Width">
                {(id) => (
                  <TextInput
                    id={id}
                    type="number"
                    min={POSTER_MIN_SIZE}
                    max={POSTER_MAX_SIZE}
                    value={config.width}
                    onChange={(event) => store.setSide('width', Number(event.target.value))}
                  />
                )}
              </Field>
              <Field label="Height">
                {(id) => (
                  <TextInput
                    id={id}
                    type="number"
                    min={POSTER_MIN_SIZE}
                    max={POSTER_MAX_SIZE}
                    value={config.height}
                    onChange={(event) => store.setSide('height', Number(event.target.value))}
                  />
                )}
              </Field>
            </div>
          </div>
        </Disclosure>

        <Disclosure title="Layout" icon={<Layout01Icon size={16} />} defaultOpen>
          <div className="poster-panel__stack">
            <Group label="Direction">
              <Segmented<PosterOrientation>
                ariaLabel="Direction"
                size="sm"
                value={config.orientation}
                options={[
                  { value: 'vertical', label: 'Stacked' },
                  { value: 'horizontal', label: 'Side by side' }
                ]}
                onChange={(orientation) => store.update({ orientation })}
              />
            </Group>

            <Range
              label="Gap"
              min={0}
              max={8}
              step={0.2}
              suffix="%"
              value={config.gap}
              onChange={(gap) => store.update({ gap })}
            />
            <Range
              label="Margin"
              min={0}
              max={20}
              step={0.5}
              suffix="%"
              value={config.padding}
              onChange={(padding) => store.update({ padding })}
            />
            <Range
              label="Corner radius"
              min={0}
              max={12}
              step={0.2}
              suffix="%"
              value={config.radius}
              onChange={(radius) => store.update({ radius })}
            />
            <Range
              label="Opacity"
              min={20}
              max={100}
              suffix="%"
              value={Math.round(config.opacity * 100)}
              onChange={(value) => store.update({ opacity: value / 100 })}
            />
            <Range
              label="Band width"
              min={30}
              max={100}
              suffix="%"
              value={Math.round(config.bandScale * 100)}
              onChange={(value) => store.update({ bandScale: value / 100 })}
            />

            <Group
              label="Band position"
              hint="Only visible once the bands are narrower than the page."
            >
              <Segmented<PosterAlign>
                ariaLabel="Band position"
                size="sm"
                value={config.align}
                options={[
                  { value: 'start', label: 'Start' },
                  { value: 'center', label: 'Centre' },
                  { value: 'end', label: 'End' },
                  { value: 'cascade', label: 'Cascade' }
                ]}
                onChange={(align) => store.update({ align })}
              />
            </Group>
          </div>
        </Disclosure>

        <Disclosure title="Background" icon={<PaintBoardIcon size={16} />}>
          <div className="poster-panel__stack">
            <Segmented<PosterBackgroundMode>
              ariaLabel="Background"
              size="sm"
              value={config.background}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'gradient', label: 'Palette' },
                { value: 'image', label: 'Picture' }
              ]}
              onChange={(background) => store.update({ background })}
            />

            {config.background !== 'gradient' ? (
              <Group label="Page colour">
                <div className="poster-panel__row">
                  <label
                    className="poster-panel__swatch"
                    style={{ background: config.backgroundColor }}
                  >
                    <span className="sr-only">Page colour</span>
                    <input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(event) => store.update({ backgroundColor: event.target.value })}
                    />
                  </label>
                  <HexField
                    value={config.backgroundColor}
                    onChange={(backgroundColor) => store.update({ backgroundColor })}
                  />
                </div>
              </Group>
            ) : null}

            {config.background === 'image' ? (
              <>
                <div className="poster-panel__row">
                  <Button
                    size="sm"
                    icon={<ImageAdd01Icon size={15} />}
                    onClick={() => void chooseImage()}
                  >
                    {config.image ? 'Replace picture' : 'Choose a picture'}
                  </Button>
                  {!config.image ? (
                    <span className="poster-panel__note">…or drop one on the preview.</span>
                  ) : null}
                  {config.image ? (
                    <Button size="sm" variant="ghost" onClick={() => store.update({ image: null })}>
                      Remove
                    </Button>
                  ) : null}
                </div>

                <Group label="Fit">
                  <Segmented<PosterImageFit>
                    ariaLabel="Picture fit"
                    size="sm"
                    value={config.imageFit}
                    options={[
                      { value: 'cover', label: 'Cover' },
                      { value: 'contain', label: 'Contain' },
                      { value: 'stretch', label: 'Stretch' }
                    ]}
                    onChange={(imageFit) => store.update({ imageFit })}
                  />
                </Group>

                <Range
                  label="Dim"
                  min={0}
                  max={90}
                  suffix="%"
                  value={Math.round(config.imageDim * 100)}
                  onChange={(value) => store.update({ imageDim: value / 100 })}
                />
                <Range
                  label="Blur"
                  min={0}
                  max={6}
                  step={0.1}
                  suffix="%"
                  value={config.imageBlur}
                  onChange={(imageBlur) => store.update({ imageBlur })}
                />
              </>
            ) : null}
          </div>
        </Disclosure>

        <Disclosure title="Typography" icon={<TextFontIcon size={16} />}>
          <div className="poster-panel__stack">
            <Field label="Typeface">
              {(id) => (
                <Select
                  id={id}
                  options={POSTER_FONTS.map((item) => ({ value: item.id, label: item.label }))}
                  value={config.fontId}
                  onChange={(event) => {
                    const next = FONT_BY_ID[event.target.value]
                    store.update({
                      fontId: event.target.value,
                      // Weights are per family; keep the closest one available.
                      nameWeight: nearestWeight(next?.weights ?? [400], config.nameWeight)
                    })
                  }}
                />
              )}
            </Field>

            <div className="poster-panel__pair">
              <Field label="Name weight">
                {(id) => (
                  <Select
                    id={id}
                    options={font.weights.map((weight) => ({
                      value: String(weight),
                      label: String(weight)
                    }))}
                    value={String(config.nameWeight)}
                    onChange={(event) => store.update({ nameWeight: Number(event.target.value) })}
                  />
                )}
              </Field>
              <Group label="Text colour">
                <div className="poster-panel__row">
                  <label className="poster-panel__swatch" style={{ background: config.textColor }}>
                    <span className="sr-only">Text colour</span>
                    <input
                      type="color"
                      value={config.textColor}
                      disabled={config.textTone !== 'custom'}
                      onChange={(event) =>
                        store.update({ textColor: event.target.value, textTone: 'custom' })
                      }
                    />
                  </label>
                  <Segmented<PosterTextTone>
                    ariaLabel="Text colour source"
                    size="sm"
                    value={config.textTone}
                    options={[
                      { value: 'auto', label: 'Auto' },
                      { value: 'palette', label: 'Palette' },
                      { value: 'custom', label: 'Fixed' }
                    ]}
                    onChange={(textTone) => store.update({ textTone })}
                  />
                </div>
              </Group>
            </div>

            <Range
              label="Name size"
              min={1}
              max={12}
              step={0.1}
              suffix="%"
              value={config.nameSize}
              onChange={(nameSize) => store.update({ nameSize })}
            />
            <Range
              label="Value size"
              min={0.6}
              max={5}
              step={0.05}
              suffix="%"
              value={config.valueSize}
              onChange={(valueSize) => store.update({ valueSize })}
            />
            <Range
              label="Label size"
              min={0.5}
              max={4}
              step={0.05}
              suffix="%"
              value={config.labelSize}
              onChange={(labelSize) => store.update({ labelSize })}
            />
            <Range
              label="Label tracking"
              min={0}
              max={0.5}
              step={0.01}
              suffix="em"
              value={config.labelTracking}
              onChange={(labelTracking) => store.update({ labelTracking })}
            />

            <Toggle
              label="Names in capitals"
              checked={config.uppercaseNames}
              onChange={(uppercaseNames) => store.update({ uppercaseNames })}
            />

            <Group label="Text alignment">
              <Segmented<PosterTextAlign>
                ariaLabel="Text alignment"
                size="sm"
                value={config.textAlign}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Centre' },
                  { value: 'right', label: 'Right' }
                ]}
                onChange={(textAlign) => store.update({ textAlign })}
              />
            </Group>

            <Group label="Text position">
              <Segmented<PosterTextPosition>
                ariaLabel="Text position"
                size="sm"
                value={config.textPosition}
                options={[
                  { value: 'start', label: 'Start' },
                  { value: 'center', label: 'Middle' },
                  { value: 'end', label: 'End' }
                ]}
                onChange={(textPosition) => store.update({ textPosition })}
              />
            </Group>
          </div>
        </Disclosure>

        <Disclosure title="Information" icon={<TextIndentIcon size={16} />}>
          <div className="poster-panel__stack">
            <Toggle
              label="Colour name"
              checked={config.showName}
              onChange={(showName) => store.update({ showName })}
            />

            <Group label="Values">
              <div className="poster-panel__checks">
                {POSTER_FIELDS.map((field) => (
                  <Toggle
                    key={field.id}
                    label={field.label}
                    checked={config.fields.includes(field.id)}
                    onChange={(on) => toggleField(field.id, on)}
                  />
                ))}
              </div>
            </Group>

            <Group label="Arrangement">
              <Segmented<PosterInfoLayout>
                ariaLabel="Value arrangement"
                size="sm"
                value={config.infoLayout}
                options={[
                  { value: 'columns', label: 'Columns' },
                  { value: 'stacked', label: 'Stacked' },
                  { value: 'inline', label: 'Inline' }
                ]}
                onChange={(infoLayout) => store.update({ infoLayout })}
              />
            </Group>

            <Toggle
              label="Show the HEX / RGB captions"
              checked={config.showLabels}
              onChange={(showLabels) => store.update({ showLabels })}
            />
            <Toggle
              label="Hash before the hex"
              hint="#F6724B rather than F6724B"
              checked={config.hashPrefix}
              onChange={(hashPrefix) => store.update({ hashPrefix })}
            />
          </div>
        </Disclosure>

        <Disclosure title="Title and glyphs" icon={<SparklesIcon size={16} />}>
          <div className="poster-panel__stack">
            <Toggle
              label="Poster title"
              checked={config.showTitle}
              onChange={(showTitle) => store.update({ showTitle })}
            />

            {config.showTitle ? (
              <>
                <Field label="Title">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={config.title}
                      placeholder="Autumn walk"
                      onChange={(event) => store.update({ title: event.target.value })}
                    />
                  )}
                </Field>
                <Range
                  label="Title size"
                  min={1}
                  max={10}
                  step={0.1}
                  suffix="%"
                  value={config.titleSize}
                  onChange={(titleSize) => store.update({ titleSize })}
                />
              </>
            ) : null}

            <Group
              label="Glyph on every band"
              hint="Each band can still be changed on its own."
            >
              <div className="poster-glyphs">
                <IconButton
                  label="No glyph"
                  variant={defaultIcon === NO_ICON ? 'solid' : 'ghost'}
                  onClick={() => store.setAllIcons(NO_ICON)}
                >
                  <span className="poster-glyphs__none">—</span>
                </IconButton>
                {POSTER_ICONS.map((icon) => (
                  <IconButton
                    key={icon.id}
                    label={icon.label}
                    variant={defaultIcon === icon.id ? 'solid' : 'ghost'}
                    onClick={() => store.setAllIcons(icon.id)}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                      <path d={icon.path} fill="currentColor" />
                    </svg>
                  </IconButton>
                ))}
              </div>
            </Group>

            <Range
              label="Glyph size"
              min={1}
              max={14}
              step={0.2}
              suffix="%"
              value={config.iconSize}
              onChange={(iconSize) => store.update({ iconSize })}
            />
          </div>
        </Disclosure>
      </div>
    </div>
  )
}

/** Closest weight the chosen family actually ships. */
function nearestWeight(weights: number[], wanted: number): number {
  return weights.reduce((best, weight) =>
    Math.abs(weight - wanted) < Math.abs(best - wanted) ? weight : best
  )
}
