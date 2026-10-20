import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { combineWaves, unpackBundle, writeBundle } from "../voice/bundles.js";

function wave(samples) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24); bytes.writeUInt32LE(48000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, i) => bytes.writeInt16LE(value, 44 + i * 2));
  return bytes;
}

test("public voice bundles round-trip PCM audio and reject corruption and path traversal", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "shared-voice-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, "source"), bundle = path.join(dir, "bundle"), dest = path.join(dir, "dest");
  await mkdir(source);
  const audio = wave([1, 2, 3]);
  const id = createHash("sha256").update("shared phrase").digest("hex");
  await writeFile(path.join(source, `${id}.wav`), audio);
  const meta = await writeBundle("af_heart", [{ id }], source, bundle);
  await unpackBundle("af_heart", bundle, dest);
  assert.deepEqual(await readFile(path.join(dest, `${id}.wav`)), audio);
  await assert.rejects(unpackBundle("../profile", bundle, dest), /Unknown voice/);
  const file = path.join(bundle, "af_heart", `${id}.wav.gz`);
  await writeFile(file, "corrupt");
  await assert.rejects(unpackBundle("af_heart", bundle, path.join(dir, "fresh")), /checksum/);
  meta.clips[0].id = "../../data/profile.json";
  await writeFile(path.join(bundle, "af_heart.json"), JSON.stringify(meta));
  await assert.rejects(unpackBundle("af_heart", bundle, dest), /Invalid shared voice pack/);
});

test("changing one sentence keeps every unrelated compressed recording untouched", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "voice-incremental-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, "source"), bundle = path.join(dir, "bundle"); await mkdir(source);
  const entries = ["Keep your back straight.", "Bend your knees.", "Bend your knees slightly."].map((text) => ({ id: createHash("sha256").update(text).digest("hex") }));
  for (const [i, entry] of entries.entries()) await writeFile(path.join(source, `${entry.id}.wav`), wave([i, i + 1]));
  const first = await writeBundle("af_heart", entries.slice(0, 2), source, bundle);
  const playback = path.join(dir, "playback");
  await unpackBundle("af_heart", bundle, playback, entries[1].id);
  assert.deepEqual(await readdir(playback), [`${entries[1].id}.wav`], "requested speech can play before the rest of the pack is copied");
  const unchanged = path.join(bundle, "af_heart", `${entries[0].id}.wav.gz`);
  const before = await stat(unchanged);
  const second = await writeBundle("af_heart", [entries[0], entries[2]], source, bundle);
  assert.deepEqual(second.clips[0], first.clips[0]);
  assert.equal((await stat(unchanged)).mtimeMs, before.mtimeMs, "unchanged audio is never rewritten");
  assert.deepEqual((await readdir(path.join(bundle, "af_heart"))).sort(), [entries[0], entries[2]].map((entry) => `${entry.id}.wav.gz`).sort());
});

test("timer speech joins reusable WAV fragments without changing samples", () => {
  const joined = combineWaves([wave([1, 2]), wave([3, 4, 5])]);
  assert.deepEqual(joined, wave([1, 2, 3, 4, 5]));
  assert.throws(() => combineWaves([Buffer.from("bad")]), /Invalid voice audio/);
  assert.throws(() => combineWaves([wave([1]).subarray(0, 45)]), /Truncated/);
});
