import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildVoicePack } from "../voice/service.js";
import { MODEL_SHA } from "../voice/runtime.js";

test("the API saves no audio before activation and serves a ready pack without a model runtime, including after restart", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "workout-voice-api-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of ["server.js", "package.json", "CHANGELOG.md"]) await copyFile(new URL(`../${name}`, import.meta.url), path.join(root, name));
  await mkdir(path.join(root, "voice"));
  for (const name of ["service.js", "cache.js", "runtime.js", "worker.js"]) await copyFile(new URL(`../voice/${name}`, import.meta.url), path.join(root, "voice", name));
  await cp(new URL("../public/js", import.meta.url), path.join(root, "public/js"), { recursive: true });
  await mkdir(path.join(root, ".voice/model"), { recursive: true });
  await writeFile(path.join(root, ".voice/ready.json"), JSON.stringify({ sha256: MODEL_SHA }));
  await writeFile(path.join(root, ".voice/model/model.int8.onnx"), "unused model fixture");
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let child;
  const stop = async () => { if (!child) return; const ended = new Promise((resolve) => child.once("exit", resolve)); child.kill(); await ended; child = null; };
  t.after(stop);
  const start = async () => {
    child = spawn(process.execPath, [path.join(root, "server.js")], { env: { ...process.env, PORT: String(port), DATA_DIR: path.join(root, "data") }, stdio: "ignore" });
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(base + "/api/info")).ok) return; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail("test server did not start");
  };
  const post = (route, body) => fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  await start();
  assert.equal((await (await fetch(base + "/api/voice/status")).json()).cacheEnabled, false);
  const preview = (await (await post("/api/voice/prepare", { preview: true })).json()).preview;
  assert.equal((await fetch(base + preview.url)).status, 409, "preview cannot create audio before the first explicit activation");
  const entries = buildVoicePack({ voice: "af_heart", addons: [] });
  await mkdir(path.join(root, ".voice/audio"));
  const audio = Buffer.from("a saved voice clip");
  await Promise.all(entries.map((entry) => writeFile(path.join(root, ".voice/audio", `${entry.id}.wav`), audio)));
  const activated = await post("/api/voice/cache", { voice: "af_heart", addons: [] });
  assert.equal(activated.status, 202);
  assert.equal((await activated.json()).cache.state, "ready");
  assert.deepEqual(Buffer.from(await (await fetch(base + preview.url)).arrayBuffer()), audio);
  const crossSite = await fetch(base + "/api/voice/cache", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(crossSite.status, 403);
  await stop(); await start();
  const status = await (await fetch(base + "/api/voice/status")).json();
  assert.equal(status.cacheEnabled, true);
  assert.equal(status.cache.state, "ready");
  await post("/api/voice/prepare", { preview: true });
  assert.deepEqual(Buffer.from(await (await fetch(base + preview.url)).arrayBuffer()), audio);
  assert.equal((await fetch(base + "/api/info")).status, 200);
});
