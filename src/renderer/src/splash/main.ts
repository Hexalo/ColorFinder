import './splash.css'
import { COLOR_PICKER_PATHS, RAINBOW_STOPS } from '../components/brand/AppMark'

/**
 * Splash window shown while the main window boots.
 *
 * Deliberately dependency-free — no React — so it paints on the first frame
 * instead of waiting for the app bundle it is meant to be covering for. The
 * main process fades it out (see `splash:leave`) and then destroys it.
 */

const gradientStops = RAINBOW_STOPS.map(
  (stop, index) =>
    `<stop offset="${(index / (RAINBOW_STOPS.length - 1)) * 100}%" stop-color="${stop}"/>`
).join('')

const root = document.getElementById('root') as HTMLDivElement

root.innerHTML = `
  <div class="splash" id="splash">
    <div class="splash__mark">
      <svg viewBox="0 0 24 24" width="84" height="84" aria-hidden="true">
        <defs>
          <linearGradient id="splash-rainbow" x1="0" y1="0" x2="1" y2="1">${gradientStops}</linearGradient>
        </defs>
        <rect width="24" height="24" fill="url(#splash-rainbow)"/>
        <g transform="translate(12 12) scale(0.72) translate(-12 -12)"
           fill="none" stroke="#fff" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round">
          ${COLOR_PICKER_PATHS.map((d) => `<path d="${d}"/>`).join('')}
        </g>
      </svg>
    </div>
    <h1 class="splash__title">Color Finder</h1>
    <p class="splash__tagline">Pick &middot; Mix &middot; Keep</p>
    <div class="splash__bar"><span></span></div>
  </div>
`

// The main process asks for the exit animation, then destroys the window.
window.splashApi?.onLeave(() => {
  document.getElementById('splash')?.classList.add('is-leaving')
})
