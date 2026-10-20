import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { VOICES } from "../public/js/voice/script.js";
import { readBundle } from "../voice/bundles.js";
import { buildSharedVoicePack } from "../voice/service.js";

const dir = fileURLToPath(new URL("../voice/packs/", import.meta.url));
for (const voice of VOICES) test(`${voice.name}'s published clips match every current spoken instruction`, async () => {
  const metadata = await readBundle(voice.id, dir);
  const expected = new Map(buildSharedVoicePack(voice.id).map((entry) => [entry.id, entry.text]));
  assert.deepEqual(metadata.clips.map((clip) => clip.id).sort(), [...expected.keys()].sort(), "Rebuild changed voice clips after editing spoken content");
  assert.deepEqual((await readdir(path.join(dir, voice.id))).sort(), metadata.clips.map((clip) => `${clip.id}.wav.gz`).sort());
  for (let start = 0; start < metadata.clips.length; start += 16) {
    await Promise.all(metadata.clips.slice(start, start + 16).map(async (clip) => {
      assert.equal(clip.text, expected.get(clip.id), "Shared audio must use only the public script");
      assert.equal((await stat(path.join(dir, voice.id, `${clip.id}.wav.gz`))).size, clip.bytes);
    }));
  }
});
