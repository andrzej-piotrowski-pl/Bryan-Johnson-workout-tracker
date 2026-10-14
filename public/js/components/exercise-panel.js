// Exercise detail: 3D animation, today's dose, the logger, how-to steps and videos.
// One panel instance is reused as you click through exercises (one WebGL context).

import { EXERCISES } from "../data/exercises.js";
import { state } from "../store.js";
import { personalize } from "../personalize.js";
import { esc } from "../util.js";
import { EQUIPMENT_NAMES, icon } from "./icons.js";
import { renderLogger } from "./logger.js";
import { createStagePanel } from "./stage-panel.js";
import { renderVideos, videosFor } from "./video.js";

const MUSCLE_NAMES = {
  quads: "Quads", hamstrings: "Hamstrings", adductors: "Inner thighs", glutes: "Glutes", hips: "Hips", calves: "Calves",
  shins: "Shins", ankles: "Ankles", feet: "Feet", core: "Core", obliques: "Obliques", lowerBack: "Lower back", back: "Back",
  upperBack: "Upper back", chest: "Chest", shoulders: "Shoulders", rotatorCuff: "Rotator cuff", biceps: "Biceps",
  triceps: "Triceps", arms: "Arms", grip: "Grip", neck: "Neck", heart: "Heart & lungs",
};

export function exerciseInfoHtml(ex) {
  const p = state.profile;
  const steps = ex.how.map((s) => `<li>${esc(personalize(s, p))}</li>`).join("");
  return `<div class="how">
      <div class="from-bryan${ex.classic ? " classic" : ""}"><span class="eyebrow">${ex.classic ? "Not Bryan's · classic" : "From Bryan"}</span><p>${esc(personalize(ex.bryan, p))}</p></div>
      <h4>How to do it</h4><ol>${steps}</ol>
      ${ex.tips && ex.tips.length ? `<h4>Tips</h4><ul>${ex.tips.map((s) => `<li>${esc(personalize(s, p))}</li>`).join("")}</ul>` : ""}
      ${ex.easier ? `<h4>Easier version</h4><p>${esc(personalize(ex.easier, p))}</p>` : ""}
    </div>`;
}

export function createExercisePanel(container, { mode = "log" } = {}) {
  container.innerHTML = `<div class="card detail"><div class="stage-host"></div><div class="detail-body"></div></div>`;
  const stage = createStagePanel(container.querySelector(".stage-host"));
  const body = container.querySelector(".detail-body");
  let tab = "how";
  let current = null;

  function drawTab() {
    const host = body.querySelector(".tab-body");
    if (!host || !current) return;
    body.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    const ex = EXERCISES[current.exId];
    if (tab === "videos") {
      host.innerHTML = "";
      renderVideos(host, videosFor(ex));
    } else host.innerHTML = exerciseInfoHtml(ex);
  }

  function show(ctx) {
    const sameExercise = current && current.exId === ctx.exId;
    current = ctx;
    const ex = EXERCISES[ctx.exId];
    if (!ex) return;
    const p = state.profile;
    if (!sameExercise) stage.load(ctx.exId);
    const item = ctx.item;
    const rx = item ? personalize(item.rx[ctx.phase], p) : "";
    const vids = videosFor(ex);
    const bryanCount = vids.filter((v) => v.kind === "bryan").length;
    body.innerHTML = `
      <div style="display:grid;gap:8px">
        <span class="eyebrow">${esc(ex.cat)}${ctx.scopeName ? ` · ${esc(ctx.scopeName)}` : ""}</span>
        <h2>${esc(item && item.label ? personalize(item.label, p) : ex.name)} ${ex.classic ? '<span class="badge-classic">classic</span>' : ""}</h2>
        ${rx ? `<div class="rx">${esc(rx)}</div>` : ""}
        <div class="chips">
          ${item && item.bryan ? `<span class="chip bryan">${esc(personalize(item.bryan, p))}</span>` : ""}
          ${(ex.equipment || []).map((e) => `<span class="chip" title="${esc(EQUIPMENT_NAMES[e] || e)}">${icon(e)} ${esc(EQUIPMENT_NAMES[e] || e)}</span>`).join("")}
          ${(ex.muscles || []).map((m) => `<span class="chip accent">${esc(MUSCLE_NAMES[m] || m)}</span>`).join("")}
        </div>
      </div>
      ${mode === "log" && item && ctx.date ? '<div class="logger-host"></div>' : ""}
      <div class="tabs" role="tablist">
        <button type="button" role="tab" data-tab="how">How to</button>
        <button type="button" role="tab" data-tab="videos">Videos (${vids.length}${bryanCount ? `, ${bryanCount} with Bryan` : ""})</button>
      </div>
      <div class="tab-body" role="tabpanel"></div>`;
    const lh = body.querySelector(".logger-host");
    if (lh) renderLogger(lh, { date: ctx.date, item, ex, phase: ctx.phase, scope: ctx.scope || "main", onChange: ctx.onChange });
    drawTab();
  }

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) {
      tab = b.dataset.tab;
      drawTab();
    }
  });

  return {
    show,
    get current() {
      return current;
    },
    dispose: () => stage.dispose(),
    pause: () => stage.pause(),
  };
}
