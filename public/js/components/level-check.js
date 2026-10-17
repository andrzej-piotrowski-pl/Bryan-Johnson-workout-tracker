// The plan's level check: the session count and the two questions for the
// current level, in a card that can sit at the end of Today, at the end of a
// guided workout, or in Settings. Nothing changes level without a tap.

import { LEVEL_PLANS } from "../data/program.js";
import { state, updateProfile } from "../store.js";
import { currentReadiness } from "../plan.js";
import { LEVELS, levelIndex, personalize } from "../personalize.js";
import { esc } from "../util.js";
import { icon } from "./icons.js";
import { openDialog, ring, toast } from "./ui.js";

function statusText(rd) {
  if (rd.ready) return "Ready to move up";
  if (rd.sessions >= rd.target) return "Checkpoint reached";
  const left = rd.target - rd.sessions;
  return `${left} ${left === 1 ? "session" : "sessions"} to go`;
}

function hintText(rd) {
  if (rd.ready) return "Both checks are true and the session count is met. Move up when you want.";
  if (rd.sessions >= rd.target) return "The session count is met. Tick the two checks that are true for you.";
  return `Keep going: ${rd.target - rd.sessions} more ${rd.target - rd.sessions === 1 ? "session" : "sessions"}${rd.weeks ? ` (about ${rd.weeks} weeks)` : ""} to the checkpoint. Tick the checks when they are true.`;
}

export function levelCheckHtml({ showStepDown = false, compact = false } = {}) {
  const p = state.profile;
  const lvl = levelIndex(p);
  const current = LEVELS[lvl];
  const rd = currentReadiness();

  if (!rd) {
    const prev = lvl > 0 ? LEVELS[lvl - 1] : null;
    return `<section class="card card-pad level-check${compact ? " compact" : ""}" data-level-check>
      <div class="level-check-head">
        <span class="level-check-badge">${icon("check", "lg")}</span>
        <div class="grow">
          <span class="eyebrow">Level check</span>
          <h3>You're on the full plan</h3>
          <p class="muted">Well trained is the top level. After illness, injury or a long break, the plan says step down for a while.</p>
        </div>
        <span class="chip accent">Well trained</span>
      </div>
      ${showStepDown && prev ? `<div class="btn-row"><button type="button" class="btn ghost" data-level-down="${esc(prev.id)}">Step down to ${esc(prev.name)}</button></div>` : ""}
    </section>`;
  }

  const next = LEVELS.find((l) => l.id === rd.next);
  const nextName = next ? next.name : "the next level";
  const reached = rd.sessions >= rd.target;
  const questions = rd.questions
    .map(
      (q) => `<label class="level-check-row">
        <input type="checkbox" data-readiness="${esc(q.id)}" ${rd.checks[q.id] ? "checked" : ""}>
        <span class="level-check-copy"><b>${esc(q.label)}</b>${q.detail ? `<small>${esc(q.detail)}</small>` : ""}</span>
        <span class="level-check-tick" aria-hidden="true">${icon("check", "sm")}</span>
      </label>`
    )
    .join("");

  return `<section class="card card-pad level-check${compact ? " compact" : ""}" data-level-check>
    <div class="level-check-head">
      <div class="level-check-ring">${ring(Math.min(rd.sessions, rd.target), rd.target, compact ? 58 : 72)}</div>
      <div class="grow">
        <span class="eyebrow">Level check · ${esc(current.name)}</span>
        <h3 data-level-title>${rd.ready ? `Ready for ${esc(nextName)}` : `Next level: ${esc(nextName)}`}</h3>
        <p class="muted">${rd.sessions} ${rd.sessions === 1 ? "session" : "sessions"} at ${esc(current.name)} · checkpoint about ${rd.target} sessions${rd.weeks ? ` · about ${rd.weeks} weeks` : ""}.</p>
      </div>
      <span class="chip${rd.ready ? " accent" : ""}" data-level-status>${esc(statusText(rd))}</span>
    </div>
    <div class="level-check-questions">
      <span class="eyebrow">The plan's two checks</span>
      ${questions}
    </div>
    <div class="level-check-foot">
      <p class="muted" data-level-hint>${esc(hintText(rd))}</p>
      <div class="btn-row">
        <button type="button" class="btn primary" data-level-up="${esc(rd.next)}" ${rd.ready ? "" : "disabled"}>Move up to ${esc(nextName)}</button>
        ${showStepDown && lvl > 0 ? `<button type="button" class="btn ghost" data-level-down="${esc(LEVELS[lvl - 1].id)}">Step down to ${esc(LEVELS[lvl - 1].name)}</button>` : ""}
      </div>
    </div>
    <p class="muted level-check-note">Past sessions keep the level they were done at. ${reached && !rd.ready ? "The session count is met; only the two checks are left." : ""}</p>
  </section>`;
}

