// Native inference is isolated so a model failure cannot take down workout saves.
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, rename } from "node:fs/promises";
import { VOICE_DIR } from "./runtime.js";

const require = createRequire(import.meta.url);
const { OfflineTts, writeWave } = require("sherpa-onnx-node");
const model = path.join(VOICE_DIR, "model");
const started = Date.now();
const tts = new OfflineTts({
  model: { kokoro: { model: path.join(model, "model.int8.onnx"), voices: path.join(model, "voices.bin"), tokens: path.join(model, "tokens.txt"), dataDir: path.join(model, "espeak-ng-data"), lexicon: path.join(model, "lexicon-us-en.txt"), lang: "en-us" }, numThreads: 2, provider: "cpu", debug: 0 },
  maxNumSentences: 1,
});

if (process.argv.includes("--check")) {
  const before = Date.now();
  const audio = tts.generate({ text: "Ten seconds left. Get ready for the next step.", sid: 3, speed: 1 });
  console.log(JSON.stringify({ loadMs: before - started, generateMs: Date.now() - before, audioSeconds: audio.samples.length / audio.sampleRate, rssMB: Math.round(process.memoryUsage().rss / 1048576) }));
} else {
  process.send?.({ ready: true });
  process.on("message", async ({ id, text, sid, speed, file }) => {
    try {
      const audio = tts.generate({ text, sid, speed });
      await mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeWave(tmp, { samples: audio.samples, sampleRate: audio.sampleRate });
      await rename(tmp, file);
      process.send?.({ id, duration: audio.samples.length / audio.sampleRate });
    } catch (err) {
      process.send?.({ id, error: err.message });
    }
  });
  process.on("disconnect", () => process.exit());
}
