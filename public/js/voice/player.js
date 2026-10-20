// One player for guided coaching, timers and previews. Only prepared local clips play.
import { state, updateProfile } from "../store.js";
import { VOICES } from "./script.js";
import { rxFor } from "../plan.js";

let context = null;
let source = null;
let generation = 0;
let priority = -1;
let speaking = false;
let mutedByVideo = false;
let finishSource = null;
const buffers = new Map();
const listeners = new Set();
export const PREPARING_VOICE = "Preparing coach audio… First use can take a few minutes, especially on slower computers. Your computer is creating and saving spoken instructions. Saved audio is quicker next time. You can keep exercising while it prepares.";
export const voiceStatus = { installed: false, installing: false, preparing: false, message: "Checking local voice…", blocked: false };
const notify = () => { for (const fn of listeners) fn({ ...voiceStatus, speaking }); };
export function onVoice(fn) { listeners.add(fn); fn({ ...voiceStatus, speaking }); return () => listeners.delete(fn); }
export function setVoicePreparing(value) { voiceStatus.preparing = value; notify(); }
export const voiceEnabled = () => state.profile?.settings?.voiceCoach === true;
export const selectedVoice = () => VOICES.find((v) => v.id === state.profile?.settings?.coachVoice) || VOICES[0];

export function unlockVoice() {
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    const resumed = context.resume();
    resumed.catch(() => { voiceStatus.blocked = true; notify(); });
    // Starting a silent buffer in the gesture also unlocks older mobile Safari.
    const silent = context.createBufferSource();
    silent.buffer = context.createBuffer(1, 1, context.sampleRate);
    silent.connect(context.destination); silent.start();
    voiceStatus.blocked = false;
    return resumed;
  } catch {
    voiceStatus.message = "Audio is unavailable in this browser."; notify();
    return Promise.resolve();
  }
}

export function cancelVoice() {
  generation += 1;
  if (source) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
  source = null; priority = -1;
  finishSource?.(); finishSource = null;
  speaking = false; notify();
}
export function cancelTeaching() { if (priority === 0) cancelVoice(); }
export function videoVoice(value) { mutedByVideo = value; if (value) cancelVoice(); }
export function setVoiceEnabled(value) {
  updateProfile((p) => { p.settings ||= {}; p.settings.voiceCoach = value; }, { silent: true });
  if (!value) { voiceStatus.preparing = false; cancelVoice(); }
  else { mutedByVideo = false; unlockVoice(); }
  notify();
}

export async function refreshVoiceStatus() {
  try {
    const response = await fetch("/api/voice/status", { cache: "no-store" });
    if (!response.ok) throw new Error();
    Object.assign(voiceStatus, await response.json());
  } catch { voiceStatus.installed = false; voiceStatus.message = "Start the local server to use voice coaching."; }
  notify();
  return voiceStatus;
}
export async function installVoice() {
  const response = await fetch("/api/voice/install", { method: "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not start the download.");
  Object.assign(voiceStatus, { installing: true, message: data.message }); notify();
}

export function voiceRequest(item, level, log = {}, restSec = 75) {
  const p = state.profile || {};
  return {
    itemId: item.id, level, restSec,
    easier: ["dose", "version"].includes(log.easier?.choice) ? log.easier.choice : undefined,
    doseLevel: log.rxOverride ? [0, 1, 2, 3].find((n) => rxFor(item, n) === log.rxOverride) : undefined,
    profile: Object.fromEntries(["age", "weightKg", "maxDumbbellKg", "hrMax", "sex", "units", "level"].map((key) => [key, p[key]])),
  };
}

export async function prepareVoice(request) {
  const response = await fetch("/api/voice/prepare", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, voice: selectedVoice().id, pace: state.profile?.settings?.coachPace || "steady" }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not prepare this voice.");
  return result;
}

export function loadClip(clip) {
  if (!clip || !context) return Promise.resolve(null);
  if (buffers.has(clip.id)) return buffers.get(clip.id).promise;
  const entry = { buffer: null, promise: null };
  entry.promise = (async () => {
    const response = await fetch(clip.url, { signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error("Could not prepare the local voice. Try the preview again.");
    entry.buffer = await context.decodeAudioData(await response.arrayBuffer());
    return entry.buffer;
  })().catch((err) => { buffers.delete(clip.id); voiceStatus.message = err.message; notify(); return null; });
  buffers.set(clip.id, entry);
  while (buffers.size > 96) buffers.delete(buffers.keys().next().value);
  return entry.promise;
}

export async function preloadVoice(clips, stillCurrent = () => true) {
  for (const clip of clips.flat().filter(Boolean)) {
    if (!stillCurrent()) return;
    await loadClip(clip);
  }
}
export const clipDuration = (clip) => buffers.get(clip?.id)?.buffer?.duration ?? null;

export async function playVoice(clips, { urgent = false, teaching = false, wait = false, preview = false, expires = Infinity } = {}) {
  if ((!preview && !voiceEnabled()) || mutedByVideo || !context || context.state !== "running") {
    if (context && context.state !== "running") { voiceStatus.blocked = true; notify(); }
    return false;
  }
  const nextPriority = urgent ? 2 : teaching ? 0 : 1;
  if (speaking && priority > nextPriority) return false;
  cancelVoice();
  const token = generation;
  priority = nextPriority;
  let played = false;
  try {
    for (const clip of [clips].flat().filter(Boolean)) {
      const buffer = wait ? await loadClip(clip) : buffers.get(clip.id)?.buffer;
      if (!buffer || token !== generation || Date.now() > expires || mutedByVideo || (!preview && !voiceEnabled())) break;
      if (teaching && Date.now() + buffer.duration * 1000 > expires) break;
      speaking = true; notify();
      await new Promise((resolve) => {
        source = context.createBufferSource(); source.buffer = buffer;
        source.connect(context.destination);
        finishSource = resolve;
        source.onended = resolve;
        source.start();
      });
      played = true;
      if (token !== generation) return played;
      source?.disconnect(); source = null; finishSource = null;
    }
  } catch {
    if (token === generation) { voiceStatus.blocked = true; voiceStatus.message = "Audio playback stopped. Tap to enable audio again."; }
  } finally {
    if (token === generation) {
      source?.disconnect(); source = null; finishSource = null;
      speaking = false; priority = -1; notify();
    }
  }
  return played;
}