function applyLevel(id, name, render, onChange) {
  updateProfile((p) => {
    p.level = id;
    p.levelCheck = null;
  });
  toast(`Level set to ${name}. Past logs keep the level they were done at.`);
  if (render) render();
  if (onChange) onChange("level");
}

// A short "what changes" step before the level switches, so Monday is not a
// surprise. It stays a summary of the plan's own notes for the next level.
function confirmMoveUp(apply) {
  const nextIndex = levelIndex(state.profile) + 1;
  const plan = LEVEL_PLANS[nextIndex];
  const nextName = (LEVELS[nextIndex] || {}).name || "the next level";
  const points = (plan && plan.points ? plan.points : []).slice(0, 3);
  const content = document.createElement("div");
  content.style.display = "grid";
  content.style.gap = "12px";
  const p = state.profile;
  content.innerHTML = `<p>${esc(nextName)} keeps the same week but changes the work:</p>
    ${plan && plan.effort ? `<p class="muted">${esc(personalize(plan.effort, p))}</p>` : ""}
    <ul>${points.map((point) => `<li>${esc(personalize(point, p))}</li>`).join("")}</ul>
    <p class="muted">Your past sessions keep the level they were done at.</p>
    <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn" data-move-cancel>Not yet</button><button type="button" class="btn primary" data-move-confirm>Move up to ${esc(nextName)}</button></div>`;
  const d = openDialog({ title: `Move up to ${nextName}?`, content, sheet: false });
  content.addEventListener("click", (e) => {
    if (e.target.closest("[data-move-cancel]")) return d.close();
    if (e.target.closest("[data-move-confirm]")) {
      d.close();
      apply();
    }
  });
}

export function mountLevelCheck(host, { showStepDown = false, compact = false, onChange } = {}) {
  function render() {
    host.innerHTML = levelCheckHtml({ showStepDown, compact });
  }

  render();
  host.addEventListener("change", (e) => {
    if (!e.target.matches("[data-readiness]")) return;
    const checks = {};
    host.querySelectorAll("[data-readiness]").forEach((c) => (checks[c.dataset.readiness] = c.checked));
    const rd = currentReadiness();
    // Silent: only this card needs to react, so the page keeps focus and scroll.
    updateProfile((p) => {
      p.levelCheck = { ...(p.levelCheck || {}), level: rd ? rd.plan.id : p.level, checks };
    }, { silent: true });
    if (!rd) return;
    const ready = rd.sessions >= rd.target && rd.questions.every((q) => checks[q.id]);
    const next = LEVELS.find((l) => l.id === rd.next);
    const card = host.querySelector("[data-level-check]");
    const status = card && card.querySelector("[data-level-status]");
    const title = card && card.querySelector("[data-level-title]");
    const hint = card && card.querySelector("[data-level-hint]");
    const up = card && card.querySelector("[data-level-up]");
    if (status) {
      status.className = `chip${ready ? " accent" : ""}`;
      status.textContent = ready ? "Ready to move up" : rd.sessions >= rd.target ? "Checkpoint reached" : `${rd.target - rd.sessions} ${rd.target - rd.sessions === 1 ? "session" : "sessions"} to go`;
    }
    if (title) title.textContent = ready ? `Ready for ${next ? next.name : "the next level"}` : `Next level: ${next ? next.name : "the next level"}`;
    if (hint) hint.textContent = ready ? "Both checks are true and the session count is met. Move up when you want." : rd.sessions >= rd.target ? "The session count is met. Tick the two checks that are true for you." : `Keep going: ${rd.target - rd.sessions} more ${rd.target - rd.sessions === 1 ? "session" : "sessions"} to the checkpoint. Tick the checks when they are true.`;
    if (up) up.disabled = !ready;
    if (onChange) onChange("check");
  });

  host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-level-up], [data-level-down]");
    if (!b) return;
    // The host pages have their own level buttons; handle this one here only.
    e.stopPropagation();
    if (b.dataset.levelUp) {
      confirmMoveUp(() => applyLevel(b.dataset.levelUp, (LEVELS.find((l) => l.id === b.dataset.levelUp) || {}).name || b.dataset.levelUp, render, onChange));
      return;
    }
    const id = b.dataset.levelDown;
    if (!id) return;
    const name = (LEVELS.find((l) => l.id === id) || {}).name || id;
    applyLevel(id, name, render, onChange);
  });
}
