# Changelog

All notable changes to this project are listed here, newest first.
Versions follow [Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`).

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
