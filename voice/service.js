import { fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, VOICE_DIR, MODEL, MODEL_SHA, nativeEnv } from "./runtime.js";
import { VoiceCache } from "./cache.js";
import { combineWaves } from "./bundles.js";
import { CLOCK, EFFORT, PREVIEW, VOICES, durationParts, exerciseScript, phaseLine, speechText } from "../public/js/voice/script.js";
import { DAYS } from "../public/js/data/program.js";
import { ADDONS } from "../public/js/data/addons/index.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { INTERVAL_MOVES, intervalPhases } from "../public/js/data/routines.js";
import { rxFor, timerPresets } from "../public/js/plan.js";
import { defaultProfile, LEVELS, levelIndex, personalize } from "../public/js/personalize.js";

const catalog = new Map();
for (const block of DAYS.flatMap((d) => d.blocks)) for (const item of block.items) catalog.set(item.id, { item, block: block.name });
for (const addon of ADDONS) for (const variant of Object.values(addon.variants)) for (const item of variant.items) catalog.set(item.id, { item, block: addon.name, addon: addon.id });
const clips = new Map();
const pending = new Map();
let worker = null;
let workerReady = null;
let idle = null;
let queue = Promise.resolve();
let installer = null;
let installMessage = "";
let engineError = "";
const cacheDir = path.join(VOICE_DIR, "audio");
const voiceCache = new VoiceCache(VOICE_DIR, async (entry) => {
  // Only one background clip is queued; workout requests get the next turn.
  while (pending.size) await Promise.allSettled([...pending.values()].map((task) => task.promise));
  clips.set(entry.id, entry);
  await audioFile(entry.id);
});

function bad(message) { throw Object.assign(new Error(message), { status: 400 }); }
function integer(value, min, max) { return Number.isInteger(value) && value >= min && value <= max; }
async function modelInstalled() {
  try {
    const marker = JSON.parse(await readFile(path.join(VOICE_DIR, "ready.json"), "utf8"));
    return marker.sha256 === MODEL_SHA && existsSync(path.join(VOICE_DIR, "model/model.int8.onnx"));
  } catch { return false; }
}
function clip(text, voice, speed) {
  if (!text) return null;
  const id = createHash("sha256").update(JSON.stringify([MODEL_SHA, "sherpa-1.13.8", voice.id, 1, text])).digest("hex");
  clips.delete(id);
  clips.set(id, { text, sid: voice.sid, speed: 1 });
  while (clips.size > 3000) clips.delete(clips.keys().next().value);
  return { id, text, rate: speed, url: `/api/voice/audio/${id}.wav` };
}

function joinedClip(texts, voice, speed) {
  const parts = texts.filter(Boolean).map((text) => clip(text, voice, 1));
  if (parts.length === 1) return clip(parts[0].text, voice, speed);
  const result = clip(parts.map((part) => part.text).join(" "), voice, speed);
  clips.get(result.id).parts = parts.map((part) => ({ id: part.id, ...clips.get(part.id) }));
  return result;
}

