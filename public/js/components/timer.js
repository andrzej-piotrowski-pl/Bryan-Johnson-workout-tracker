// Workout timers: interval timer (20 s bursts, Norwegian 4×4), hold timer
// (planks, stretches), countdown for Zone 2 blocks, and a floating rest timer.
// Beeps with Web Audio, vibrates on phones, keeps the screen awake while running.

import { state } from "../store.js";
import { fmtSecs } from "../util.js";
import { icon } from "./icons.js";
import { openDialog } from "./ui.js";

let audio = null;
export function beep(freq = 880, ms = 120, vol = 0.18) {
  if (state.profile && state.profile.settings && state.profile.settings.sound === false) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g).connect(audio.destination);
    const t = audio.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  } catch {
    /* sound is optional */
  }
}
const buzz = (p) => navigator.vibrate && navigator.vibrate(p);

async function wake() {
  try {
    return navigator.wakeLock ? await navigator.wakeLock.request("screen") : null;
  } catch {
    return null;
  }
}

// phases: [{ kind: "work" | "rest" | "ready", label, sec, sub }]
function runPhases({ title, phases, onFinish }) {
  const R = 120;
  const C = 2 * Math.PI * R;
  const d = openDialog({
    title,
    sheet: false,
    content: `<div class="timer" data-kind="ready">
        <div class="timer-ring"><svg viewBox="0 0 280 280"><circle class="bg" cx="140" cy="140" r="${R}"/><circle class="fg" cx="140" cy="140" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="timer-center"><span class="phase"></span><span class="big mono">0:00</span><span class="sub"></span></div></div>
        <div class="btn-row"><button class="btn" data-t="pause">${icon("pause")} Pause</button><button class="btn" data-t="skip">${icon("skip")} Next</button><button class="btn danger" data-t="stop">${icon("x")} Stop</button></div>
        <p class="muted" data-t="info" style="text-align:center"></p>
      </div>`,
    onClose: () => stop(false),
  });
  const el = d.el.querySelector(".timer");
  const fg = el.querySelector(".fg");
  const phaseEl = el.querySelector(".phase");
  const big = el.querySelector(".big");
  const sub = el.querySelector(".sub");
  const info = el.querySelector('[data-t="info"]');
  let i = 0;
  let left = phases[0].sec;
  let paused = false;
  let timer = null;
  let lock = null;
  let lastWhole = null;
  let finished = false;
  const workDone = () => phases.slice(0, i).filter((p) => p.kind === "work").length;
  wake().then((l) => (lock = l));

  function show() {
    const p = phases[i];
    el.dataset.kind = p.kind;
    phaseEl.textContent = p.label;
    big.textContent = fmtSecs(Math.ceil(left));
    sub.textContent = p.sub || "";
    fg.setAttribute("stroke-dashoffset", String(C * (1 - left / p.sec)));
    const totalWork = phases.filter((x) => x.kind === "work").length;
    info.textContent = totalWork > 1 ? `Interval ${Math.min(workDone() + (p.kind === "work" ? 1 : 0), totalWork)} of ${totalWork}` : "";
  }
  function next() {
    i += 1;
    if (i >= phases.length) return finish();
    left = phases[i].sec;
    beep(phases[i].kind === "work" ? 1040 : 620, 320, 0.22);
    buzz(phases[i].kind === "work" ? [180, 80, 180] : 300);
    show();
  }
  function tick() {
    if (paused) return;
    left -= 0.1;
    const whole = Math.ceil(left);
    if (whole !== lastWhole && whole <= 3 && whole > 0) beep(780, 90);
    lastWhole = whole;
    if (left <= 0) next();
    else show();
  }
  function finish() {
    finished = true;
    clearInterval(timer);
    beep(1320, 500, 0.25);
    buzz([200, 100, 200, 100, 400]);
    el.dataset.kind = "done";
    phaseEl.textContent = "Done";
    big.textContent = "✓";
    sub.textContent = "";
    fg.setAttribute("stroke-dashoffset", "0");
    el.querySelector(".btn-row").innerHTML = `<button class="btn primary" data-t="close">${icon("check")} Log it</button>`;
    if (onFinish) onFinish(phases.filter((p) => p.kind === "work").length);
  }
  function stop(close = true) {
    clearInterval(timer);
    if (lock) lock.release().catch(() => {});
    if (!finished && onFinish && workDone() > 0) onFinish(workDone(), true);
    finished = true;
    if (close) d.close();
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (!b) return;
    if (b.dataset.t === "pause") {
      paused = !paused;
      b.innerHTML = paused ? `${icon("play")} Resume` : `${icon("pause")} Pause`;
    } else if (b.dataset.t === "skip") next();
    else if (b.dataset.t === "stop" || b.dataset.t === "close") stop(true);
  });
  beep(660, 160);
  show();
  timer = setInterval(tick, 100);
}

