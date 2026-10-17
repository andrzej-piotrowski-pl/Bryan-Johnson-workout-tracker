// The training-level chips used in setup and Settings: one chip per level, then
// what the chosen level means and when to move up or down. Clicks are handled by
// the view (buttons carry data-level).

import { LEVEL_PLANS } from "../data/program.js";
import { LEVELS } from "../personalize.js";
import { esc } from "../util.js";
import { icon } from "./icons.js";

// sessions: completed sessions at the chosen level (Settings), or null (setup).
export function levelPickerHtml(selected, { sessions = null } = {}) {
  const i = Math.max(0, LEVELS.findIndex((l) => l.id === selected));
  const lvl = LEVELS[i];
  const lp = LEVEL_PLANS[i];
  const chips = LEVELS.map(
    (l) => `<button type="button" class="choice" data-level="${l.id}" aria-pressed="${l.id === lvl.id}"><b>${esc(l.name)}</b><small>${esc(l.detail)}</small></button>`
  ).join("");
  const down = i > 0 ? ` If workouts feel too hard or you're returning after a break, you can switch to ${esc(LEVELS[i - 1].name)}.` : "";
  const after =
    sessions != null
      ? `<br><span class="muted">You've completed ${sessions} ${sessions === 1 ? "session" : "sessions"} at this level. Past workouts keep the level you logged them at.</span>`
      : `<br><span class="muted">Change your level in Settings whenever you need easier workouts or feel ready for harder ones.</span>`;
  return `<div class="choice-grid levels" role="group" aria-label="Training level">${chips}</div>
    <p class="level-note">${icon("info")}<span><b>${esc(lvl.name)}:</b> ${esc(lvl.plan)} ${esc(lp.effort)}
      <br><b>When to change:</b> ${esc(lp.moveUp)}${down}${after}</span></p>`;
}
