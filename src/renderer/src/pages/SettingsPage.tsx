import { useEffect, useState } from 'react'
import { FolderOpenIcon, LaptopIcon, Moon02Icon, Sun03Icon } from 'hugeicons-react'
import { Page, Section } from '../components/layout/Page'
import { Button } from '../components/ui/Button'
import { Field, Segmented, Select } from '../components/ui/Field'
import { CODE_FORMATS } from '../data/codeFormats'
import { useSettingsStore } from '../store/settingsStore'
import type { ThemeMode } from '../types'
import './SettingsPage.css'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun03Icon size={15} /> },
  { value: 'dark', label: 'Dark', icon: <Moon02Icon size={15} /> },
  { value: 'system', label: 'System', icon: <LaptopIcon size={15} /> }
]

export function SettingsPage(): React.JSX.Element {
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const [dataPath, setDataPath] = useState('')

  useEffect(() => {
    void window.api.library.path().then(setDataPath)
  }, [])

  return (
    <Page title="Settings">
      <Section title="Appearance">
        <div className="settings__card card">
          <Field label="Theme" hint="System follows your operating system's light/dark setting.">
            {() => (
              <Segmented
                ariaLabel="Theme"
                value={settings.theme}
                options={THEME_OPTIONS}
                onChange={(theme) => update({ theme })}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Defaults">
        <div className="settings__card card">
          <Field
            label="Preferred copy format"
            hint="Used first in the copy list so your usual format is always on top."
          >
            {(id) => (
              <Select
                id={id}
                value={settings.defaultCopyFormat}
                onChange={(event) => update({ defaultCopyFormat: event.target.value })}
                options={CODE_FORMATS.map((format) => ({
                  value: format.id,
                  label: `${format.group} · ${format.label}`
                }))}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Data">
        <div className="settings__card card">
          <p className="settings__text">
            Palettes and bookmarks are stored as plain, readable JSON — you can open, edit
            or version-control the file yourself.
          </p>
          <code className="settings__path mono">{dataPath || 'Locating…'}</code>
          <div>
            <Button
              icon={<FolderOpenIcon size={16} />}
              onClick={() => void window.api.library.revealInFolder()}
            >
              Show in file manager
            </Button>
          </div>
        </div>
      </Section>

      <Section title="About">
        <div className="settings__card card">
          <p className="settings__text">
            Colour maths runs through culori; hue rotations and random colours are computed in
            OKLCH so lightness stays perceptually even. CMYK values are a device-independent
            approximation — real print output depends on an ICC profile.
          </p>
          <p className="settings__text">
            Icons come from the free Hugeicons set (rounded stroke); the bulk variant is part of
            their paid plan.
          </p>
        </div>
      </Section>
    </Page>
  )
}
