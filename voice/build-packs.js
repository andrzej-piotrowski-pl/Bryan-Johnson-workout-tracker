// Public speech comes only from the plan. Never read data/ or local pack manifests.
import { fork } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSharedVoicePack } from "./service.js";
import { writeBundle } from "./bundles.js";
import { nativeEnv, ROOT, VOICE_DIR } from "./runtime.js";
import { VOICES } from "../public/js/voice/script.js";

export async function buildPack(voice) {
  if (!VOICES.some((v) => v.id === voice)) throw new Error("Choose a known voice ID");
  const entries = buildSharedVoicePack(voice);
  const child = fork(path.join(ROOT, "voice/worker.js"), [], { env: nativeEnv(), stdio: ["ignore", "inherit", "inherit", "ipc"] });
  let waiting;
  const ready = new Promise((resolve, reject) => { waiting = { resolve, reject }; });
  child.on("message", (message) => { if (message.error) waiting?.reject(new Error(message.error)); else waiting?.resolve(message); });
  child.on("error", (err) => waiting?.reject(err));
  child.on("exit", (code) => waiting?.reject(new Error(`Voice worker exited (${code})`)));
  try {
    await ready;
    for (const [i, entry] of entries.entries()) {
      const file = path.join(VOICE_DIR, "audio", `${entry.id}.wav`);
      if (!existsSync(file)) {
        const rendered = new Promise((resolve, reject) => { waiting = { resolve, reject }; });
        const timeout = setTimeout(() => child.kill(), 180000);
        child.send({ ...entry, file });
        try { await rendered; } finally { clearTimeout(timeout); }
      }
      if (i % 50 === 0 || i === entries.length - 1) console.log(`${voice}: ${i + 1}/${entries.length}`);
    }
  } finally { waiting = null; child.kill(); }
  const metadata = await writeBundle(voice, entries, path.join(VOICE_DIR, "audio"), path.join(ROOT, "voice/packs"));
  console.log(`${voice}: ${metadata.clips.length} clips, ${metadata.files.reduce((n, f) => n + f.bytes, 0)} compressed bytes`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildPack(process.argv[2]).catch((err) => { console.error(err); process.exitCode = 1; });
}
