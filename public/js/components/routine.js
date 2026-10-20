import { MOVEMENTS } from "../data/movements.js";
import { EXERCISES } from "../data/exercises.js";
import { DYNAMIC_MOVES, INTERVAL_MOVES, intervalPhases } from "../data/routines.js";
import { rxFor, timerPresets } from "../plan.js";
import { esc } from "../util.js";

export function routineSteps(item, level, log = {}) {
  if (item.ex === "dynamic") return DYNAMIC_MOVES.map((ex) => ({ ex, dose: "Once through" }));
  if (item.ex === "indoorhiit") return INTERVAL_MOVES.map((ex) => ({ ex, dose: "Choose for a work interval" }));
  const presets = timerPresets(item, level);
  const preset = presets[log.preset || 0] || presets[0];
  if (!preset) return Object.entries(MOVEMENTS).filter(([, movement]) => movement.source === item.ex).map(([ex]) => ({ ex, dose: "Choose the version prescribed in your workout" }));
  return intervalPhases(item.ex, preset, log.moves).filter((phase) => phase.ex).map((phase) => ({ ...phase, dose: `${phase.sec} s · ${phase.label}` }));
}

export function routineHtml(item, level, log, { compact = false } = {}) {
  let steps = routineSteps(item, level, log);
  if (compact) {
    const grouped = new Map();
    for (const step of steps) {
      const key = JSON.stringify([step.ex, step.sec, step.kind, step.kind === "rest" ? step.label : ""]);
      const entry = grouped.get(key);
      if (entry) entry.count += 1;
      else grouped.set(key, { ...step, count: 1 });
    }
    steps = [...grouped.values()].map((step) => ({ ...step, dose: step.sec ? `${step.count} × ${step.sec} s${step.kind === "rest" ? ` · ${step.label}` : ""}` : step.dose }));
  }
  if (!steps.length) return "";
  return `<div class="routine"><h4>Movement steps</h4><ol class="routine-steps${compact ? " routine-compact" : ""}">${steps.map((step) => `<li><button type="button" class="btn sm" data-movement="${esc(step.ex)}">${esc(EXERCISES[step.ex].name)}</button><span class="muted">${esc(step.dose)}</span><a href="#/library/${step.ex}" aria-label="Instructions for ${esc(EXERCISES[step.ex].name)}">Details</a></li>`).join("")}</ol></div>`;
}

export function alternativeHtml(item, level) {
  const alternative = item?.alternative;
  const rx = alternative && rxFor(alternative, level);
  return rx && rx !== "—" ? `<p class="muted">Optional replacement: <a href="#/library/${alternative.ex}">${esc(EXERCISES[alternative.ex].name)}</a>, ${esc(rx)}. Do this instead of the hang.</p>` : "";
}
