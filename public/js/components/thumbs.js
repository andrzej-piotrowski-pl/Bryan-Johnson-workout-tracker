// Still images of the 3D animations for the exercise library (and the animation
// style cards in Settings), rendered one at a time by a single hidden stage and
// cached for the session.

import { animStyleFor } from "../anim-styles.js";

const cache = new Map();
let stagePromise = null;
let queue = Promise.resolve();

function getStage() {
  if (!stagePromise) {
    stagePromise = import("../anim/stage.js").then(({ Stage }) => {
      const box = document.createElement("div");
      box.style.cssText = "position:fixed;left:-10000px;top:0;width:320px;height:240px;pointer-events:none";
      document.body.appendChild(box);
      return new Stage(box, { interactive: false, preserve: true, autoplay: false });
    });
  }
  return stagePromise;
}

// style: the animation style to draw it in; by default the one the exercise shows in.
export function thumbnail(id, style = animStyleFor(id)) {
  const root = document.documentElement;
  const dark = root.dataset.scheme ? root.dataset.scheme === "dark" : root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const key = `${id}:${root.dataset.skin || ""}:${dark ? "d" : "l"}:${style}`;
  if (cache.has(key)) return cache.get(key);
  const p = (queue = queue.then(async () => {
    await new Promise(requestAnimationFrame);
    const stage = await getStage();
    stage.setTheme(dark);
    await stage.setStyle(style);
    return stage.snapshot(id);
  }));
  cache.set(key, p);
  return p;
}
