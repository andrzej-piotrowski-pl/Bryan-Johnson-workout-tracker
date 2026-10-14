// Turns the generic plan into numbers for one person:
// - heart-rate ranges from age (Tanaka: 208 − 0.7 × age) or a measured max,
// - starting loads scaled by body weight, sex, age and training level,
// - units (kg/cm or lb/in),
// - which phase you are in, based on sessions actually completed (skipped days don't count).
//
// The plan's loads were set for a 75 kg man of 38 returning to training ("returning");
// everyone else gets the same loads scaled. They are starting points: the effort
// targets in each phase (reps left in the tank) always win.

import { iso } from "./util.js";

export const LEVELS = [
  { id: "new", name: "New to training", detail: "Little or no strength training before.", load: 0.7, startPhase: 0 },
  { id: "returning", name: "Returning", detail: "Trained before, but out of practice for months or years.", load: 1.0, startPhase: 0 },
  { id: "active", name: "Active", detail: "Training regularly over the last few months.", load: 1.15, startPhase: 1 },
  { id: "trained", name: "Well trained", detail: "Lifting and doing hard cardio consistently for a year or more.", load: 1.3, startPhase: 1 },
];

export const SEXES = [
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
  { id: "other", name: "Prefer not to say" },
];

export function defaultProfile() {
  return {
    name: "",
    age: 38,
    sex: "male",
    weightKg: 75,
    heightCm: 180,
    level: "returning",
    units: "metric",
    maxDumbbellKg: 24,
    hrMax: null,
    startDate: iso(new Date()),
    startPhase: 0,
    phaseLock: null,
    addons: { posture: true },
    settings: { theme: "system", restSec: 75, sound: true },
    createdAt: new Date().toISOString(),
  };
}

// ---------- heart rate ----------

export function hrMax(p) {
  if (p && Number(p.hrMax) > 100) return Math.round(Number(p.hrMax));
  const age = Number(p && p.age) || 38;
  return Math.round(208 - 0.7 * age);
}

export function bpm(p, pct) {
  return Math.round((hrMax(p) * pct) / 100);
}

export function bpmRange(p, lo, hi) {
  return `${bpm(p, lo)}–${bpm(p, hi)} bpm`;
}

// ---------- loads ----------

export function loadFactor(p) {
  if (!p) return 1;
  const w = Number(p.weightKg) || 75;
  const level = (LEVELS.find((l) => l.id === p.level) || LEVELS[1]).load;
  const sex = p.sex === "female" ? 0.7 : p.sex === "other" ? 0.85 : 1;
  const age = Number(p.age) || 38;
  const ageF = age >= 65 ? 0.8 : age >= 55 ? 0.88 : age >= 45 ? 0.95 : 1;
  // Strength scales with roughly body weight^(2/3), not linearly.
  return Math.pow(w / 75, 2 / 3) * level * sex * ageF;
}

// Rounds to what adjustable dumbbells actually offer.
export function roundKg(x) {
  if (x < 6) return Math.max(0.5, Math.round(x * 2) / 2);
  if (x < 20) return Math.round(x);
  return Math.round(x / 2) * 2;
}

const toLb = (kg) => {
  const lb = kg * 2.20462;
  return lb < 20 ? Math.max(1, Math.round(lb)) : Math.round(lb / 5) * 5;
};

export function kgUnit(p) {
  return p && p.units === "imperial" ? "lb" : "kg";
}

// Display a body-weight or load value (kg in, user's unit out).
export function fmtWeight(p, kg, digits = 1) {
  if (kg == null || kg === "") return "";
  if (p && p.units === "imperial") return `${Math.round(kg * 2.20462 * 10 ** digits) / 10 ** digits} lb`;
  return `${Math.round(kg * 10 ** digits) / 10 ** digits} kg`;
}

export function fmtLoad(p, lo, hi = null) {
  const f = loadFactor(p);
  let a = roundKg(lo * f);
  let b = hi == null ? null : roundKg(hi * f);
  const max = Number(p && p.maxDumbbellKg) || null;
  let note = "";
  if (max) {
    if (a >= max) {
      a = max;
      b = null;
      note = " (your heaviest)";
    } else if (b != null && b > max) b = max;
  }
  if (b != null && b <= a) b = null;
  if (p && p.units === "imperial") {
    const la = toLb(a);
    const lb = b == null ? null : toLb(b);
    return (lb != null && lb !== la ? `${la}–${lb} lb` : `${la} lb`) + note;
  }
  return (b != null ? `${a}–${b} kg` : `${a} kg`) + note;
}

export function fmtLen(p, lo, hi = null) {
  if (p && p.units === "imperial") {
    const a = Math.round(lo / 2.54);
    const b = hi == null ? null : Math.round(hi / 2.54);
    return b != null && b !== a ? `${a}–${b} in` : `${a} in`;
  }
  return hi != null ? `${lo}–${hi} cm` : `${lo} cm`;
}

// ---------- text tokens ----------

const TOKEN = /\{(hr|kg|cm):(~?)([\d.]+)(?:-([\d.]+))?\}/g;

// "{hr:60-70}" → "109–127 bpm", "{kg:10-14}" → "10–14 kg" (scaled), "{cm:30}" → "30 cm"/"12 in".
export function personalize(text, p) {
  if (text == null) return text;
  return String(text).replace(TOKEN, (_, kind, approx, a, b) => {
    const lo = Number(a);
    const hi = b != null ? Number(b) : null;
    if (kind === "hr") return hi == null ? `${approx ? "≈" : ""}${bpm(p, lo)} bpm` : bpmRange(p, lo, hi);
    if (kind === "kg") return fmtLoad(p, lo, hi);
    return fmtLen(p, lo, hi);
  });
}

// The first load mentioned in a prescription, scaled — used as the placeholder in the set logger.
export function suggestedKg(text, p) {
  const m = /\{kg:([\d.]+)(?:-([\d.]+))?\}/.exec(text || "");
  if (!m) return null;
  const f = loadFactor(p);
  let v = roundKg(Number(m[1]) * f);
  const max = Number(p && p.maxDumbbellKg) || null;
  if (max && v > max) v = max;
  return v;
}

// ---------- phases ----------

const PHASE_START_WEEK = [1, 3, 7];

export function phaseLengths(p) {
  // Sessions needed to finish phase 1 and phase 2 (6 sessions ≈ one week).
  return p && p.level === "new" ? [18, 24] : [12, 24];
}

export function phaseState(p, sessionsDone) {
  const lens = phaseLengths(p);
  if (p && p.phaseLock != null && p.phaseLock !== "") {
    const phase = Number(p.phaseLock);
    return { phase, locked: true, done: null, needed: null, week: PHASE_START_WEEK[phase] };
  }
  let phase = Number(p && p.startPhase) || 0;
  let n = sessionsDone;
  while (phase < 2 && n >= lens[phase]) {
    n -= lens[phase];
    phase += 1;
  }
  return { phase, locked: false, done: n, needed: phase < 2 ? lens[phase] : null, week: PHASE_START_WEEK[phase] + Math.floor(n / 6) };
}
