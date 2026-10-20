import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  const file = path.join(bundle, meta.files[0].name);
  await writeFile(file, "corrupt");
  await assert.rejects(unpackBundle("af_heart", bundle, dest), /checksum/);
  meta.files[0].name = "../../data/profile.json";
  await writeFile(path.join(bundle, "af_heart.json"), JSON.stringify(meta));
  await assert.rejects(unpackBundle("af_heart", bundle, dest), /Invalid voice pack file/);
});

test("timer speech joins reusable WAV fragments without changing samples", () => {
  const joined = combineWaves([wave([1, 2]), wave([3, 4, 5])]);
  assert.deepEqual(joined, wave([1, 2, 3, 4, 5]));
  assert.throws(() => combineWaves([Buffer.from("bad")]), /Invalid voice audio/);
  assert.throws(() => combineWaves([wave([1]).subarray(0, 45)]), /Truncated/);
});