export function prepareManifest(body, savedProfile = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) bad("Expected a voice request");
  const voice = VOICES.find((v) => v.id === (body.voice || "af_heart"));
  if (!voice || ![undefined, "steady", "brisk"].includes(body.pace)) bad("Unknown voice or pace");
  const speed = body.pace === "brisk" ? 1.06 : 1;
  const cue = (text) => clip(text, voice, speed);
  if (body.preview === true) return { preview: cue(PREVIEW) };
  const entry = catalog.get(body.itemId);
  if (!entry || !integer(body.level, 0, 3)) bad("Unknown workout step or level");
  const { item, block } = entry;
  const ex = EXERCISES[item.ex];
  const profile = { ...defaultProfile(), ...savedProfile };
  // Pending browser edits may not be saved yet. Only numeric and enum inputs cross this boundary.
  const p = body.profile || {};
  for (const [key, min, max] of [["age", 10, 110], ["weightKg", 1, 500], ["maxDumbbellKg", 0, 1000], ["hrMax", 100, 260]]) {
    if (p[key] === null && ["maxDumbbellKg", "hrMax"].includes(key)) profile[key] = null;
    else if (p[key] != null) {
      if (typeof p[key] !== "number" || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) bad("Invalid profile value");
      profile[key] = p[key];
    }
  }
  for (const [key, values] of [["sex", ["male", "female", "other"]], ["units", ["metric", "imperial"]], ["level", ["new", "returning", "active", "trained"]]]) {
    if (p[key] != null) { if (!values.includes(p[key])) bad("Invalid profile choice"); profile[key] = p[key]; }
  }
  if (![undefined, "dose", "version"].includes(body.easier)) bad("Invalid easier choice");
  if (body.doseLevel != null && !integer(body.doseLevel, 0, 3)) bad("Invalid dose level");
  const rx = rxFor(item, body.doseLevel ?? (body.easier === "dose" && body.level > 0 ? body.level - 1 : body.level));
  if (!rx || rx === "—") bad("This exercise is not in this level");
  const script = exerciseScript({ item, rx, profile, level: body.level, easier: body.easier === "version" });
  if (body.easier === "version" && ex.easier) script.intro.push(...[speechText(ex.easier, profile)]);
  const seconds = body.restSec ?? 75;
  if (!integer(seconds, 1, 3600)) bad("Invalid rest duration");
  const result = {
    name: script.name, setCount: script.setCount,
    intro: script.intro.map(cue), safety: script.safety.map(cue),
    how: script.how.map((text) => clip(text, voice, 1)), sets: script.sets.map(cue),
    block: cue(`${speechText(block, profile)} is next.`),
    effort: /strength/i.test(block) ? cue(EFFORT[body.level]) : null,
    rest: joinedClip(["Rest for", ...durationParts(seconds), "Continue when you are ready."], voice, speed), next: cue(`Next is ${script.name}.`),
    back: cue(`Back to ${script.name}.`),
    clock: Object.fromEntries(Object.entries(CLOCK).map(([key, text]) => [key, cue(text)])),
  };
  if (body.timer) {
    const t = body.timer;
    let phases;
    if (t.type === "hold") {
      if (!integer(t.seconds, 1, 3600) || ![1, 2].includes(t.sides)) bad("Invalid hold");
      phases = [{ kind: "ready", sec: 5 }];
      for (let i = 0; i < t.sides; i++) {
        phases.push({ kind: "work", label: t.sides === 2 ? i === 0 ? "First side" : "Other side" : "Hold", sec: t.seconds });
        if (i === 0 && t.sides === 2) phases.push({ kind: "rest", label: "Switch", sec: 5 });
      }
    } else if (t.type === "countdown") {
      if (typeof t.minutes !== "number" || !Number.isFinite(t.minutes) || t.minutes <= 0 || t.minutes > 240) bad("Invalid countdown");
      const label = item.intensity === "light" ? "Easy pace" : ex.intensity === "hard" ? "Vigorous" : "Zone 2";
      phases = [{ kind: "ready", sec: 5 }, { kind: "work", label, sec: Math.round(t.minutes * 60), sub: `${label}: your prescribed heart-rate range` }];
    } else if (t.type === "intervals") {
      const presets = timerPresets(item, body.level);
      if (!integer(t.preset ?? 0, 0, presets.length - 1)) bad("Unknown interval preset");
      if (t.moves != null && (!Array.isArray(t.moves) || t.moves.length > 2 || !t.moves.every((id) => INTERVAL_MOVES.includes(id)))) bad("Unknown interval movement");
      const preset = presets[t.preset || 0];
      phases = intervalPhases(item.ex, preset, t.moves);
      for (const phase of phases) {
        const range = phase.kind === "work" ? preset.workHr : phase.kind === "rest" ? preset.restHr : null;
        phase.sub = range ? "Follow your prescribed heart-rate range." : "";
      }
    } else bad("Unknown timer");
    result.phases = phases.map((phase) => {
      if (phase.kind === "ready" || (t.type === "hold" && phase.kind === "rest")) return [cue(phaseLine(phase, t.type, profile))];
      const duration = durationParts(phase.sec);
      if (t.type === "hold") return [joinedClip([`${phase.label}.`, ...duration, "Breathe steadily throughout the hold."], voice, speed)];
      if (t.type === "countdown") return [joinedClip([`${speechText(phase.label, profile)}.`, ...duration, "Follow your prescribed heart-rate range."], voice, speed)];
      if (phase.kind === "rest") return [joinedClip(["Recover with easy marching.", ...duration, phase.sec > 30 ? phase.sub : ""], voice, speed)];
      const movement = phase.ex ? cue(`For this interval, do ${speechText(EXERCISES[phase.ex].name, profile)}.`) : null;
      const round = phase.round ? cue(`Round ${speechText(String(phase.round))} of ${speechText(String(phase.total))}. Follow today's prescribed pace.`) : null;
      return [movement, round, joinedClip([...duration, phase.sec > 30 ? phase.sub : ""], voice, speed)].filter(Boolean);
    });
  }
  return result;
}

