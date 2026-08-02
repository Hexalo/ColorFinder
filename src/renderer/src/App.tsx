import { useEffect } from 'react'
import { CopyPanel } from './components/copy/CopyPanel'
import { SideNav } from './components/layout/SideNav'
import { Toaster } from './components/ui/Toaster'
import { useTheme } from './hooks/useTheme'
import { HarmoniesPage } from './pages/HarmoniesPage'
import { ImagePage } from './pages/ImagePage'
import { LibraryPage } from './pages/LibraryPage'
import { PickerPage } from './pages/PickerPage'
import { PosterPage } from './pages/PosterPage'
import { RandomPage } from './pages/RandomPage'
import { SettingsPage } from './pages/SettingsPage'
import { useLibraryStore } from './store/libraryStore'
import { useRouteStore } from './store/routeStore'
import { useSettingsStore } from './store/settingsStore'
import type { RouteId } from './data/navigation'
import './App.css'

const PAGES: Record<RouteId, () => React.JSX.Element> = {
  picker: PickerPage,
  harmonies: HarmoniesPage,
  image: ImagePage,
  random: RandomPage,
  poster: PosterPage,
  library: LibraryPage,
  settings: SettingsPage
}

export function App(): React.JSX.Element {
  const route = useRouteStore((state) => state.route)
  const loadLibrary = useLibraryStore((state) => state.load)
  const loadSettings = useSettingsStore((state) => state.load)

  // Applies `data-theme` to the document; must run above every page.
  useTheme()

  useEffect(() => {
    void loadLibrary()
    void loadSettings()
  }, [loadLibrary, loadSettings])

  // Drives the title-bar inset: only macOS draws its window controls over the
  // sidebar. `window.api` is absent when the renderer is opened in a browser.
  useEffect(() => {
    document.documentElement.dataset.platform = window.api?.system.platform ?? 'browser'
  }, [])

  const Current = PAGES[route]

  return (
    <div className="app">
      <SideNav />
      {/* `key` remounts the outlet on navigation so the entry animation replays. */}
      <main className="app__main anim-page" key={route}>
        <Current />
      </main>
      <CopyPanel />
      <Toaster />
    </div>
  )
}
