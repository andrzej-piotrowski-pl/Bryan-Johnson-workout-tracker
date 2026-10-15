# AGENTS.md

Rules for every AI agent working in this repository (Claude, Codex, Copilot, Cursor, and others).
Read this file before making changes, and follow it for the whole session.

## Versioning and releases

The project uses [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- **MAJOR**: a breaking change, such as a change to the format of files in `data/` that old data can't be read with, a removed feature, or a change to how the app is installed or run.
- **MINOR**: a new feature or add-on that is backwards compatible, such as a new exercise, view, tracker field or setting.
- **PATCH**: a bug fix, a copy or style tweak, a docs change or a dependency bump that changes no behaviour.

Pick the bump from the largest change in the release. The current version is the `version` field in `package.json`.

## Every change that reaches `main`

Each time a change is committed and pushed to `main`:

1. **Bump the version** in `package.json` (and in `package-lock.json`, with `npm version <major|minor|patch> --no-git-tag-version`).
2. **Update `CHANGELOG.md`** in the repo root. Create it if it doesn't exist. Add a section for the new version at the top, in this format:

   ```markdown
   ## [1.2.0] - 2026-10-15

   ### Added
   - Short explanation of the new thing, from the user's point of view.

   ### Changed
   - ...

   ### Fixed
   - ...
   ```

   Use only the headings you need (`Added`, `Changed`, `Fixed`, `Removed`). Keep each line short and say what changed for the user, not which files moved.
3. **Commit** the version bump and the changelog together with the change (or as the last commit before the push).
4. **Tag and release**: create the tag `vMAJOR.MINOR.PATCH` on that commit, push it (`git push origin vX.Y.Z`), and create a GitHub release with that tag as its name and that version's changelog section as its notes.
   If your tools can't create a GitHub release, push the tag and tell the user that the release still has to be published from it.

Never reuse or move an existing tag. If a release was wrong, fix it in a new patch release.

## Branches and pull requests

- **Never create a pull request.** When the user asks for a change, commit it and push it directly to `main`.
- **Don't work in branches**, except for a **major** version: build that on a branch and push it to `main` when the user says it's ready. On that branch, keep the changelog entry under `## [Unreleased]`, and when it lands on `main` rename that section to the new version and date, then tag and release as above.
- Never force-push or rewrite published history.

## The project

- Read `README.md` first; `docs/PLAN.md` explains the workout plan and `docs/ANIMATIONS.md` the 3D animation system.
- The app is a local Node server (`server.js`, no dependencies) serving a vanilla JS front end in `public/`. Keep it that way: no frameworks, build steps or new runtime dependencies without asking the user.
- Run `npm start` and check the change in the browser (http://localhost:3030) before you commit it.
- `data/` holds the user's personal profile and logs. Never commit it, never delete or rewrite it, and keep new code able to read data saved by older versions.
- Update `README.md` and the screenshots in `docs/screenshots/` when a change makes them out of date.

## General

- Match the style of the surrounding code: naming, comments, formatting.
- Keep each change focused on what was asked. Note unrelated problems for the user instead of fixing them along the way.
- Report what you actually did. If something was skipped, failed or wasn't tested, say so.
- Never commit secrets, API keys or personal data.
