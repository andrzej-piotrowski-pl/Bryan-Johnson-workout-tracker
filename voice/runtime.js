import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const VOICE_DIR = path.join(ROOT, ".voice");
export const MODEL = "kokoro-int8-multi-lang-v1_0";
export const MODEL_SHA = "4c3052abaa60943a341f193888cf6abd68787dae6ab8ae5c925a706caa247e4e";

export function nativeEnv() {
  const platform = process.platform === "win32" ? "win" : process.platform;
  const lib = path.join(ROOT, "voice", "node_modules", `sherpa-onnx-${platform}-${process.arch}`);
  return { ...process.env, LD_LIBRARY_PATH: [lib, process.env.LD_LIBRARY_PATH].filter(Boolean).join(path.delimiter), DYLD_LIBRARY_PATH: [lib, process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(path.delimiter), PATH: [lib, process.env.PATH].filter(Boolean).join(path.delimiter) };
}
