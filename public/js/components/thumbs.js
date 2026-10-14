// Still images of the 3D animations for the exercise library, rendered one at a
// time by a single hidden stage and cached for the session.

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

export function thumbnail(id) {
  const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const key = `${id}:${dark ? "d" : "l"}`;
  if (cache.has(key)) return cache.get(key);
  const p = (queue = queue.then(async () => {
    const stage = await getStage();
    stage.setTheme(dark);
    return stage.snapshot(id);
  }));
  cache.set(key, p);
  return p;
}
