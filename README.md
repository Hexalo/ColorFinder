# Color Finder

A cosy desktop colour picker, palette generator and library. React + TypeScript inside
Electron; everything runs locally and nothing is sent anywhere.

```bash
npm install
npm run dev
```

Other scripts: `npm run typecheck`, `npm run build`, `npm run icon`,
`npm run dist:mac|dist:win|dist:linux`.

> `npm install` does not always fetch the Electron binary itself. If `npm run dev` fails
> with `Error: Electron uninstall`, run `node node_modules/electron/install.js` once.

## Architecture

```
scripts/generate-icon.cjs   renders build/icon.png from the same artwork as AppMark
src/
├── main/                    Electron main process
│   ├── index.ts             splash + main window lifecycle
│   ├── ipc.ts               every IPC handler, in one place
│   └── services/
│       ├── storage.service.ts        atomic JSON reads/writes + schema migration
│       ├── screenPicker.service.ts   cross-OS eyedropper (capture + overlay windows)
│       └── files.service.ts          save/open dialogs, image → data URL
├── preload/                 the only bridge the renderer gets (contextIsolation on)
├── shared/                  types and IPC channel names used by every process
└── renderer/
    ├── picker.html          the fullscreen eyedropper overlay (its own entry point)
    ├── splash.html          the boot splash (its own entry point)
    └── src/
        ├── components/      presentational, no persistence
        │   ├── ui/          Button, Field, Modal, Disclosure, Toaster
        │   ├── layout/      SideNav, Page
        │   ├── color/       ColorWheel, ColorSquare, ChannelSliders, PaletteStrip…
        │   ├── copy/        CopyPanel — the one place colours get copied from
        │   ├── palette/     PaletteBoard, SavePaletteDialog, BookmarkDialog
        │   └── brand/       AppMark (shared by the sidebar, splash and app icon)
        ├── pages/           one file per side-nav entry
        ├── services/        pure logic — colour maths, harmonies, extraction, export
        ├── hooks/           reusable React behaviour (theme, clipboard, drag, sidebar…)
        ├── store/           Zustand stores; the only things that talk to `window.api`
        ├── data/            static tables: colour spaces, code/palette formats, nav
        ├── types/           renderer-facing types, re-exporting the shared ones
        ├── assets/fonts/    self-hosted Quicksand + Playwrite GB S
        └── styles/          theme tokens, animations, global reset
```

The dependency direction is one-way: `pages → components → hooks → services → data`.
Only `store/` reaches for `window.api`, so the colour logic stays testable as plain
functions.

## The screen colour picker

There is no cross-platform "read the pixel under the cursor" API, so the picker:

1. screenshots **every** display at its native pixel resolution (`desktopCapturer`),
2. covers each display with a frameless, always-on-top window showing that screenshot,
3. reads the clicked pixel out of an offscreen canvas.

Identical behaviour on macOS, Windows and Linux. Arrow keys nudge one pixel at a time,
<kbd>Enter</kbd> confirms, <kbd>Esc</kbd> or right-click cancels.

### macOS permission

macOS requires **Screen Recording** permission. The first attempt raises the system
prompt; a freshly granted permission only takes effect **after restarting the app**.

In development the permission is attached to the `Electron` binary, not to
`Color Finder` — grant it to *Electron* in
`System Settings → Privacy & Security → Screen Recording`, then restart `npm run dev`.

## Palettes

Every screen that shows a palette renders the same `PaletteBoard`: the strip itself, plus
add / remove / edit-in-place per swatch and one toolbar with **Copy, Export JSON and Save
to library**. Harmonies, Random, From image and the Library differ only in the generator
controls they pass in, so a palette never behaves differently depending on where you
found it.

Editing a swatch opens the **essential picker** — the same saturation square and hue bar
as the Picker page in a popover, with a hex field, the eyedropper, one-tap access to
colours already in your library, and a shortcut into Harmonies.

Locks are positional and survive a shorter palette: switching a five-colour harmony to a
two-colour one carries the pinned swatches over instead of dropping them. Shuffling is
only offered where it can do something — the "Unlocked" harmony and the Random page,
where it is the accent action.

Swatches reorder by dragging their grip (arrow keys work too), and locks travel with them.

The channel sliders keep the **channel values** as their source of truth, not the hex.
Round-tripping through a hex is lossy — it is 8-bit, and at the edges whole channels
collapse, since `#000000` has no hue or saturation to read back — so deriving the sliders
from the hex on every move yanked the *other* handles to zero.

Swatch cells are keyed by **position, not by colour**: keying by hex would remount the
cell on every edit, which recreates the popover's anchor mid-drag and makes the picker
jump.

