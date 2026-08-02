/**
 * Renders the app icon to `build/icon.png` at 1024x1024.
 *
 *   npm run icon
 *
 * Runs under the project's own Electron binary so Chromium rasterises the SVG
 * for us — no image library needed. electron-builder derives the .icns / .ico
 * / Linux sizes from this single PNG.
 *
 * The artwork is the same Hugeicons colour-picker glyph on a rainbow field
 * that `components/brand/AppMark.tsx` draws in the UI — keep the two in sync.
 */
const { app, BrowserWindow } = require('electron')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const SIZE = 1024
const root = join(__dirname, '..')

const GLYPH = [
  'M13.435 7L7.15915 13.2759M7.15915 13.2759L4.82728 15.6077C3.92569 16.5093 3.47489 16.9601 3.23745 17.5334C3 18.1066 3 18.7441 3 20.0192V21H3.98082C5.25586 21 5.89338 21 6.46663 20.7626C7.03988 20.5251 7.49068 20.0743 8.39227 19.1727L14.2891 13.2759M7.15915 13.2759H14.2891M14.2891 13.2759L17 10.565',
  'M19.2087 8.38869L20.82 10M19.2087 8.38869L20.0705 7.52682C20.363 7.23431 20.5093 7.08805 20.611 6.94529C21.1297 6.21676 21.1297 5.23953 20.611 4.511C20.5093 4.36824 20.363 4.22198 20.0705 3.92947C19.778 3.63697 19.6318 3.4907 19.489 3.38905C18.7605 2.87032 17.7832 2.87032 17.0547 3.38905C16.912 3.4907 16.7657 3.63695 16.4732 3.92947L15.6113 4.79133M19.2087 8.38869L15.6113 4.79133M14 3.18002L15.6113 4.79133'
]

const STOPS = ['#ff5f6d', '#ff9f43', '#ffd93d', '#6bcB77', '#4d96ff', '#9b5de5', '#f15bb5']

const gradientStops = STOPS.map(
  (stop, index) =>
    `<stop offset="${((index / (STOPS.length - 1)) * 100).toFixed(2)}%" stop-color="${stop}"/>`
).join('')

// Squircle-ish corner radius and inner padding matched to macOS icon metrics.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">${gradientStops}</linearGradient>
    <!-- Kept subtle: a strong white veil washes the spectrum out to pastel. -->
    <radialGradient id="sheen" cx="0.28" cy="0.14" r="0.8">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.2"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="glyphShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000" flood-opacity="0.24"/>
    </filter>
  </defs>

  <rect x="72" y="72" width="880" height="880" rx="205" fill="url(#rainbow)"/>
  <rect x="72" y="72" width="880" height="880" rx="205" fill="url(#sheen)"/>

  <g transform="translate(512 512) scale(18.6) translate(-12 -12)"
     fill="none" stroke="#fff" stroke-width="1.7"
     stroke-linecap="round" stroke-linejoin="round" filter="url(#glyphShadow)">
    ${GLYPH.map((d) => `<path d="${d}"/>`).join('')}
  </g>
</svg>`

const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block}</style>
${svg}`

app.whenReady().then(async () => {
  // Positioned far off-screen rather than hidden: `capturePage` on a window
  // that has never been shown comes back blank on some platforms.
  const window = new BrowserWindow({
    x: -4000,
    y: -4000,
    width: SIZE,
    height: SIZE,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true
  })

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`)
  // Give Chromium a frame to lay the SVG out before grabbing it.
  await new Promise((resolve) => setTimeout(resolve, 600))

  // capturePage returns device pixels, so on a HiDPI screen this comes back at
  // 2x — resize so the output is exactly SIZE regardless of the machine.
  const captured = await window.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE })
  const image =
    captured.getSize().width === SIZE ? captured : captured.resize({ width: SIZE, height: SIZE })
  const png = image.toPNG()

  mkdirSync(join(root, 'build'), { recursive: true })
  writeFileSync(join(root, 'build', 'icon.png'), png)
  writeFileSync(join(root, 'build', 'icon.svg'), svg, 'utf-8')

  console.log(
    `ICON_OK ${image.getSize().width}x${image.getSize().height} ${(png.length / 1024).toFixed(1)}kB`
  )
  window.destroy()
  app.exit(0)
})
