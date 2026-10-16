# Changelog

## [1.15.0] - 2026-10-16

### Added
- Scheduled Zone 2 and controlled vigorous cardio scale by level toward Bryan’s 150/75-minute weekly targets.
- Vigorous cardio has its own instructions, animation, minute logger and timer.

### Changed
- Well trained includes all target cardio without extra walks; keeping the strength work makes sessions 72–93 minutes.
- The plan, weekly durations and readable guide explain the added cardio and gradual lower-level doses.

### Fixed
- Cardio totals exclude easy warm-ups, cool-downs and brisk beginner intervals from hard work.
- Logging zero cardio minutes no longer substitutes the planned duration.

## [1.14.0] - 2026-10-16

### Added
- Activity groups This week, History and Progress into one navigation item with three tabs.
- Grouped progress intervals include This week, Last week, This month, Last month and Since beginning.

### Changed
- Desktop and mobile navigation now have five destinations; existing page bookmarks still work.
- Progress shows exact interval dates and applies them to all charts, tables and summary totals.
- Weekly averages follow the selected interval, and long-term chart labels stay readable.

## [1.13.1] - 2026-10-16

### Fixed
- Today automatically shows the first exercise animation inline on phones and tablets in every theme.
- The selected animation stays visible when resizing between desktop and mobile layouts.
- Mobile bottom navigation includes all seven pages, with direct Plan and Settings links.

## [1.13.0] - 2026-10-16

### Added
- Studio and Journal themes with new desktop and mobile layouts.
- Robot, Paper cutouts and Halftone animation styles for every exercise.
- Equipment, muscle and source filters, more sorting options and search in the exercise library.
- Custom rest timer values and more than 30 extra activities.

### Changed
- Compact effort, energy and extra activity controls on Today.
- Training levels in pairs, a fitted weekly table and clearer heart-rate estimates.
- Dated sources and linked training updates, ordered newest first where dates are known.
- Equipment is collapsed by default in Settings and the README.
- Settings links to the GitHub repository and the full changelog on GitHub.

### Fixed
- Weekly totals show hours instead of function source that stretched the page.
- Developer keyframe previews wait for the animation figure before taking snapshots.

## [1.12.0] - 2026-10-16

### Added
- Optional equipment names, links and ownership in setup and Settings, with custom items, a Massage category and a skip option.

### Changed
- Step-ups use a low aerobic step; Poliquin heel taps start on a slant board on the floor, with matching animations.
- Checked the plan against Bryan’s workout protocol updated on 14 October 2026.

### Removed
- Liquid chrome and its automatic previews, which could freeze browsers; saved preferences switch to Athlete.

## [1.11.5] - 2026-10-15

### Changed
- Theme and animation screenshots stay visible in the README while technical details remain collapsed.

## [1.11.4] - 2026-10-15

### Changed
- Made the README easier for beginners, with advanced and technical details collapsed by default.

## [1.11.3] - 2026-10-15

### Changed
- README theme screenshots now show six different animation styles, with each pairing named.

## [1.11.2] - 2026-10-15

### Fixed
- Today now opens the first exercise automatically in the Course theme.

## [1.11.1] - 2026-10-15

### Changed
- Liquid chrome now appears last in the animation style pickers.

## [1.11.0] - 2026-10-15

### Added
- Settings shows the app version and opens the five latest release notes.

## [1.10.3] - 2026-10-15

### Fixed
- Keep the selected exercise animation visible when switching between Course and other themes.

## [1.10.2] - 2026-10-15

### Fixed
- Today now scrolls as one page across themes, without a separate scrollbar inside the exercise panel.

## [1.10.1] - 2026-10-15

### Fixed
- Settings stays responsive on open by loading animation previews only when they are near the screen.

## [1.10.0] - 2026-10-15

### Added
- Zoom controls and 2× speed for exercise animations, with a Fixed mode for multi-movement animations.

### Changed
- Removed the live rep counter from animations.
- Restyled the session swap button to match the selected theme.

## [1.9.0] - 2026-10-15

### Added
- Linux users can start the app automatically at boot with the included systemd unit.
- Tailscale HTTPS setup instructions for private access from other tailnet devices.

