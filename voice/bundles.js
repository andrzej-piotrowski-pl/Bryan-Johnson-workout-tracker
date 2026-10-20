import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { MODEL_SHA } from "./runtime.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const validId = (id) => /^[a-f0-9]{64}$/.test(id);

export function combineWaves(waves) {
  let format;
  const samples = waves.map((wave) => {
    if (wave.toString("ascii", 0, 4) !== "RIFF" || wave.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid voice audio");
    let pcm, data;
    for (let pos = 12; pos + 8 <= wave.length;) {
      const size = wave.readUInt32LE(pos + 4), end = pos + 8 + size;
      if (end > wave.length) throw new Error("Truncated voice audio");
      const name = wave.toString("ascii", pos, pos + 4);
      if (name === "fmt ") pcm = wave.subarray(pos + 8, end);
      if (name === "data") data = wave.subarray(pos + 8, end);
      pos = end + (size % 2);
    }
    if (!pcm || pcm.length < 16 || pcm.readUInt16LE(0) !== 1 || !data) throw new Error("Voice audio must be PCM WAV");
    if (format && !pcm.subarray(0, 16).equals(format)) throw new Error("Voice audio formats differ");
    format = pcm.subarray(0, 16);
    return data;
  });
  if (!format) throw new Error("No voice audio");
  const data = Buffer.concat(samples), header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(data.length + 36, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); format.copy(header, 20); header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export async function writeBundle(voice, entries, audioDir, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const metadata = { format: 1, voice, model: MODEL_SHA, clips: entries.map((entry) => entry.id), files: [] };
  let batch = [], size = 0;
  const flush = async () => {
    if (!batch.length) return;
    const name = `${voice}.${String(metadata.files.length).padStart(3, "0")}.json.gz`;
    const bytes = gzipSync(JSON.stringify(batch), { level: 9 });
    await writeFile(path.join(outputDir, name), bytes);
    metadata.files.push({ name, sha256: hash(bytes), bytes: bytes.length });
    batch = []; size = 0;
  };
  for (const entry of entries) {
    const audio = await readFile(path.join(audioDir, `${entry.id}.wav`));
    const encoded = audio.toString("base64");
    if (size + encoded.length > 8 * 1024 * 1024) await flush();
    batch.push([entry.id, encoded]); size += encoded.length;
  }
  await flush();
  await writeFile(path.join(outputDir, `${voice}.json`), JSON.stringify(metadata));
  return metadata;
}

export async function unpackBundle(voice, sourceDir, audioDir) {
  if (!/^(af_heart|af_bella|am_michael|am_puck|bf_emma)$/.test(voice)) throw new Error("Unknown voice");
  const metadata = JSON.parse(await readFile(path.join(sourceDir, `${voice}.json`), "utf8"));
  if (metadata.format !== 1 || metadata.voice !== voice || metadata.model !== MODEL_SHA || !Array.isArray(metadata.clips) || !metadata.clips.every(validId) || !Array.isArray(metadata.files)) throw new Error("Invalid shared voice pack");
  const expected = new Set(metadata.clips), found = new Set();
  await mkdir(audioDir, { recursive: true });
  for (const file of metadata.files) {
    if (!new RegExp(`^${voice}\\.\\d{3}\\.json\\.gz$`).test(file.name) || !validId(file.sha256) || file.bytes > 16 * 1024 * 1024) throw new Error("Invalid voice pack file");
    const bytes = await readFile(path.join(sourceDir, file.name));
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error("Voice pack checksum failed. Update the app and retry.");
    const entries = JSON.parse(gunzipSync(bytes, { maxOutputLength: 16 * 1024 * 1024 }).toString("utf8"));
    if (!Array.isArray(entries)) throw new Error("Invalid voice pack contents");
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length !== 2 || !expected.has(entry[0]) || found.has(entry[0]) || typeof entry[1] !== "string") throw new Error("Invalid voice pack clip");
      const audio = Buffer.from(entry[1], "base64");
      combineWaves([audio]);
      const tmp = path.join(audioDir, `${entry[0]}.${randomUUID()}.tmp`);
      await writeFile(tmp, audio); await rename(tmp, path.join(audioDir, `${entry[0]}.wav`));
      found.add(entry[0]);
    }
  }
  if (found.size !== expected.size) throw new Error("Voice pack is incomplete. Update the app and retry.");
  return metadata;
}