## The harmony wheel

Harmonies carries a polar view under the palette: **OKLCH hue around the rim, chroma along
the radius** — the same space the harmonies are computed in, so a triadic really does show
as three evenly spaced dots. An HSL wheel would misrepresent it.

Dragging follows the palette's own mode. Under a rule the palette is a function of the
base colour, so a point can only move by moving everything: the base turns by the same
angle and its chroma scales by the same factor, and the rule redraws the rest at their
fixed offsets — the spacing is preserved. Under "Unlocked" there is no rule to respect,
so each point moves alone.

The disc owns the pointer, not the dots: grabbing a dot directly would make the drag
measure against its own 24px box.

Alongside the disc sit **hue, saturation and lightness sliders**, and they are absolute —
each one names a value you can read off. Under a rule they drive the **base colour**, which
is the only colour a rule-bound palette actually has: the dot it belongs to is ringed on
the wheel, and its hex sits in the block's title, so the numbers are never describing
something you cannot point at. Under "Unlocked" there is no base, so the whole-palette
tracks show the **average** and shift every unlocked swatch by the same amount, and a
second set targets whichever swatch you pick from the chips beside it.

The three fields are independent by construction (`Okhsl` in `types/`, `okhslOf` /
`okhslToHex`): saturation is a **fraction of what the colour could hold** at its own
lightness and hue, and the chroma is rebuilt from that fraction whenever hue or lightness
moves. Raw OKLCH does not behave: hold chroma fixed and raise lightness and the colour
visibly desaturates, because the ceiling moved underneath it — which is exactly what used
to make the saturation and hue readouts wander whenever the lightness track was dragged.
A raw chroma figure is not comparable across a palette either: 0.15 is washed out in the
magentas and outside the gamut in the cyans.

Because the fields no longer disturb each other, the tracks can simply show the truth
rather than defending a remembered position. The sliders bound to a single colour still
hold their own triple between renders — `#rrggbb` has only 8 bits per channel, so a long
drag would accumulate rounding drift, and at the ends of the lightness range there is no
hue left to read back — and re-seed from any hex they did not themselves produce, which is
how the wheel, the eyedropper and the hex field get to move them.

Switching *to* "Unlocked" keeps the palette you arrived with rather than regenerating —
carrying a harmony over is usually the reason for switching.

The radius is normalised **per point** by the chroma sRGB can actually reach at that
colour's lightness and hue — `maxChromaAt`. That ceiling is nowhere near constant: at
OKLCH L 0.63 it runs from about 0.109 in the cyans to 0.287 in the magentas, so a single
flat maximum would strand most hues a third of the way out and make the rim unreachable.

## Colour names

Every colour gets a name. Colours close to one of the 148 CSS named colours borrow that
name; everything else is described from OKLCH as a modifier plus a hue family — "Deep
Indigo", "Muted Sage". Nothing is fetched and no dataset is shipped. Names appear under
each swatch, in the copy panel, and are searchable in the library.

## Copying colours

Every copy affordance — the big swatch, a palette swatch, the Copy buttons — opens the
right-hand **copy panel** rather than writing straight to the clipboard, so the full set of
formats is always one click away from wherever you are.

It targets either a single colour or a whole palette — palettes get block formats like a
CSS custom-property set, an SCSS map or `colors.xml`. Your preferred format from Settings
sits at the top as a one-tap button, so the groups themselves stay collapsed. Opening a
swatch from inside a palette keeps a way back to it.

It is deliberately non-modal — you can keep clicking swatches behind it and it re-targets.
The panel is resizable (persisted), format groups start collapsed with an icon each, and
it carries **Make it the current colour** (adopts it without leaving the page), plus
**Picker**, **Harmonies** and **Save**.

## Interface

- **Side nav** collapses to icons only (button, or drag its edge past the minimum) and is
  resizable by dragging that edge. Both are remembered in `settings.json`.
- **Library palettes are editable in place**: the card opens the same `PaletteBoard`,
  writing straight through to storage — so its "Save to library" is hidden there, since it
  would only ever make a duplicate.
- **Library** shows bookmarks as square cards whose thumbnail is a grid of the palettes
  inside — one row per palette — with the bookmark's glyph on its own plate, ringed in the
  bookmark colour. Plus a "Recent" view, standalone saved colours, and a search that
  matches palette names, colour names and hex.
- **The side nav foot** carries the working colour and the recently used ones, so the
  colour you are on is visible from every page. Recent swatches drop individually from a
  small cross, both here and on the Picker page. Nothing is truncated: the strip **scrolls**
  and keeps the whole history. It defaults to about three rows so it does not crowd the
  nav, and a grabber on its top edge **drags it taller or shorter** — double-click to reset.
  The height is remembered with the other layout settings.
