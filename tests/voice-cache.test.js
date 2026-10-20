import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { VoiceCache } from "../voice/cache.js";

const entry = (text) => ({ id: createHash("sha256").update(text).digest("hex"), text, sid: 3, speed: 1 });

async function idle(cache) {
  for (let i = 0; i < 1000 && cache.running; i++) await new Promise((resolve) => setTimeout(resolve, 2));
  assert.equal(cache.running, false, "background preparation finishes");
}

test("voice caching is opt-in, persistent, deduplicated and retained for selected voices", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "workout-voice-cache-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const generated = [];
  const render = async (entry) => {
    generated.push(entry.text);
    await mkdir(path.join(root, "audio"), { recursive: true });
    await writeFile(path.join(root, "audio", `${entry.id}.wav`), "cached audio");
  };
  const entries = [entry("first"), entry("second"), entry("third")];
  const cache = new VoiceCache(root, render);
  await cache.load(); await cache.resume();
  assert.equal(cache.packs.size, 0);
  assert(!existsSync(path.join(root, "packs")), "looking at voice settings saves nothing");
  assert.deepEqual(generated, []);
  await cache.start("af_heart", entries); await idle(cache);
  assert.equal(cache.status("af_heart").state, "ready");
  assert.equal(cache.status("af_heart").completed, 3);
  assert.deepEqual(generated, ["first", "second", "third"]);
  assert(cache.pinned(entries[0].id), "a completed default pack is protected from ordinary cache eviction");
  const restarted = new VoiceCache(root, render);
  await restarted.load(); await restarted.start("af_heart", entries); await idle(restarted);
  assert.equal(generated.length, 3, "turning coaching on after a restart does not regenerate cached audio");
  await restarted.start("am_michael", [entry("male")]); await idle(restarted);
  assert.deepEqual(generated, ["first", "second", "third", "male"]);
  assert(restarted.pinned(entries[0].id) && restarted.pinned(entry("male").id));
  assert(!restarted.packs.has("af_bella"), "unselected voices are never prepared");
  await restarted.start("af_heart", [entries[0], entry("new-dose")]); await idle(restarted);
  assert.deepEqual(generated, ["first", "second", "third", "male", "new-dose"], "a profile update reuses unchanged clips");
});

test("interrupted voice packs resume from saved audio and report failures without deleting progress", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "workout-voice-resume-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const entries = [entry("saved"), entry("pending")];
  const first = new VoiceCache(root, async (entry) => {
    if (entry.text === "pending") throw new Error("Speech runtime stopped");
    await mkdir(path.join(root, "audio"), { recursive: true });
    await writeFile(first.file(entry.id), "audio");
  });
  await first.start("af_heart", entries); await idle(first);
  assert.equal(first.status("af_heart").state, "error");
  assert.equal(first.status("af_heart").completed, 1);
  assert.match(first.status("af_heart").error, /runtime stopped/);
  const resumed = [];
  const second = new VoiceCache(root, async (entry) => { resumed.push(entry.text); await writeFile(second.file(entry.id), "audio"); });
  await second.load(); await second.resume();
  assert.deepEqual(resumed, ["pending"]);
  assert.equal(second.status("af_heart").state, "ready");
});
