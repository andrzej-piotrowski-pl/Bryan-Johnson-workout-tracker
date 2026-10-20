import assert from "node:assert/strict";
import test from "node:test";
import { state } from "../public/js/store.js";
import { cancelTeaching, cancelVoice, loadClip, onVoice, playVoice, unlockVoice, videoVoice } from "../public/js/voice/player.js";

test("one player cancels stale audio, prioritises clocks, and restores ducking on every stop", async (t) => {
  const sources = [];
  let decoded;
  let delayDecode = false;
  let failStart = false;
  class Context {
    state = "running";
    sampleRate = 24000;
    destination = {};
    resume() { return Promise.resolve(); }
    createBuffer() { return {}; }
    createBufferSource() {
      const source = { connect() {}, disconnect() {}, start() { if (failStart) throw new Error("Audio device stopped"); source.started = true; }, stop() { source.stopped = true; }, onended: null };
      sources.push(source);
      return source;
    }
    decodeAudioData() { return delayDecode ? new Promise((resolve) => { decoded = resolve; }) : Promise.resolve({ duration: 2 }); }
  }
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
  globalThis.window = { AudioContext: Context };
  t.after(() => { globalThis.fetch = originalFetch; if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
  state.profile = { settings: { voiceCoach: true, sound: false } };
  await unlockVoice();
  const events = [];
  const off = onVoice((status) => events.push(status.speaking));
  t.after(() => { cancelVoice(); off(); state.profile = null; });
  const clip = (id) => ({ id, url: `/api/voice/audio/${id}.wav` });
  const teaching = clip("teaching"), clock = clip("clock");
  await loadClip(teaching); await loadClip(clock);
  const first = playVoice(teaching, { teaching: true });
  assert.equal(events.at(-1), true, "beeps can be off while voice plays and ducks the radio");
  const oldSource = sources.at(-1);
  const warning = playVoice(clock, { urgent: true });
  assert.equal(oldSource.stopped, true, "clock interrupts teaching");
  const warningSource = sources.at(-1);
  assert.equal(await playVoice(teaching, { teaching: true }), false, "teaching cannot interrupt a clock");
  cancelTeaching();
  assert(!warningSource.stopped, "typing does not silence a clock cue");
  warningSource.onended();
  await warning; await first;
  assert.equal(events.at(-1), false);
  const second = playVoice(teaching);
  videoVoice(true);
  await second;
  assert.equal(events.at(-1), false, "video restores radio volume");
  assert.equal(await playVoice(clock, { urgent: true }), false);
  videoVoice(false);
  assert.equal(await playVoice(clip("not-ready"), { urgent: true }), false, "a missing clock cue stays silent");
  delayDecode = true;
  const stale = playVoice(clip("stale"), { wait: true });
  while (!decoded) await new Promise((resolve) => setImmediate(resolve));
  const count = sources.length;
  cancelVoice(); decoded({ duration: 2 });
  assert.equal(await stale, false);
  assert.equal(sources.length, count, "navigation while loading cannot play the old cue later");
  assert.equal(events.at(-1), false);
  failStart = true;
  assert.equal(await playVoice(clock), false);
  assert.equal(events.at(-1), false, "failed playback restores radio volume");
  state.profile.settings.voiceCoach = false;
  assert.equal(await playVoice(clock), false);
});