export function buildVoicePack(body, savedProfile = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) bad("Expected a voice cache request");
  const profile = { ...defaultProfile(), ...savedProfile };
  const level = body.level ?? levelIndex(profile);
  if (!integer(level, 0, 3)) bad("Invalid training level");
  const addons = body.addons ?? ADDONS.filter((addon) => profile.addons?.[addon.id]).map((addon) => addon.id);
  if (!Array.isArray(addons) || addons.length > ADDONS.length || !addons.every((id) => ADDONS.some((addon) => addon.id === id))) bad("Unknown add-on");
  const entries = new Map();
  const collect = (value) => {
    if (value?.id) entries.set(value.id, { id: value.id, ...clips.get(value.id) });
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  const base = { voice: body.voice, pace: "steady", level, profile: body.profile, restSec: body.restSec ?? profile.settings?.restSec ?? 75 };
  collect(prepareManifest({ ...base, preview: true }, profile));
  for (const { item, addon } of catalog.values()) {
    if (addon && !addons.includes(addon)) continue;
    if (!rxFor(item, level) || rxFor(item, level) === "—") continue;
    const request = { ...base, itemId: item.id, restSec: item.id === "fri-strength-rdl" && level === 3 ? 25 : base.restSec };
    collect(prepareManifest(request, profile));
    collect(prepareManifest({ ...request, easier: "version" }, profile));
    const rx = personalize(rxFor(item, level), { ...profile, ...body.profile });
    const sec = /(?:\d+\s*×\s*)?\d+(?:–(\d+))?\s*s\b/.exec(rx);
    const minutes = /(\d+)(?:–\d+)?\s*min\b/.exec(rx);
    const type = EXERCISES[item.ex].log;
    if (type === "hold" || (type === "check" && sec)) {
      const seconds = sec ? Number(sec[1] || sec[0].match(/\d+(?=\s*s)/)?.[0]) : 30;
      collect(prepareManifest({ ...request, timer: { type: "hold", seconds, sides: /\/(side|leg|arm)\b/.test(rx) ? 2 : 1 } }, profile));
    }
    if (type === "cardio" && minutes) collect(prepareManifest({ ...request, timer: { type: "countdown", minutes: Number(minutes[1]) } }, profile));
    for (const [preset] of timerPresets(item, level).entries()) for (const move of item.ex === "shortint" ? INTERVAL_MOVES : ["highknees"]) {
      collect(prepareManifest({ ...request, timer: { type: "intervals", preset, moves: [move] } }, profile));
    }
  }
  return [...entries.values()];
}

export function buildSharedVoicePack(voice) {
  const entries = new Map();
  const collect = (entry) => {
    if (entry.parts) entry.parts.forEach(collect);
    else entries.set(entry.id, entry);
  };
  for (const [level, { id }] of LEVELS.entries()) for (const units of ["metric", "imperial"]) {
    const profile = { ...defaultProfile(), level: id, units };
    buildVoicePack({ voice, level, addons: ADDONS.map((addon) => addon.id) }, profile).forEach(collect);
  }
  const selected = VOICES.find((v) => v.id === voice);
  if (!selected) bad("Unknown voice");
  for (let seconds = 1; seconds < 60; seconds++) for (const text of durationParts(seconds)) {
    const c = clip(text, selected, 1); collect({ id: c.id, ...clips.get(c.id) });
  }
  for (let minutes = 1; minutes <= 240; minutes++) for (const text of durationParts(minutes * 60)) {
    const c = clip(text, selected, 1); collect({ id: c.id, ...clips.get(c.id) });
  }
  const and = clip("and", selected, 1); collect({ id: and.id, ...clips.get(and.id) });
  return [...entries.values()];
}

async function pruneCache() {
  const entries = await readdir(cacheDir).catch(() => []);
  const files = await Promise.all(entries.filter((name) => /^[a-f0-9]{64}\.wav$/.test(name) && !voiceCache.pinned(name.slice(0, -4))).map(async (name) => ({ name, ...await stat(path.join(cacheDir, name)) })));
  let size = files.reduce((total, f) => total + f.size, 0);
  for (const file of files.sort((a, b) => a.mtimeMs - b.mtimeMs)) {
    if (size <= 256 * 1024 * 1024) break;
    await unlink(path.join(cacheDir, file.name));
    size -= file.size;
  }
}

function startWorker() {
  if (workerReady) return workerReady;
  workerReady = new Promise((resolve, reject) => {
    const child = fork(path.join(ROOT, "voice/worker.js"), [], { env: nativeEnv(), stdio: ["ignore", "ignore", "pipe", "ipc"] });
    worker = child;
    let details = "";
    worker.stderr.on("data", (chunk) => { details = (details + chunk).slice(-2000); });
    worker.on("message", (message) => {
      if (message.ready) { engineError = ""; resolve(); }
      else {
        const task = pending.get(message.id);
        if (!task) return;
        pending.delete(message.id);
        if (message.error) task.reject(new Error(message.error));
        else task.resolve(message);
      }
    });
    const failed = () => {
      if (worker !== child) return;
      const err = new Error("Local voice stopped. Retry the preview or reinstall the voice.");
      engineError = err.message;
      if (details) console.warn(details);
      reject(err);
      for (const task of pending.values()) task.reject(err);
      pending.clear(); worker = null; workerReady = null;
    };
    worker.once("error", failed);
    worker.once("exit", failed);
  });
  return workerReady;
}

