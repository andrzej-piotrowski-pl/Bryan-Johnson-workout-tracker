# Themes

The app ships with seven looks: the Original one and six themes that each change the layout, type and colours. This page explains how they work and how to add one.

## How it works

- **Where the choice lives.** `profile.settings.skin` holds the theme id (`original`, `chapters`, `darkroom`, `pulse`, `lab`, `olympia`, `course`); `profile.settings.theme` holds the mode (`system`, `light`, `dark`). Profiles saved before themes existed have no `skin` and get the Original look. Both values are also copied to `localStorage` (`hp:skin`, `hp:theme`) so the page paints in the right look before the app has loaded.
- **What the page carries.** `js/themes.js` (`applyLook`) sets three attributes on `<html>`:
  - `data-skin`: the theme id;
  - `data-theme`: a forced mode, if any (the user's light/dark choice, or `dark` for Dark room, which is always dark);
  - `data-scheme`: the resolved `light` or `dark`, following the system when the mode is `system`.
  Today also sets `data-venue` (`strength`, `intervals`, `endurance` or `rest`) for the day on screen, and the shell sets `data-route` to the current page.
- **Where the looks are.** `css/app.css` is the Original look and the shared structure. `css/themes.css` has one section per theme, each starting with a comment that says which design guide it follows and how. A theme section sets the design tokens (`--bg`, `--surface`, `--ink`, `--accent`, fonts, radii…) for light, and again under `[data-scheme="dark"]`, then restyles the shell and the pages.
- **Layout.** Above 900px each theme decides where the navigation goes (`.sidebar` becomes a top bar, a right-hand list, an icon rail…). Phones keep the top bar and bottom tab bar, restyled. Today is split into three regions, `.day-head`, `.day-list` and `.detail-col`, which a theme places with `grid-template-areas` on `.today-layout`. Course is the one theme that also changes behaviour: `detailMode()` in `themes.js` returns `inline`, and Today then opens an exercise under its row instead of in the side panel.
- **Kinds.** Blocks on Today carry `data-kind` (`warm`, `power`, `strength`, `core`, `cardio`, `stretch`) and week cards carry the session kind, both from `themes.js`, so a theme can colour them by meaning.
- **The 3D scene.** `anim/stage.js` reads four optional custom properties from `<html>`: `--stage-floor`, `--stage-grid`, `--stage-hl` (highlighted muscles) and `--stage-body` (the figure), as `#rrggbb` hex. Stages repaint when the theme or the system colour scheme changes. The exercise-library thumbnails are cached per theme and mode.
- **Fonts.** Only the three bundled font packages are used (Inter, Barlow Condensed, JetBrains Mono), in more weights. Chapters uses Inter's optical-size axis for its display type. A font file is only downloaded when a theme actually uses it.

## The six themes and their guides

| Theme | Guide | Built from |
|---|---|---|
| Chapters | [taste-skill](https://github.com/Leonxlnx/taste-skill) | Direction "Colour chapters", palette "Report blocks". The house rules: no thin rules, outlined boxes, shadows at rest, gradients, glass, monospace, small uppercase labels or eyebrows; square corners; one typeface set large. |
| Dark room | taste-skill | Direction "The dark room", palette "Green-black and bone": one dark field with the 3D figure as the lit exhibit, sparse light type, fully round buttons. Same house rules. |
| Pulse | [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Product type "Fitness/Gym App": "Vibrant & Block-based + Dark Mode (OLED)", energy orange + success green, the "Sports/Fitness" type pairing, progress-ring animation; its accessibility and touch rules (4.5:1 contrast, 44px targets). |
| Lab | ui-ux-pro-max | Product type "Biohacking / Longevity App": "Minimalism & Swiss Style", data-dense, DNA blue + cellular red on white, the "Dashboard Data" pairing (a sans for words, mono for figures), 0px radius, no shadows. |
| Olympia | [impeccable](https://github.com/pbakaus/impeccable) | Operate mode (the world lends type, palette, density and one signature move; controls stay standard). World: Otl Aicher's 1972 Munich identity. "Full palette" colour strategy by session kind; the signature move is the venue colour following the day. No eyebrows, no side stripes, borders instead of shadows. |
| Course | impeccable | Operate mode with a different world and organisation: an orienteering map (open-land yellow rail, contour brown, water blue, purple overprint). The signature move is the course line through the session; exercises open in place rather than in a panel. |

## Adding a theme

1. Add an entry to `SKINS` in `public/js/themes.js`: an `id`, a `name`, a one-line `blurb`, `modes` (`["light", "dark"]`, or one of them if the theme only works in one) and a `preview` (the colours and arrangement of its card in the picker; see the existing entries and the `.skin-pv` styles at the end of `app.css`).
2. If it only has one mode, add the forced mode to the inline script in `public/index.html` too (it mirrors `applyLook`, as it does for Dark room).
3. Add a section to `public/css/themes.css`: tokens under `:root[data-skin="yours"]`, dark tokens under `:root[data-skin="yours"][data-scheme="dark"]`, then the shell (inside `@media (min-width: 901px)`), Today's arrangement and anything else you want to change. Prefix every rule with `[data-skin="yours"]` so it never leaks into other themes.
4. Check every page in light and dark, on a wide screen and a phone, and keep text contrast at 4.5:1 or more.
