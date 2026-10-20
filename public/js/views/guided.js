// Guided workout: one exercise at a time, full screen — the animation, today's
// dose, the logger and the how-to — then "Done, next". Add-ons come last.

import { orderedSteps } from "../components/workout-steps.js";
import { alternativeHtml, routineHtml, routineSteps } from "../components/routine.js";
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
import { onRest, onTimer, stopRest } from "../components/timer.js";
import { createWorkoutRadio } from "../components/radio.js";
import { createCoachControls } from "../components/coach-controls.js";
import { createGuidedVoice } from "../voice/session.js";
import { unlockVoice, videoVoice } from "../voice/player.js";

function buildSteps(date) {
  const level = levelFor(date);
  const log = state.days[date];
  const steps = [];
  const skipped = (scope, id) => {
    const l = getItemLog(date, scope, id);
    return !!(l && l.skipped);
  };
  const def = dayDef(sessionKeyFor(date));
  if (def) for (const b of def.blocks) for (const step of orderedSteps(blockItems(b, level).filter((it) => countable(it) && !skipped("main", it.id)), level)) steps.push({ scope: "main", block: b.name, ...step, level });
  for (const a of addonsForDate(date)) {
    if (log && log.addons && log.addons[a.addon.id] && log.addons[a.addon.id].skipped) continue;
    for (const step of orderedSteps(a.variant.items.filter((it) => visible(it, level) && countable(it) && !skipped(a.addon.id, it.id)), level)) steps.push({ scope: a.addon.id, block: a.addon.name, ...step, level });
  }
  return steps;
}

function stepDone(date, step) {
  const log = getItemLog(date, step.scope, step.item.id);
  return step.setIndex == null ? !!log?.done : !!log?.done || !!log?.completedSets?.[step.setIndex];
}

