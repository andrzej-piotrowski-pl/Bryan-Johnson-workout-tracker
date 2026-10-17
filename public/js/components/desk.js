// Desk mode: Bryan's posture habits for long sitting days — stand and move for
// 2–3 minutes every 30 minutes, and do 10 squats every 45 minutes.
//
// The countdown lives in this tab and is remembered across reloads. Only the
// breaks you tap are written to the day log; nothing here counts as training.

import { state } from "../store.js";
import { addDays, fmtSecs, todayIso } from "../util.js";
import { toast } from "./ui.js";
import { beep } from "./timer.js";

const LS_KEY = "hp:desk";
const MOVE_MS = 30 * 60 * 1000;
const SQUAT_MS = 45 * 60 * 1000;

const listeners = new Set();
let loaded = false;
let ticker = null;
const desk = { running: false, startedAt: 0, nextMoveAt: 0, nextSquatAt: 0, due: new Set(), notified: new Set() };

function save() {
  try {
    if (!desk.running) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, JSON.stringify({ running: true, startedAt: desk.startedAt, nextMoveAt: desk.nextMoveAt, nextSquatAt: desk.nextSquatAt }));
  } catch {}
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const kept = JSON.parse(raw);
    if (!kept || !kept.running) return;
    desk.running = true;
    desk.startedAt = Number(kept.startedAt) || Date.now();
    desk.nextMoveAt = Number(kept.nextMoveAt) || Date.now() + MOVE_MS;
    desk.nextSquatAt = Number(kept.nextSquatAt) || Date.now() + SQUAT_MS;
    startTicker();
  } catch {}
}

function emit() {
  for (const fn of listeners) fn();
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tick, 1000);
}

function tick() {
  if (!desk.running) return;
  const now = Date.now();
  let changed = false;
  for (const [kind, key, wait] of [["move", "nextMoveAt", MOVE_MS], ["squats", "nextSquatAt", SQUAT_MS]]) {
    if (now < desk[key]) continue;
    if (!desk.due.has(kind)) {
      desk.due.add(kind);
      changed = true;
      if (!desk.notified.has(kind)) {
        desk.notified.add(kind);
        toast(kind === "move" ? "Time to stand up and move for 2–3 minutes" : "Time for 10 squats", { icon: "timer", ms: 6000 });
        beep(kind === "move" ? 780 : 880, 250, 0.2);
      }
    }
    desk[key] = now + wait;
  }
  if (changed) {
    save();
    emit();
  }
}

export function deskState() {
  load();
  const now = Date.now();
  return {
    running: desk.running,
    due: [...desk.due],
    nextMoveIn: desk.running ? Math.max(0, Math.round((desk.nextMoveAt - now) / 1000)) : 0,
    nextSquatIn: desk.running ? Math.max(0, Math.round((desk.nextSquatAt - now) / 1000)) : 0,
    nextMoveInText: fmtSecs(desk.running ? Math.max(0, Math.round((desk.nextMoveAt - now) / 1000)) : 0),
    nextSquatInText: fmtSecs(desk.running ? Math.max(0, Math.round((desk.nextSquatAt - now) / 1000)) : 0),
  };
}

export function startDesk() {
  load();
  desk.running = true;
  desk.startedAt = Date.now();
  desk.nextMoveAt = Date.now() + MOVE_MS;
  desk.nextSquatAt = Date.now() + SQUAT_MS;
  desk.due.clear();
  desk.notified.clear();
  save();
  startTicker();
  emit();
}

export function stopDesk() {
  desk.running = false;
  desk.due.clear();
  desk.notified.clear();
  clearInterval(ticker);
  ticker = null;
  save();
  emit();
}

// The user tapped "Done" on a due break: clear it and start the next countdown.
export function doneDesk(kind) {
  const key = kind === "move" ? "nextMoveAt" : "nextSquatAt";
  desk.due.delete(kind);
  desk.notified.delete(kind);
  if (desk.running) desk[key] = Date.now() + (kind === "move" ? MOVE_MS : SQUAT_MS);
  save();
  emit();
}

export function subscribeDesk(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Consecutive days with at least one logged desk break, starting yesterday if
// today has none yet so the streak does not read zero before the first break.
export function deskStreak(today = todayIso()) {
  const hasBreaks = (date) => {
    const d = state.days[date] && state.days[date].desk;
    return !!(d && ((d.move || 0) > 0 || (d.squats || 0) > 0));
  };
  let date = today;
  if (!hasBreaks(date)) date = addDays(date, -1);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    if (!hasBreaks(date)) break;
    n += 1;
    date = addDays(date, -1);
  }
  return n;
}