All notable changes to this project are listed here, newest first.
Versions follow [Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`).

## [1.8.0] - 2026-10-15

### Added
- **All fifteen animation styles now work on every exercise** (all 62), not just Zone 2, with each exercise's props (wall, door, step, box, mat, sofa, chair, bench, doorframe and bar), dumbbells, bands and the string drawn in the style's own way.
- **Settings → Animation style**: pick which exercise the preview and the style cards show.

### Changed
- Every exercise now shows your chosen style (Athlete unless you picked another). Pick Mannequin to get the original grey figure back everywhere.
- In every style the muscles the exercise works light up, and the beating heart appears only on cardio.
- Blueprint's title block names the exercise, and it dimensions steps and boxes only when there is one. Doodle has jokes for each kind of exercise and tallies the reps as they're counted; its speech bubble no longer covers the figure.
- **Try styles live** opens today's session, or the exercise in the preview on a phone or a rest day.
- The Animation style section is no longer marked as a test.

## [1.7.1] - 2026-10-15

### Fixed
- On Today, scrolling down now scrolls the exercise panel on the right first, then the page.

## [1.7.0] - 2026-10-15

### Added
- **Six new animation styles drawn without three.js**, still on Zone 2 only:
  - **Liquid chrome**: a mirror-finish body that flows like poured metal, ray-marched in one WebGL shader, with reflections, soft shadows and gold on the worked muscles.
  - **Synthwave**: neon tubes on a scrolling magenta grid under a striped sunset, mirrored on a wet floor.
  - **Blueprint**: an engineering drawing with live knee, hip and elbow angles, hatched muscles and the step dimensioned.
  - **Stardust**: about 1,800 particles in deep space that trail light as the body moves.
  - **Doodle** (funny): a wobbly biro stick figure on notebook paper, with highlighter, sweat, tally marks for reps and a speech bubble with opinions.
  - **Googly** (funny): a fuzzy monster in huge trainers whose googly eyes run on real physics.
- The style cards in Settings are grouped into 3D scenes and styles drawn without three.js, each with a badge for how it's drawn (and which ones are funny).
- On a phone, the floating style switcher shows ‹ name › instead of fifteen numbers.

### Changed
- **Athlete is now the default style and comes first**; Mannequin is number 2. If you already picked a style, you keep it. Every exercise without styles still shows the mannequin.

## [1.6.0] - 2026-10-15

### Added
- **Animation styles (a test)**: nine ways to draw the exercise animation, for now only on Zone 2 ("Easy step-ups or marching"); every other exercise keeps the mannequin. Mannequin, Athlete (semi-realistic), Anime (cel-shaded), Low poly, Cartoon (ink outlines) and Voxel are three.js scenes; Pictogram (SVG), Ink brush (2D canvas) and ASCII (text) are drawn without three.js. All of them play the same movement.
- **Settings → Animation style**: a live preview of Zone 2, a card with a still of each style, and **Try styles live**, which opens Zone 2 with a numbered switcher at the top of the screen, like the theme switcher. Both switchers can be open at once.
- `/dev/animations.html` takes `&style=` to draw the keyframes in an animation style.

## [1.5.0] - 2026-10-15

### Changed
- **Your training level alone now sets the workouts.** Each of the four levels (New to training, Returning, Active, Well trained) has its own sets, reps, intervals and Zone 2 minutes; nothing moves on by itself. Your weight, sex and age still scale the suggested weights.
- Choosing the level in Settings now uses the same chips as setup, with what the level means and when to move up or step down.
- Today, This week, the guided workout, Progress, the exercise pages and The plan show your level instead of a phase; The plan and each exercise compare all four levels.
- Days you already logged keep the level they were done at.
- Your data keeps working: if you were past Re-entry, your level is set to match what you were doing (Build → Active, Blueprint → Well trained), and older logged days show the matching level.

### Added
- A new, gentler set of workouts for New to training: supported or smaller-range moves, 1–2 sets, no jumps, swings or Nordics, shorter intervals and Zone 2.

### Removed
- Phases (Re-entry, Build, Blueprint), their automatic advance after 12 and 24 sessions, the phase lock and the starting-phase setting.

## [1.4.0] - 2026-10-15

### Added
- **Try themes live** in Settings → Appearance: opens Today with a small switcher floating at the top of the screen, one letter per theme (A Original to G Course). Hover a letter to see its name, keep using any page while you compare, and close it with × (or Escape). It stays open across pages and reloads until you close it.

## [1.3.0] - 2026-10-15

### Added
- Setup has a new **Accessories** step: what you need at home (dumbbells, pull-up bar, bands, mat, slant board, step or box, Nordic anchor), each shown in a 3D example exercise.
- Changing your training level in Settings now switches you to that level's workouts: weights rescale and your phase restarts from the level's starting point.

### Changed
- Setup no longer asks you to pick a starting phase: your training level decides it. "Well trained" now starts in Blueprint (was Build).
- The four training levels sit on one row in setup (two rows on a phone), with a note that you can change your level any time.
- New default values in setup (age 30, 70 kg, 170 cm, "Prefer not to say", New to training, 20 kg heaviest dumbbell) instead of one person's details.

## [1.2.0] - 2026-10-15

### Added
- Six new themes besides the original look, each with its own layout, type and colours: Chapters and Dark room (after the taste-skill design guide), Pulse and Lab (after ui-ux-pro-max), Olympia and Course (after impeccable).
- A theme step in the first-run setup, and a theme picker in Settings → Appearance; the look changes as you click.
- Olympia colours the header, hero and 3D floor by the kind of session you're viewing; Course opens an exercise in place under its row.
- The 3D scenes and exercise thumbnails take the theme's colours.
- `docs/THEMES.md`: how the themes work and how to add one.

### Changed
- Switching light/dark in Settings now also recolours an open 3D scene straight away.
- Setup has a new Theme step right after Welcome.

### Fixed
- The server reported version 1.0.0 (in `/api/info` and server exports) whatever the release; it now reads the version from `package.json`.

## [1.0.2] - 2026-10-15

### Changed
- `AGENTS.md`: agents no longer create git tags or GitHub releases; they only bump the version and update this changelog.

## [1.0.1] - 2026-10-15

### Added
- `AGENTS.md`: the rules every AI agent working on this repo must follow (versioning, changelog and releases, committing straight to `main`).
- This changelog.

## [1.0.0] - 2026-10-15

### Added
- First version of Home Protocol: a local, Bryan Johnson–inspired six-day home workout planner and tracker, with 3D exercise animations, video demos, auto-saved tracking, progress charts and an optional posture add-on.