export function startGuided(date, onExit) {
  unlockVoice();
  const steps = buildSteps(date);
  if (!steps.length) return;
  // Desk breaks stay quiet while the guided workout is open.
  pauseDesk("guided");
  let i = steps.findIndex((s) => !stepDone(date, s));
  if (i < 0) i = 0;
  const wrap = h(`<div class="guided" role="dialog" aria-modal="true" aria-label="Guided workout">
    <div class="guided-top">
      <button type="button" class="btn sm ghost" data-g="close">${icon("x")} Exit</button>
      <span class="mono muted" data-g="count"></span>
      <div class="bar"><i></i></div>
      <div class="radio-host"></div>
    </div>
    <div class="guided-main"><div class="guided-demo"><div class="stage-host"></div><div data-routine></div></div><div><p class="guided-voice-status muted" role="status" aria-live="polite"></p><div class="guided-side"></div></div></div>
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
  const voice = createGuidedVoice(date, steps, wrap.querySelector(".guided-voice-status"));
  const stopRestListener = onRest((event) => voice.rest(event));
  const stopTimerListener = onTimer((open) => voice.timer(open));
  const coach = createCoachControls({ popup: true, onChange: () => voice.enter(i) });
  wrap.querySelector(".radio-host").append(radio.el, coach.el);
  wrap.addEventListener("input", () => voice.input());

  function finishScreen() {
    stopRest(); voice.finish();
    const done = steps.filter((s) => stepDone(date, s)).length;
    stage.pause();
    wrap.querySelector("[data-routine]").innerHTML = "";
    side.innerHTML = `<span class="eyebrow">Finished</span><h2 class="display" style="font-size:2.2rem">Workout complete</h2>
      <p>${done} of ${steps.length} steps done. You can record how it felt in the day's notes.</p>
      <div class="btn-row"><button type="button" class="btn primary" data-g="close">${icon("check")} Back to the day</button></div>
      <div data-level-check-host></div>`;
    bar.style.width = "100%";
    count.textContent = `${steps.length}/${steps.length}`;
    wrap.querySelector(".guided-bottom").hidden = true;
    const lcHost = side.querySelector("[data-level-check-host]");
    if (lcHost) mountLevelCheck(lcHost, { compact: true, showStepDown: false });
  }

  function show(reason = "next") {
    stopRest();
    if (i >= steps.length) return finishScreen();
    wrap.querySelector(".guided-bottom").hidden = false;
    const s = steps[i];
    const ex = EXERCISES[s.item.ex];
    const p = state.profile;
    const demoId = routineSteps(s.item, s.level, getItemLog(date, s.scope, s.item.id) || {})[0]?.ex || s.item.ex;
    const demo = EXERCISES[demoId];
    stage.load(demoId);
    bar.style.width = `${(i / steps.length) * 100}%`;
    count.textContent = `${i + 1}/${steps.length}`;
    const itemLog = getItemLog(date, s.scope, s.item.id);
    wrap.querySelector("[data-routine]").innerHTML = ex.routine ? routineHtml(s.item, s.level, itemLog || {}, { compact: true }) : "";
    side.innerHTML = `
      <span class="eyebrow">${esc(s.item.group || s.block)}${s.round ? ` · Round ${s.round} of ${s.rounds}` : ""}</span>
      <h2 class="display" style="font-size:2.1rem;line-height:1">${esc(s.item.label ? personalize(s.item.label, p) : ex.name)}</h2>
      <div class="rx" style="font-family:var(--font-mono);padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line)">${esc(personalize((itemLog && itemLog.rxOverride) || rxFor(s.item, s.level), p))}</div>
      ${s.item.bryan ? `<span class="chip bryan" style="justify-self:start">${esc(personalize(s.item.bryan, p))}</span>` : ""}
      ${s.setIndex != null ? `<p class="muted">Complete set ${s.setIndex + 1} of ${s.sets}, then continue to the next movement.</p>` : ""}
      ${alternativeHtml(s.item, s.level)}
      <div class="logger-host${s.scope !== "main" ? " addon-scope" : ""}"></div>
      <details><summary style="cursor:pointer;font-weight:600">How to do it</summary><div style="margin-top:10px">${exerciseInfoHtml(ex)}</div></details>
      <details><summary style="cursor:pointer;font-weight:600">Videos</summary><div style="margin-top:10px" data-g="videos"></div></details>`;
    renderLogger(side.querySelector(".logger-host"), { date, item: s.item, ex, level: s.level, scope: s.scope, setIndex: s.setIndex, onDraw: (log) => { const host = wrap.querySelector("[data-routine]"); if (host) host.innerHTML = ex.routine ? routineHtml(s.item, s.level, log, { compact: true }) : ""; voice.changed(); } });
    videoCtrl = renderVideos(side.querySelector('[data-g="videos"]'), videosFor(demo), {
      groups: videoGroupsFor(demo),
      activeGroup: stage.clipIndex,
      onSelectGroup: (gi) => stage.setClip(gi),
      onSelectVideo: () => { stage.setAutoAdvance(false); videoVoice(true); },
      onPlay: () => { stage.setAutoAdvance(false); videoVoice(true); },
    });
    wrap.querySelector('[data-g="prev"]').disabled = i === 0;
    voice.enter(i, reason);
  }

  function close() {
    stopRest();
    stopRestListener(); stopTimerListener(); voice.dispose(); coach.dispose();
    resumeDesk("guided");
    radio.dispose();
    stage.dispose();
    wrap.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (onExit) onExit();
  }

  function onKey(e) {
    if (document.querySelector("#overlay-root > .overlay")) return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.key === "Escape") close();
    else if (e.target.closest && e.target.closest(".workout-radio, .workout-coach")) return;
    else if (e.key === "ArrowRight") {
      i = Math.min(steps.length, i + 1);
      show();
    } else if (e.key === "ArrowLeft") {
      i = Math.max(0, i - 1);
      show("back");
    }
  }

  wrap.addEventListener("click", (e) => {
    const movement = e.target.closest("[data-movement]");
    if (movement) {
      stage.load(movement.dataset.movement);
      videoVoice(true);
      videoCtrl = renderVideos(side.querySelector('[data-g="videos"]'), videosFor(EXERCISES[movement.dataset.movement]), { onPlay: () => videoVoice(true), onSelectVideo: () => videoVoice(true) });
      return;
    }
    const b = e.target.closest("[data-g]");
    if (!b) return;
    const a = b.dataset.g;
    if (a === "close") close();
    else if (a === "prev") {
      i = Math.max(0, i - 1);
      show("back");
    } else if (a === "skip") {
      i += 1;
      show();
    } else if (a === "next") {
      if (i >= steps.length) return show();
      const s = steps[i];
      editItem(date, s.scope, s.item, (l) => {
        if (s.setIndex == null) l.done = true;
        else {
          l.completedSets = l.completedSets || [];
          l.completedSets[s.setIndex] = true;
          l.done = Array.from({ length: s.sets }, (_, index) => l.completedSets[index]).every(Boolean);
        }
      });
      i += 1;
      show();
    }
  });
  document.addEventListener("keydown", onKey);
  show();
}
