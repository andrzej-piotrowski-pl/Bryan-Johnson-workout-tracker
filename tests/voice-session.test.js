import assert from "node:assert/strict";
import test from "node:test";
import { DAYS } from "../public/js/data/program.js";
import { defaultProfile } from "../public/js/personalize.js";
import { state } from "../public/js/store.js";
import { createGuidedVoice } from "../public/js/voice/session.js";
import { unlockVoice } from "../public/js/voice/player.js";
import { prepareManifest } from "../voice/service.js";

test("guided rests continue teaching, respect the remaining time and keep clock cues while typing", async (t) => {
  const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
  const texts = new Map(), played = [];
  let manifest;
  class Context {
    state = "running"; sampleRate = 24000; destination = {};
    resume() { return Promise.resolve(); }
    createBuffer() { return {}; }
    createBufferSource() {
      const source = { connect() {}, disconnect() {}, stop() {}, start() { if (source.buffer.text) played.push(source.buffer.text); queueMicrotask(() => source.onended?.()); } };
      return source;
    }
    decodeAudioData(data) { return Promise.resolve({ duration: 2, text: new TextDecoder().decode(data) }); }
  }
  globalThis.window = { AudioContext: Context };
  globalThis.fetch = async (url, options) => {
    if (url === "/api/voice/status") return { ok: true, json: async () => ({ installed: true }) };
    if (url === "/api/voice/prepare") {
      const result = prepareManifest(JSON.parse(options.body));
      const visit = (value) => {
        if (value?.id) texts.set(value.url, value.text);
        else if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") Object.values(value).forEach(visit);
      };
      visit(result); manifest ||= result;
      return { ok: true, json: async () => result };
    }
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode(texts.get(url)).buffer };
  };
  state.profile = { ...defaultProfile(), level: "active" };
  const all = DAYS.flatMap((d) => d.blocks.flatMap((b) => b.items.map((item) => ({ item, block: b.name, level: 2, scope: "main" }))));
  const row = all.find((s) => s.item.ex === "row");
  const next = all.find((s) => s.item.ex === "pushup");
  const coach = createGuidedVoice("2026-10-19", [row, next], { textContent: "" });
  t.after(() => {
    coach.dispose(); state.profile = null;
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  });
  await unlockVoice(); await coach.enter(0);
  await new Promise((resolve) => setImmediate(resolve));
  played.length = 0;
  const context = { itemId: row.item.id, scope: "main", setIndex: 0 };
  const event = (type, left, total = 75) => coach.rest({ type, left, total, context });
  event("start", 75);
  await new Promise((resolve) => setImmediate(resolve));
  event("tick", 70);
  await new Promise((resolve) => setImmediate(resolve));
  assert(played.includes(manifest.how[1].text), "the first rest continues after the setup cue");
  const count = played.length;
  event("tick", 60);
  assert.equal(played.length, count, "only one teaching sentence per rest");
  event("end", 0);
  assert(played.includes(manifest.sets[1].text), "rest end announces the next set");
  event("start", 75);
  await new Promise((resolve) => setImmediate(resolve));
  event("tick", 70);
  await new Promise((resolve) => setImmediate(resolve));
  assert(played.includes(manifest.how[2].text), "another rest continues instead of repeating");
  event("start", 15, 15);
  const short = played.length;
  event("tick", 11, 15);
  assert.equal(played.length, short, "a teaching clip that would cross the warning is not started");
  coach.input();
  event("tick", 10);
  assert.equal(played.at(-1), manifest.clock.ten.text, "typing never delays the ten-second cue");
  event("stop", 0);
});