- **The nav items never give way.** They neither shrink nor scroll: the recent strip is
  what yields when the sidebar runs short, so it simply stops growing where the nav ends,
  however far the grabber is dragged. What the sidebar actually granted is measured when
  the drag ends (`flushSync`, then read the layout) and stored in place of the ask, so the
  next drag tracks the pointer from its first pixel instead of working through an ambition
  the sidebar never granted.
- **The essential picker** offers your saved library colours and your recent ones as two
  separate strips — "saved on purpose" and "used lately" are different things, and merging
  them buried the recent ones.
- **Tab selections** (picker mode, colour space, harmony rule, random flavour) survive
  navigation and restarts.
- Page headers carry no description text — a paragraph beside the actions reflows badly at
  every window width.
- **Splash** is a real frameless window shown while the main window boots, not an in-app
  overlay, so it covers the actual startup gap. Held for a minimum of 1.5s so its
  animation is seen even on a fast boot.
- **Fonts** are self-hosted: Quicksand for the interface, Playwrite GB S — the family
  Google publishes as *Playwrite England SemiJoined* — for the app name and splash.
- **App icon** is generated by `npm run icon` from the same Hugeicons colour-picker glyph
  on a rainbow field that the sidebar shows; electron-builder derives .icns/.ico from it.
- On macOS the window controls are drawn over the sidebar, so a `--titlebar-height` strip
  is reserved for them and the app name sits below. That strip is 0 on Windows and Linux,
  where the frame is native.
- Motion is transform/opacity only, and everything collapses under
  `prefers-reduced-motion: reduce`.

## Colour handling

All conversions go through [culori](https://culorijs.org).

- Hue rotations, random colours and monochromatic scales are computed in **OKLCH**, so
  perceived lightness stays even across a palette — an HSL rotation from yellow to blue
  does not.
- Out-of-gamut colours are mapped back to sRGB by reducing chroma, not by clipping
  channels, which keeps the hue.
- **CMYK is a device-independent approximation.** Real print conversion depends on an ICC
  profile; the UI says so where the numbers appear.
- Both `sRGB` (0–1, CSS `color()` form) and `RGB` (0–255) are offered, since the brief
  asked for both spellings.

Image palettes use median cut on a downsampled copy of the image, then merge
near-duplicates in OKLab so the requested number of swatches is genuinely distinct.

## Data on disk

Plain, pretty-printed JSON you can read, edit and version-control:

| OS      | Path                                                        |
| ------- | ----------------------------------------------------------- |
| macOS   | `~/Library/Application Support/color-finder/data/`           |
| Windows | `%APPDATA%/color-finder/data/`                               |
| Linux   | `~/.config/color-finder/data/`                               |

`library.json` holds bookmarks and palettes, `settings.json` holds preferences (theme,
preferred copy format, side nav state). Writes go through a temp file and a rename, so an
interrupted write cannot truncate the library. Both files carry a `schemaVersion`;
`migrateLibrary` / `migrateSettings` in `storage.service.ts` are where shape changes get
handled — settings are already at v2, which added the side nav state.

Exports (`Export library`, `Export palette`) are self-describing documents tagged with a
`format` and `version`, and palette exports include each colour pre-rendered as RGB, HSL,
OKLCH and CMYK so the file is useful on its own. Import accepts either an export document
or a raw `library.json`.

## Interpretation notes

A few points in the brief were open-ended; these are the calls made:

- **"Unlocked"** is read as *no harmony rule*: lock the swatches you like, everything else
  gets a fresh random colour. Lock/shuffle works on every palette screen.
- **"Copy for programming languages"** is a fixed list (SwiftUI, UIKit, Compose, Android
  XML, Flutter, JS, Python, SCSS, Less, Tailwind, CSS custom property, integer) rather than
  an open-ended one. `data/codeFormats.ts` is the single place to add more.
- **Bookmarks** are flat folders, not nested tags. A palette belongs to at most one.
- **Icons**: the free Hugeicons set only ships the *rounded stroke* variant. The bulk
  variant asked for in the brief is behind their paid plan, so the free rounded family is
  used — swap the imports in `data/navigation.ts` if you buy the pro set.
- **Contextual copy** is read as: the panel adapts to *what* you opened it on (colour vs
  palette) and which format group you work in most, rather than showing one flat list.
- The picker keeps its live per-space read-out. That is feedback while you drag, not a
  copy surface — copying moved entirely into the panel.