async function audioFile(id) {
  const file = path.join(cacheDir, `${id}.wav`);
  if (existsSync(file)) return file;
  if (pending.has(id)) { await pending.get(id).promise; return file; }
  const data = clips.get(id);
  if (!data) throw Object.assign(new Error("Prepare this workout cue again"), { status: 404 });
  if (data.parts) {
    const waves = [];
    for (const part of data.parts) {
      clips.set(part.id, part);
      waves.push(await readFile(await audioFile(part.id)));
    }
    await mkdir(cacheDir, { recursive: true });
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, combineWaves(waves)); await rename(tmp, file);
    return file;
  }
  if (pending.size > 100) throw Object.assign(new Error("Voice is busy preparing cues"), { status: 429 });
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  pending.set(id, { promise, resolve, reject });
  clearTimeout(idle);
  queue = queue.catch(() => {}).then(async () => {
    try {
      await startWorker();
      const timeout = setTimeout(() => worker?.kill(), 180000);
      worker.send({ id, ...data, file });
      await promise.finally(() => clearTimeout(timeout));
    } catch (err) { pending.delete(id); reject(err); }
  });
  try { await promise; return file; }
  finally {
    if (!pending.size) {
      idle = setTimeout(() => { const child = worker; worker = null; workerReady = null; child?.kill(); }, 120000);
      idle.unref();
      pruneCache().catch((err) => console.warn("Voice cache:", err.message));
    }
  }
}

export async function handleVoice(req, res, pathname, { readBody, send, fail, profile }) {
  const method = req.method;
  if (method !== "GET") {
    const origin = req.headers.origin;
    if (req.headers["sec-fetch-site"] === "cross-site" || (origin && new URL(origin).host !== req.headers.host)) return fail(res, 403, "Use the voice controls from this app");
  }
  await voiceCache.load();
  if (pathname === "/api/voice/status" && method === "GET") {
    const ready = await modelInstalled();
    const voice = new URL(req.url, "http://localhost").searchParams.get("voice") || "af_heart";
    if (!VOICES.some((v) => v.id === voice)) return fail(res, 400, "Unknown voice");
    if (ready && !installer) voiceCache.resume();
    return send(res, 200, { installed: ready, installing: !!installer, error: !!engineError, message: installer ? installMessage : engineError || installMessage || (ready ? "Local voice is ready. Speech works offline." : "Download the local voice to hear coaching."), model: MODEL, cacheEnabled: voiceCache.packs.size > 0, cache: voiceCache.status(voice) });
  }
  if (pathname === "/api/voice/cache" && method === "POST") {
    if (installer || !await modelInstalled()) return fail(res, 409, "Install the local voice first");
    const body = await readBody(req);
    const entries = buildVoicePack(body, await profile());
    const voice = body.voice || "af_heart";
    const cache = await voiceCache.start(voice, entries);
    if (voice !== "af_heart" && !voiceCache.packs.has("af_heart")) {
      await voiceCache.start("af_heart", buildVoicePack({ ...body, voice: "af_heart" }, await profile()));
      voiceCache.selected = voice;
    }
    return send(res, 202, { cacheEnabled: true, cache });
  }
  if (pathname === "/api/voice/install" && method === "POST") {
    if (!installer) {
      if (worker || pending.size) return fail(res, 409, "Finish the voice preview or workout before reinstalling.");
      installMessage = "Installing the local speech runtime…";
      engineError = "";
      installer = fork(path.join(ROOT, "voice/install.js"), [], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
      installer.on("message", ({ message }) => { installMessage = message; });
      installer.once("error", (err) => { installMessage = `Voice installation failed: ${err.message}`; installer = null; });
      installer.once("exit", () => { installer = null; });
    }
    return send(res, 202, { message: installMessage });
  }
  if (pathname === "/api/voice/prepare" && method === "POST") return send(res, 200, prepareManifest(await readBody(req), await profile()));
  const match = pathname.match(/^\/api\/voice\/audio\/([a-f0-9]{64})\.wav$/);
  if (match && method === "GET") {
    if (!voiceCache.packs.size) return fail(res, 409, "Turn coaching on once to prepare and save voice audio");
    if (!clips.has(match[1])) return fail(res, 404, "Prepare this workout cue first");
    const file = await audioFile(match[1]);
    return send(res, 200, await readFile(file), "audio/wav");
  }
  return fail(res, 404, "Unknown voice route");
}

process.once("exit", () => { worker?.kill(); installer?.kill(); });

export async function resumeVoiceCache() {
  await voiceCache.load();
  if (await modelInstalled()) voiceCache.resume();
}
