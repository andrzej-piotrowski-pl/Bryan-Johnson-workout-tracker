// Guided workout: one exercise at a time, full screen — the animation, today's
// dose, the logger and the how-to — then "Done, next". Add-ons come last.

import { EXERCISES } from "../data/exercises.js";
import { state } from "../store.js";
import { addonsForDate, blockItems, countable, dayDef, levelFor, rxFor, sessionKeyFor, visible } from "../plan.js";
import { personalize } from "../personalize.js";
import { esc, h } from "../util.js";
import { icon } from "../components/icons.js";
import { createStagePanel } from "../components/stage-panel.js";
import { editItem, getItemLog, renderLogger } from "../components/logger.js";
import { exerciseInfoHtml } from "../components/exercise-panel.js";
import { renderVideos, videoGroupsFor, videosFor } from "../components/video.js";
import { mountLevelCheck } from "../components/level-check.js";
import { pauseDesk, resumeDesk } from "../components/desk.js";
import { stopRest } from "../components/timer.js";
import { createWorkoutRadio } from "../components/radio.js";

function buildSteps(date) {
  const level = levelFor(date);
  const log = state.days[date];
  const steps = [];
  const skipped = (scope, id) => {
    const l = getItemLog(date, scope, id);
    return !!(l && l.skipped);
  };
  const def = dayDef(sessionKeyFor(date));
  if (def) for (const b of def.blocks) for (const it of blockItems(b, level)) if (countable(it) && !skipped("main", it.id)) steps.push({ scope: "main", block: b.name, item: it, level });
  for (const a of addonsForDate(date)) {
    if (log && log.addons && log.addons[a.addon.id] && log.addons[a.addon.id].skipped) continue;
    for (const it of a.variant.items) if (visible(it, level) && countable(it) && !skipped(a.addon.id, it.id)) steps.push({ scope: a.addon.id, block: a.addon.name, item: it, level });
  }
  return steps;
}

export function startGuided(date, onExit) {
  const steps = buildSteps(date);
  if (!steps.length) return;
  // Desk breaks stay quiet while the guided workout is open.
  pauseDesk("guided");
  let i = steps.findIndex((s) => !(getItemLog(date, s.scope, s.item.id) || {}).done);
  if (i < 0) i = 0;
  const wrap = h(`<div class="guided" role="dialog" aria-modal="true" aria-label="Guided workout">
    <div class="guided-top">
      <button type="button" class="btn sm ghost" data-g="close">${icon("x")} Exit</button>
      <span class="mono muted" data-g="count"></span>
      <div class="bar"><i></i></div>
      <div class="radio-host"></div>
    </div>
    <div class="guided-main"><div class="stage-host"></div><div class="guided-side"></div></div>
    <div class="guided-bottom">
      <button type="button" class="btn" data-g="prev">${icon("chevronL")} Back</button>
      <button type="button" class="btn ghost" data-g="skip">Skip ${icon("skip", "sm")}</button>
      <button type="button" class="btn primary" data-g="next">${icon("check")} Done, next</button>
    </div>
  </div>`);
  document.getElementById("overlay-root").appendChild(wrap);
  document.body.style.overflow = "hidden";
  let videoCtrl = null;
  const stage = createStagePanel(wrap.querySelector(".stage-host"), {
    onClipChange: ({ clipIndex, manual }) => {
      if (videoCtrl) videoCtrl.setGroup(clipIndex, { manual });
    },
  });
  const side = wrap.querySelector(".guided-side");
  const bar = wrap.querySelector(".bar i");
  const count = wrap.querySelector('[data-g="count"]');
  const radio = createWorkoutRadio();
  wrap.querySelector(".radio-host").appendChild(radio.el);

  function finishScreen() {
    const done = steps.filter((s) => (getItemLog(date, s.scope, s.item.id) || {}).done).length;
    stage.pause();
    side.innerHTML = `<span class="eyebrow">Finished</span><h2 class="display" style="font-size:2.2rem">Workout complete</h2>
      <p>${done} of ${steps.length} exercises done. You can record how it felt in the day's notes.</p>
      <div class="btn-row"><button type="button" class="btn primary" data-g="close">${icon("check")} Back to the day</button></div>
      <div data-level-check-host></div>`;
    bar.style.width = "100%";
    count.textContent = `${steps.length}/${steps.length}`;
    wrap.querySelector(".guided-bottom").hidden = true;
    const lcHost = side.querySelector("[data-level-check-host]");
    if (lcHost) mountLevelCheck(lcHost, { compact: true, showStepDown: false });
  }

  function show() {
    if (i >= steps.length) return finishScreen();
    wrap.querySelector(".guided-bottom").hidden = false;
    const s = steps[i];
    const ex = EXERCISES[s.item.ex];
    const p = state.profile;
    stage.load(s.item.ex);
    bar.style.width = `${(i / steps.length) * 100}%`;
    count.textContent = `${i + 1}/${steps.length}`;
    const itemLog = getItemLog(date, s.scope, s.item.id);
    side.innerHTML = `
      <span class="eyebrow">${esc(s.block)}</span>
      <h2 class="display" style="font-size:2.1rem;line-height:1">${esc(s.item.label ? personalize(s.item.label, p) : ex.name)}</h2>
      <div class="rx" style="font-family:var(--font-mono);padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line)">${esc(personalize((itemLog && itemLog.rxOverride) || rxFor(s.item, s.level), p))}</div>
      ${s.item.bryan ? `<span class="chip bryan" style="justify-self:start">${esc(personalize(s.item.bryan, p))}</span>` : ""}
      <div class="logger-host${s.scope !== "main" ? " addon-scope" : ""}"></div>
      <details><summary style="cursor:pointer;font-weight:600">How to do it</summary><div style="margin-top:10px">${exerciseInfoHtml(ex)}</div></details>
      <details><summary style="cursor:pointer;font-weight:600">Videos</summary><div style="margin-top:10px" data-g="videos"></div></details>`;
    renderLogger(side.querySelector(".logger-host"), { date, item: s.item, ex, level: s.level, scope: s.scope });
    videoCtrl = renderVideos(side.querySelector('[data-g="videos"]'), videosFor(ex), {
      groups: videoGroupsFor(ex),
      activeGroup: stage.clipIndex,
      onSelectGroup: (gi) => stage.setClip(gi),
      onSelectVideo: () => stage.setAutoAdvance(false),
      onPlay: () => stage.setAutoAdvance(false),
    });
    wrap.querySelector('[data-g="prev"]').disabled = i === 0;
  }

  function close() {
    stopRest();
    resumeDesk("guided");
    radio.dispose();
    stage.dispose();
    wrap.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (onExit) onExit();
  }

  function onKey(e) {
    if (e.target.closest && e.target.closest("input, textarea, select, .workout-radio")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") {
      i = Math.min(steps.length, i + 1);
      show();
    } else if (e.key === "ArrowLeft") {
      i = Math.max(0, i - 1);
      show();
    }
  }

  wrap.addEventListener("click", (e) => {
    const b = e.target.closest("[data-g]");
    if (!b) return;
    const a = b.dataset.g;
    if (a === "close") close();
    else if (a === "prev") {
      i = Math.max(0, i - 1);
      show();
    } else if (a === "skip") {
      i += 1;
      show();
    } else if (a === "next") {
      if (i >= steps.length) return show();
      const s = steps[i];
      editItem(date, s.scope, s.item, (l) => (l.done = true));
      i += 1;
      show();
    }
  });
  document.addEventListener("keydown", onKey);
  show();
}