// Interval timer from a preset: { rounds, work, rest, blocks?, blockRest?, workHr?, restHr? }
export function startIntervals({ title, preset, hr, onFinish }) {
  const phases = [{ kind: "ready", label: "Get ready", sec: 10, sub: "First interval starts soon" }];
  const blocks = preset.blocks || 1;
  for (let b = 0; b < blocks; b++) {
    for (let r = 0; r < preset.rounds; r++) {
      phases.push({ kind: "work", label: "Work", sec: preset.work, sub: hr && hr.work ? `Aim for ${hr.work}` : "Hard" });
      const lastRound = r === preset.rounds - 1;
      if (!lastRound) phases.push({ kind: "rest", label: "Easy", sec: preset.rest, sub: hr && hr.rest ? `Recover at ${hr.rest}` : "Keep moving gently" });
    }
    if (b < blocks - 1) phases.push({ kind: "rest", label: "Block rest", sec: preset.blockRest || 180, sub: "Walk around, breathe" });
  }
  runPhases({ title, phases, onFinish });
}

// Hold timer: seconds per side, optionally both sides with a short switch.
export function startHold({ title, seconds, sides = 1, onFinish }) {
  const phases = [{ kind: "ready", label: "Get set", sec: 5 }];
  for (let s = 0; s < sides; s++) {
    phases.push({ kind: "work", label: sides > 1 ? (s === 0 ? "First side" : "Other side") : "Hold", sec: seconds, sub: "Breathe slowly" });
    if (s < sides - 1) phases.push({ kind: "rest", label: "Switch", sec: 5 });
  }
  runPhases({ title, phases, onFinish });
}

export function startCountdown({ title, minutes, sub, onFinish }) {
  runPhases({ title, phases: [{ kind: "ready", label: "Get ready", sec: 5 }, { kind: "work", label: "Go", sec: Math.round(minutes * 60), sub }], onFinish });
}

// Floating rest timer after a set. Tap it to dismiss.
let restEl = null;
let restTimer = null;
export function startRest(seconds) {
  stopRest();
  let left = seconds;
  restEl = document.createElement("div");
  restEl.className = "rest-pill";
  restEl.setAttribute("role", "timer");
  restEl.innerHTML = `${icon("timer")}<span>Rest</span><b class="mono">${fmtSecs(left)}</b><button class="btn sm" data-r="add">+15 s</button><button class="btn sm icon-only" data-r="x" aria-label="Dismiss rest timer">${icon("x", "sm")}</button>`;
  document.body.appendChild(restEl);
  const out = restEl.querySelector("b");
  restEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-r]");
    if (!b) return;
    if (b.dataset.r === "add") left += 15;
    else stopRest();
  });
  restTimer = setInterval(() => {
    left -= 1;
    if (left <= 3 && left > 0) beep(780, 90);
    if (left <= 0) {
      beep(1040, 350, 0.22);
      buzz([150, 80, 150]);
      stopRest();
      return;
    }
    out.textContent = fmtSecs(left);
  }, 1000);
}
export function stopRest() {
  clearInterval(restTimer);
  if (restEl) restEl.remove();
  restEl = null;
}

