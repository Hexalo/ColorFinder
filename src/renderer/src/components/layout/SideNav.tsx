import { useState } from 'react'
import { Moon02Icon, SidebarLeft01Icon, Sun03Icon } from 'hugeicons-react'
import { AboutDialog } from '../brand/AboutDialog'
import { AppMark } from '../brand/AppMark'
import { NavColors } from './NavColors'
import { NAV_ITEMS } from '../../data/navigation'
import { useSidebar } from '../../hooks/useSidebar'
import { useTheme } from '../../hooks/useTheme'
import { useRouteStore } from '../../store/routeStore'
import { setTheme } from '../../store/settingsStore'
import { IconButton } from '../ui/Button'
import './SideNav.css'

export function SideNav(): React.JSX.Element {
  const route = useRouteStore((state) => state.route)
  const navigate = useRouteStore((state) => state.navigate)
  const { resolved } = useTheme()
  const { collapsed, width, resizing, toggle, startResize } = useSidebar()
  const [about, setAbout] = useState(false)

  const nextTheme = resolved === 'dark' ? 'light' : 'dark'

  return (
    <nav
      className={`sidenav ${collapsed ? 'is-collapsed' : ''} ${resizing ? 'is-resizing' : ''}`}
      style={{ width: collapsed ? undefined : width }}
      aria-label="Sections"
    >
      {/* Drag region: on macOS the traffic lights sit in the strip above. */}
      <div className="sidenav__titlebar" />

      {/* Clicking the app name replays the splash inside an About panel. */}
      <button
        type="button"
        className="sidenav__brand"
        onClick={() => setAbout(true)}
        title="About Color Finder"
      >
        <AppMark size={26} />
        <span className="sidenav__name display">Color Finder</span>
      </button>

      <ul className="sidenav__list">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon
          const active = item.id === route
          return (
            <li key={item.id} style={{ '--i': index } as React.CSSProperties}>
              <button
                type="button"
                className={`sidenav__item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : item.hint}
                onClick={() => navigate(item.id)}
              >
                <span className="sidenav__icon">
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <span className="sidenav__label">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sidenav__spacer" />

      <NavColors collapsed={collapsed} />

      <footer className="sidenav__foot">
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          variant="ghost"
          onClick={toggle}
        >
          <SidebarLeft01Icon size={18} className={collapsed ? 'is-flipped' : ''} />
        </IconButton>
        <IconButton
          label={`Switch to ${nextTheme} mode`}
          variant="ghost"
          onClick={() => setTheme(nextTheme)}
        >
          {resolved === 'dark' ? <Sun03Icon size={18} /> : <Moon02Icon size={18} />}
        </IconButton>
      </footer>

      {/* Drag handle. Hidden while collapsed — the toggle is the way back. */}
      {collapsed ? null : (
        <div
          className="sidenav__resizer"
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          onPointerDown={startResize}
          onDoubleClick={toggle}
        />
      )}

      <AboutDialog open={about} onClose={() => setAbout(false)} />
    </nav>
  )
}
