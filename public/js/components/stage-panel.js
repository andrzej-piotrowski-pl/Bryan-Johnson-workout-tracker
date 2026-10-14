// The 3D exercise viewer: wraps anim/stage.js with play/pause, speed, camera
// buttons, clip switching and the cue line. The three.js engine is loaded on
// first use, so the rest of the app never waits for it.

import { icon } from "./icons.js";

let enginePromise = null;
const loadEngine = () => (enginePromise ||= import("../anim/stage.js"));

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const SPEEDS = [0.5, 1, 1.5];
// Height of the cue bar plus its margin, kept clear of the figure.
const CUE_SPACE = 64;

export function createStagePanel(container) {
  container.classList.add("stage");
  container.innerHTML = `
    <div class="ctrls">
      <button type="button" class="btn sm icon-only" data-a="play" aria-label="Pause animation">${icon("pause")}</button>
      <button type="button" class="btn sm mono" data-a="speed" aria-label="Animation speed">1×</button>
    </div>
    <div class="views" role="group" aria-label="Camera">
      <button type="button" class="btn sm" data-view="front">Front</button>
      <button type="button" class="btn sm" data-view="side">Side</button>
      <button type="button" class="btn sm" data-view="three">3/4</button>
    </div>
    <div class="cue"><span class="clip-nav"></span><span class="cue-text"><span class="ttl"></span><span class="txt">Loading 3D…</span></span><span class="rep"></span></div>`;
  const cueEl = container.querySelector(".cue .txt");
  const repEl = container.querySelector(".cue .rep");
  const titleEl = container.querySelector(".cue .ttl");
  const navEl = container.querySelector(".cue .clip-nav");
  const playBtn = container.querySelector('[data-a="play"]');
  const speedBtn = container.querySelector('[data-a="speed"]');
  let stage = null;
  let wanted = null;
  let speed = 1;
  let disposed = false;

  function onCue({ cue, rep, title, clipIndex, clipCount }) {
    cueEl.textContent = cue || title || "";
    repEl.textContent = rep ? `rep ${rep}` : "";
    navEl.innerHTML =
      clipCount > 1
        ? `<button type="button" class="btn sm icon-only" data-clip="-1" aria-label="Previous variation">${icon("chevronL", "sm")}</button><span class="mono">${clipIndex + 1}/${clipCount}</span><button type="button" class="btn sm icon-only" data-clip="1" aria-label="Next variation">${icon("chevronR", "sm")}</button>`
        : "";
    titleEl.textContent = title || "";
  }

  function fail(message) {
    container.querySelectorAll(".ctrls, .views, .cue").forEach((el) => (el.hidden = true));
    let box = container.querySelector(".no3d");
    if (!box) {
      box = document.createElement("div");
      box.className = "no3d";
      container.appendChild(box);
    }
    box.textContent = message;
  }

  if (!webglAvailable()) {
    fail("3D animations need WebGL, which this browser has turned off. The steps and videos below still work.");
  } else {
    loadEngine()
      .then(({ Stage }) => {
        if (disposed) return;
        stage = new Stage(container, { onCue });
        stage.setInset(CUE_SPACE);
        stage.setSpeed(speed);
        if (wanted) load(wanted);
      })
      .catch((err) => {
        console.error(err);
        fail("The 3D engine didn't load. Run `npm install` in the project folder, then reload.");
      });
  }

  function load(id) {
    wanted = id;
    if (!stage) return;
    container.querySelector(".no3d")?.remove();
    container.querySelectorAll(".ctrls, .views, .cue").forEach((el) => (el.hidden = false));
    const ok = stage.load(id);
    if (!ok) {
      cueEl.textContent = "No animation for this one yet — see the steps and videos.";
      titleEl.textContent = "";
      navEl.innerHTML = "";
    }
    if (!stage.playing) stage.play();
    playBtn.innerHTML = icon("pause");
    playBtn.setAttribute("aria-label", "Pause animation");
  }

  container.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !stage) return;
    if (b.dataset.a === "play") {
      const playing = stage.toggle();
      b.innerHTML = icon(playing ? "pause" : "play");
      b.setAttribute("aria-label", playing ? "Pause animation" : "Play animation");
    } else if (b.dataset.a === "speed") {
      speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
      stage.setSpeed(speed);
      b.textContent = `${speed}×`;
    } else if (b.dataset.view) {
      stage.userMoved = false;
      stage.setView(b.dataset.view);
    } else if (b.dataset.clip) {
      stage.nextClip(Number(b.dataset.clip));
    }
  });

  return {
    load,
    pause: () => stage && stage.pause(),
    play: () => stage && stage.play(),
    dispose() {
      disposed = true;
      if (stage) stage.dispose();
    },
  };
}
