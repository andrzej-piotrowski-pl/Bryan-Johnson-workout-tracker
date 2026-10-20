// Explicit optional install. A completed marker is written only after a native smoke test.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm, rename, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { ROOT, VOICE_DIR, MODEL, MODEL_SHA, nativeEnv } from "./runtime.js";

function progress(message) {
  console.log(message);
  process.send?.({ message });
}
function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: "inherit", shell: process.platform === "win32" && command.endsWith(".cmd") });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code})`)));
  });
}

try {
  await mkdir(VOICE_DIR, { recursive: true });
  progress("Installing the local speech runtime…");
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["ci", "--prefix", "voice", "--no-audit", "--no-fund"]);
  progress("Downloading Kokoro (132 MB)…");
  const response = await fetch(`https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${MODEL}.tar.bz2`, { signal: AbortSignal.timeout(600000) });
  if (!response.ok) throw new Error(`Model download failed (${response.status})`);
  const archive = path.join(VOICE_DIR, "download.tar.bz2");
  const hash = createHash("sha256");
  const input = Readable.fromWeb(response.body);
  input.on("data", (chunk) => hash.update(chunk));
  await pipeline(input, createWriteStream(archive));
  if (hash.digest("hex") !== MODEL_SHA) throw new Error("Model checksum did not match. Please retry the download.");
  progress("Unpacking and checking the voice…");
  const staging = path.join(VOICE_DIR, "unpack");
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging);
  await run("tar", ["-xjf", archive, "-C", staging]);
  await rm(path.join(VOICE_DIR, "model"), { recursive: true, force: true });
  await rename(path.join(staging, MODEL), path.join(VOICE_DIR, "model"));
  await run(process.execPath, ["voice/worker.js", "--check"], nativeEnv());
  await writeFile(path.join(VOICE_DIR, "ready.json"), JSON.stringify({ model: MODEL, sha256: MODEL_SHA, runtime: "1.13.8" }));
  await rm(archive, { force: true });
  await rm(staging, { recursive: true, force: true });
  progress("Local voice is ready. It now works offline.");
} catch (err) {
  await rm(path.join(VOICE_DIR, "ready.json"), { force: true });
  progress(`Voice installation failed: ${err.message}. The workout app still works. Retry here or run npm run voice:install on the server.`);
  process.exitCode = 1;
}
