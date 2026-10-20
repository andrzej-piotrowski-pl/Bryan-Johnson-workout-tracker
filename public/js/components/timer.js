// Workout timers: interval timer (20 s bursts, Norwegian 4×4), hold timer
// (planks, stretches), countdown for Zone 2 blocks, and a floating rest timer.
// Beeps with Web Audio, vibrates on phones, keeps the screen awake while running.

import { EXERCISES } from "../data/exercises.js";
import { intervalPhases } from "../data/routines.js";
import { createStagePanel } from "./stage-panel.js";
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

export function speak(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const p = state.profile;
  if (p && p.settings && (p.settings.sound === false || p.settings.voiceCoach === false)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.04;
    u.pitch = 1.0;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  } catch {
    /* speech is optional */
  }
}

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
  let voiceOn = !(state.profile && state.profile.settings && state.profile.settings.voiceCoach === false);
  const d = openDialog({
    title,
    sheet: false,
    content: `<div class="timer" data-kind="ready">
        <div class="timer-ring"><svg viewBox="0 0 280 280"><circle class="bg" cx="140" cy="140" r="${R}"/><circle class="fg" cx="140" cy="140" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="timer-center"><span class="phase"></span><span class="big mono">0:00</span><span class="sub"></span></div></div>
        <div class="btn-row">
          <button class="btn" data-t="pause">${icon("pause")} Pause</button>
          <button class="btn" data-t="skip">${icon("skip")} Next</button>
          <button class="btn sm ghost" data-t="voice" aria-label="Toggle voice coach">${icon(voiceOn ? "volume" : "mute", "sm")} ${voiceOn ? "Voice on" : "Voice off"}</button>
          <button class="btn danger" data-t="stop">${icon("x")} Stop</button>
        </div>
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
  let lastSpokenPhase = -1;
  let spokenHalfway = false;
  let spokenThirty = false;
  let spokenTen = false;
  const isRoundEnd = (p) => p.kind === "work" && p.roundEnd !== false;
  const workDone = () => phases.slice(0, i).filter(isRoundEnd).length;
  const stageHost = document.createElement("div");
  let stage = null;
  if (phases.some((p) => p.ex)) {
    stageHost.className = "interval-stage";
    el.prepend(stageHost);
    stage = createStagePanel(stageHost);
  }
  wake().then((l) => (lock = l));

  function show() {
    const p = phases[i];
    el.dataset.kind = p.kind;
    phaseEl.textContent = p.ex ? `${p.label}: ${EXERCISES[p.ex].name}` : p.label;
    big.textContent = fmtSecs(Math.ceil(left));
    sub.textContent = p.sub || "";
    fg.setAttribute("stroke-dashoffset", String(C * (1 - left / p.sec)));
    const totalWork = phases.filter(isRoundEnd).length;
    const currentWork = workDone() + (p.kind === "work" ? 1 : 0);
    info.textContent = p.total ? `Round ${p.round} of ${p.total}` : totalWork > 1 ? `Interval ${Math.min(currentWork, totalWork)} of ${totalWork}` : "";

    if (lastSpokenPhase !== i) {
      lastSpokenPhase = i;
      if (p.ex && stage) stage.load(p.ex);
      spokenHalfway = false;
      spokenThirty = false;
      spokenTen = false;
      if (p.kind === "ready") {
        speak(p.sec >= 8 ? "Get ready. First interval starts soon." : "Get ready.");
      } else if (p.kind === "work") {
        if (p.sec <= 30) {
          speak(totalWork > 1 ? `Work! Interval ${currentWork} of ${totalWork}.` : "Work!");
        } else {
          const mins = Math.round(p.sec / 60);
          const hrText = p.sub ? `Target: ${p.sub}.` : "";
          speak(`Work! Interval ${currentWork} of ${totalWork}. ${mins > 1 ? `${mins} minutes. ` : ""}${hrText}`);
        }
      } else if (p.kind === "rest") {
        if (p.sec <= 30) {
          speak("Rest.");
        } else {
          const mins = Math.round(p.sec / 60);
          const hrText = p.sub ? `Target: ${p.sub}.` : "";
          speak(`Recover. ${mins > 1 ? `${mins} minutes. ` : ""}${hrText}`);
        }
      }
    }
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
    const p = phases[i];
    if (p && p.kind === "work") {
      if (p.sec >= 120 && !spokenHalfway && whole === Math.round(p.sec / 2)) {
        spokenHalfway = true;
        speak("Halfway.");
      }
      if (p.sec >= 60 && !spokenThirty && whole === 30) {
        spokenThirty = true;
        speak("30 seconds left.");
      }
    } else if (p && p.kind === "rest") {
      if (p.sec >= 30 && !spokenTen && whole === 10) {
        spokenTen = true;
        speak("10 seconds. Get ready.");
      }
    }
    lastWhole = whole;
    if (left <= 0) next();
    else show();
  }
  function finish() {
    finished = true;
    clearInterval(timer);
    beep(1320, 500, 0.25);
    buzz([200, 100, 200, 100, 400]);
    speak("Intervals complete. Great job!");
    el.dataset.kind = "done";
    phaseEl.textContent = "Done";
    big.textContent = "✓";
    sub.textContent = "";
    fg.setAttribute("stroke-dashoffset", "0");
    el.querySelector(".btn-row").innerHTML = `<button class="btn primary" data-t="close">${icon("check")} Log it</button>`;
    if (stage) { stage.dispose(); stage = null; }
    if (onFinish) onFinish(phases.filter(isRoundEnd).length);
  }
  function stop(close = true) {
    clearInterval(timer);
    if (stage) { stage.dispose(); stage = null; }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
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
      if (paused && typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    } else if (b.dataset.t === "voice") {
      const pr = state.profile;
      if (pr) {
        pr.settings = pr.settings || {};
        pr.settings.voiceCoach = !(pr.settings.voiceCoach !== false);
        voiceOn = pr.settings.voiceCoach !== false;
        b.innerHTML = `${icon(voiceOn ? "volume" : "mute", "sm")} ${voiceOn ? "Voice on" : "Voice off"}`;
        if (!voiceOn && typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
        else if (voiceOn) speak("Voice coach on");
      }
    } else if (b.dataset.t === "skip") next();
    else if (b.dataset.t === "stop" || b.dataset.t === "close") stop(true);
  });
  beep(660, 160);
  show();
  timer = setInterval(tick, 100);
}

// Interval timer from a preset: { rounds, work, rest, blocks?, blockRest?, workHr?, restHr? }
export function startIntervals({ title, preset, hr, exId, moves, onFinish }) {
  const phases = intervalPhases(exId, preset, moves);
  for (const phase of phases) {
    if (phase.kind === "work" && hr?.work) phase.sub = `Aim for ${hr.work}`;
    else if (phase.kind === "rest" && hr?.rest) phase.sub += ` · ${hr.rest}`;
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

