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
│       └── files.service.ts          save/open dialogs, image → data URL, poster writes
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
        │   ├── poster/      PosterCanvas (live preview), PosterSettings, PosterSwatches
        │   └── brand/       AppMark (shared by the sidebar, splash and app icon)
        ├── pages/           one file per side-nav entry
        ├── services/        pure logic — colour maths, harmonies, extraction, export
        ├── hooks/           reusable React behaviour (theme, clipboard, drag, sidebar…)
        ├── store/           Zustand stores; the only things that talk to `window.api`
        ├── data/            static tables: colour spaces, code/palette formats, nav,
        │                    poster ratios/fonts/templates and the poster glyph paths
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

## Posters

**Poster** lays a colour or a palette out as an image you can export: bands of colour with
their names and values, in the shape of a printed colour card. The page is two panes — the
poster on the left, every control on the right — with a divider you can drag; the split is
a fraction of the page rather than a pixel width, so both halves keep their share when the
window changes size, and it is remembered in `settings.json`.

**The preview *is* the exporter.** `drawPoster` renders onto any 2D context in poster
pixels; the preview scales that context down to fit the pane and the export runs it at
full resolution on an off-screen canvas. There is no second layout to keep in sync, so
what you see cannot drift from what lands in the file.

Every measurement in the config — type sizes, gaps, margins, corner radius, glyph size —
is a **percentage of the poster's short edge**, never a pixel. The same poster at 900px
and at 3600px is the same poster, which is the point of offering a resolution at all.

What can be set: the ratio (portrait, square, landscape, A4, or free) and the resolution;
stacked bands or side-by-side columns; gap, margin, corner radius, opacity and band width,
with the narrow bands sitting flush, centred or in a **cascade**; the typeface, weight,
sizes, tracking, alignment and position of the text; which values are printed (HEX, RGB,
HSL, CMYK, OKLCH, index) and whether they sit in columns, stacked or inline; and a glyph
per band, chosen from a set drawn as plain path data so the same string feeds the canvas
and the picker.

**Background** is solid, a palette gradient, or a picture — and a black veil (**Dim**)
sits over whichever one is active, not just a picture, so a bright gradient or a pale
solid can be knocked back for contrast too. A picture also gets its own **fit, blur, zoom
and pan**: drag it straight on the preview to reframe it — the same `imageOffsetX/Y` the
Position sliders drive — or dial it in with the sliders when you want a precise number.
"Reset position and zoom" clears both in one click. Panning and zoom are the one part of a
picture that a template never touches, since they belong to *your* photo, not to the look.

Text colour has three modes, and the interesting one is **Palette**: instead of the usual
black-or-white it borrows a colour *from the palette itself* — every band is a candidate,
not just the others — which is what gives printed colour cards their coherence, the
caption on the orange band being the palette's own brown rather than a generic grey. When
even the closest palette hue cannot clear a readable contrast on its own, its hue and
chroma are kept and only its lightness is pushed toward black or white, so a band's label
still reads as *drawn from this palette* instead of collapsing to flat black or white.

Colours come from a single list rather than a mode switch: the palette you last had on
screen, the colour you are holding, or anything in the library — reached through a visual
browser, not a dropdown of names, grouped by bookmark with each palette shown as its own
swatch strip. "Latest palette" keeps following along — generate a new one on any page and
the poster updates, because every palette screen publishes through the same `PaletteBoard`.
Names are editable per band, and a picture can be dropped straight onto the preview instead
of going through the dialog.

Six **templates** ship as starting points (Spec sheet, City lights, Retro, Columns, Cards,
Minimal). A template is a *look*: it never touches your colours, your picture, your title,
the export format, the resolution, or the picture's own pan and zoom. The one you chose is
remembered between sessions.

A whole poster — page, layout, type, background, everything — can be **saved to the
library** under a name, then pulled back later from the Poster page's own "Saved
configurations" list or from a "Poster configurations" section on the Library page (whose
"Open" jumps to Poster with it loaded). Saving again offers to update the loaded
configuration in place or file a new one, so iterating on a look does not pile up copies
by accident. `Library.posters` in `library.json` holds them; the shape lives in
`shared/types.ts` rather than the renderer-only poster types, since the main process's
migration code has to know it too — v2 -> v3 of the library schema added it.

Export writes PNG, JPEG or WebP: the renderer encodes the canvas and hands the bytes to
the main process, which shows the save dialog and writes them.

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

`library.json` holds bookmarks, palettes, standalone colours and saved Poster
configurations; `settings.json` holds preferences (theme, preferred copy format, side nav
state, pane sizes, tab selections). Writes go through a temp file and a rename, so an
interrupted write cannot truncate the library. Both files carry a `schemaVersion`;
`migrateLibrary` / `migrateSettings` in `storage.service.ts` are where shape changes get
handled — the library is at v3 (saved posters), settings at v5 (the Poster split). Missing
fields fall back to the defaults, so an older file upgrades on first read.

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
- **The poster is drawn on a canvas**, not laid out in the DOM and screenshotted. It is the
  only way the preview and the exported file can be the same thing, and it keeps the export
  free of any dependency: no html-to-image, no headless browser.
- **Poster glyphs are path data**, not `hugeicons-react` components. The canvas needs a
  `Path2D`, and serialising React components to feed one would put a second source of truth
  between the picker and the poster. Add to `data/posterIcons.ts` to extend the set.
- **Poster typefaces** are a curated list of stacks. Quicksand and Playwrite ship with the
  app; the rest are system faces with enough fallbacks that a poster still looks deliberate
  on a machine that has none of them.
- **The poster is not persisted** — it is a one-off export, and the templates are there to
  get a look back in one click. Only the chosen template and the pane split are remembered.
- **"Latest palette"** is whatever palette was last on screen, which includes one you
  merely opened in the library. That is the reading that needs no bookkeeping: every
  palette screen renders the same `PaletteBoard`, so it is the one that publishes.
