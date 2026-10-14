// The 3D stage: renderer, lights, floor, camera and the clip player.
//
//   const stage = new Stage(element, { onCue });
//   stage.load("gobletsquat");      // plays the exercise's clips in a loop
//   stage.setView("side"); stage.setSpeed(0.5); stage.pause();
//
// Clips are defined in ./clips/*.js (see clips/README in the project README).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { computeJoints, lerpPose, makePose, mirrorPose } from "./rig.js";
import { createMannequin } from "./mannequin.js";
import { applyPalette, createBand, createDumbbell, createMaterials, createProp } from "./props.js";
import { getAnimation } from "./clips/index.js";

const EASE = {
  lin: (t) => t,
  inOut: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  in: (t) => 1 - Math.cos((Math.PI * t) / 2),
  out: (t) => Math.sin((Math.PI * t) / 2),
  hold: (t) => (t < 1 ? 0 : 1),
};

const VIEWS = {
  front: [0.32, 0.18, 1],
  side: [1, 0.16, 0.12],
  three: [0.78, 0.26, 0.74],
  back: [-0.35, 0.25, -1],
  left: [1, 0.16, 0.12],
  right: [-1, 0.16, 0.12],
  top: [0.3, 1.2, 0.6],
};

function isDark() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === "dark";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function mirrorSpec(spec) {
  const pos = spec.pos ? [-spec.pos[0], spec.pos[1] || 0, spec.pos[2] || 0] : spec.pos;
  return { ...spec, pos, rotY: spec.rotY ? -spec.rotY : spec.rotY };
}

const swapSide = (s) => (typeof s === "string" ? s.replace(/L$/, "§").replace(/R$/, "L").replace(/§$/, "R") : Array.isArray(s) ? [-s[0], s[1], s[2]] : s);

// Turns an authored clip into absolute, full poses ready for sampling.
export function prepareClip(raw) {
  const keys = raw.keys.map((k) => ({ t: k.t, pose: makePose(k.p), cue: k.cue || "", e: k.e || "inOut" }));
  const first = keys[0];
  const last = keys[keys.length - 1];
  const same = JSON.stringify(first.pose) === JSON.stringify(last.pose);
  if (!same && raw.close !== false) keys.push({ t: last.t + (raw.closeTime ?? 0.8), pose: first.pose, cue: raw.closeCue || "", e: "inOut" });
  const half = keys[keys.length - 1].t;
  let all = keys;
  if (raw.alternate) {
    const second = keys.slice(1).map((k) => ({ ...k, t: k.t + half, pose: mirrorPose(k.pose), cue: k.cue }));
    all = keys.concat(second);
  }
  return {
    title: raw.title || "",
    keys: all,
    duration: all[all.length - 1].t,
    half: raw.alternate ? half : null,
    loops: raw.loops ?? null,
    props: raw.props || [],
    hold: raw.hold || null,
    bands: raw.bands || [],
    camera: raw.camera || { view: "three" },
    highlight: raw.highlight || [],
    floorScroll: raw.floorScroll || 0,
    effects: raw.effects || [],
    thumb: raw.thumb ?? null,
  };
}

export function sampleClip(clip, time) {
  const tt = clip.duration > 0 ? ((time % clip.duration) + clip.duration) % clip.duration : 0;
  const keys = clip.keys;
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= tt) i++;
  const a = keys[i];
  const b = keys[i + 1] || a;
  const span = b.t - a.t;
  const raw = span > 0 ? Math.min(1, Math.max(0, (tt - a.t) / span)) : 1;
  const alpha = (EASE[b.e] || EASE.inOut)(raw);
  let cue = a.cue;
  for (let j = i; !cue && j >= 0; j--) cue = keys[j].cue;
  return { pose: lerpPose(a.pose, b.pose, alpha), cue, mirrored: clip.half != null && tt >= clip.half, phase: tt / clip.duration };
}

export class Stage {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = { interactive: true, preserve: false, autoplay: true, ...opts };
    this.onCue = opts.onCue || (() => {});
    this.speed = 1;
    this.time = 0;
    this.playing = this.opts.autoplay;
    this.clips = [];
    this.clipIndex = 0;
    this.clipLoops = 0;
    this.rep = 0;
    this.userMoved = false;
    this.visible = true;
    this.dark = isDark();

    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: this.opts.preserve });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.domElement.className = "stage-canvas";
    container.appendChild(r.domElement);
    this.renderer = r;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
    this.camTarget = new THREE.Vector3(0, 0.9, 0);
    this.camGoal = null;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.15);
    scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.2, 4.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.4;
    key.shadow.camera.right = 2.4;
    key.shadow.camera.top = 2.6;
    key.shadow.camera.bottom = -2.4;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 12;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc8ff, 0.7);
    rim.position.set(-3, 2.5, -2.5);
    scene.add(rim);

    this.buildFloor();

    this.M = createMaterials(this.dark);
    this.man = createMannequin();
    this.man.setTheme(this.dark);
    scene.add(this.man.group);

    this.dumbbells = { L: createDumbbell(this.M), R: createDumbbell(this.M), goblet: createDumbbell(this.M, 1.15) };
    Object.values(this.dumbbells).forEach((d) => {
      d.visible = false;
      scene.add(d);
    });
    this.bandPool = [createBand(this.M), createBand(this.M), createBand(this.M, true)];
    this.bandPool.forEach((b) => {
      b.mesh.visible = false;
      scene.add(b.mesh);
    });
    this.stringLine = createBand(this.M, true);
    this.stringLine.mesh.visible = false;
    scene.add(this.stringLine.mesh);

    this.propGroups = [new THREE.Group(), new THREE.Group()];
    this.propGroups.forEach((g) => scene.add(g));

    if (this.opts.interactive) {
      const c = new OrbitControls(this.camera, r.domElement);
      c.enableDamping = true;
      c.dampingFactor = 0.08;
      c.enablePan = false;
      c.minDistance = 1.4;
      c.maxDistance = 9;
      c.maxPolarAngle = Math.PI * 0.495;
      c.addEventListener("start", () => {
        this.userMoved = true;
        this.camGoal = null;
      });
      this.controls = c;
    }

    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(container);
    }
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver((entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        this.updateLoop();
      });
      this.io.observe(container);
    }
    this.mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    this.onScheme = () => this.setTheme(isDark());
    this.mq && this.mq.addEventListener && this.mq.addEventListener("change", this.onScheme);

    this.lastNow = performance.now();
    this.updateLoop();
  }

  buildFloor() {
    const size = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    this.floorCanvas = cv;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const grid = document.createElement("canvas");
    grid.width = grid.height = 128;
    this.gridCanvas = grid;
    const gridTex = new THREE.CanvasTexture(grid);
    gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
    gridTex.repeat.set(10, 10);
    this.gridTex = gridTex;
    const fade = document.createElement("canvas");
    fade.width = fade.height = 256;
    const fx = fade.getContext("2d");
    const fg = fx.createRadialGradient(128, 128, 30, 128, 128, 128);
    fg.addColorStop(0, "#fff");
    fg.addColorStop(1, "#000");
    fx.fillStyle = fg;
    fx.fillRect(0, 0, 256, 256);
    const fadeTex = new THREE.CanvasTexture(fade);

    const base = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.95, metalness: 0 }));
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    const lines = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.4),
      new THREE.MeshBasicMaterial({ map: gridTex, alphaMap: fadeTex, transparent: true, depthWrite: false, opacity: 0.5 })
    );
    lines.rotation.x = -Math.PI / 2;
    lines.position.y = 0.002;
    // Shadow catcher on top so shadows read strongly on the gradient.
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.ShadowMaterial({ opacity: 0.28 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.003;
    shadow.receiveShadow = true;
    this.floorTex = tex;
    this.scene.add(base, lines, shadow);
    this.paintFloor();
  }

  paintFloor() {
    const dark = this.dark;
    const x = this.floorCanvas.getContext("2d");
    const s = this.floorCanvas.width;
    x.clearRect(0, 0, s, s);
    const g = x.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s / 2);
    g.addColorStop(0, dark ? "rgba(70,86,108,0.95)" : "rgba(214,222,232,1)");
    g.addColorStop(0.55, dark ? "rgba(40,52,68,0.75)" : "rgba(226,232,240,0.85)");
    g.addColorStop(1, dark ? "rgba(20,28,38,0)" : "rgba(240,244,248,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    this.floorTex.needsUpdate = true;
    const gx = this.gridCanvas.getContext("2d");
    gx.clearRect(0, 0, 128, 128);
    gx.strokeStyle = dark ? "rgba(160,190,220,0.35)" : "rgba(80,100,130,0.28)";
    gx.lineWidth = 2;
    gx.strokeRect(0, 0, 128, 128);
    this.gridTex.needsUpdate = true;
  }

  setTheme(dark) {
    this.dark = dark;
    this.man.setTheme(dark);
    applyPalette(this.M, dark);
    this.hemi.groundColor.set(dark ? 0x334455 : 0x8899aa);
    this.paintFloor();
    this.render();
  }

  // Reserves `px` CSS pixels at the bottom for an overlay (the cue bar): the
  // clip's whole framing is drawn above it, with a little extra floor around.
  setInset(px) {
    this.inset = Math.max(0, px || 0);
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const inset = Math.min(this.inset || 0, h * 0.35);
    if (inset > 0) {
      const fh = h - inset;
      const fw = (w * fh) / h;
      this.camera.setViewOffset(fw, fh, -(w - fw) / 2, 0, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.render();
  }

  load(id, { view } = {}) {
    const anim = getAnimation(id);
    this.id = id;
    this.anim = anim;
    this.clips = anim ? anim.clips.map(prepareClip) : [];
    this.clipIndex = 0;
    this.time = 0;
    this.rep = 0;
    this.clipLoops = 0;
    this.lastCue = null;
    this.userMoved = false;
    this.forcedView = view || null;
    this.applyClip(true);
    this.render();
    return !!anim;
  }

  get clip() {
    return this.clips[this.clipIndex];
  }

  applyClip(snapCamera = false) {
    const clip = this.clip;
    this.propGroups.forEach((g) => g.clear());
    if (!clip) return;
    for (const spec of clip.props) {
      this.propGroups[0].add(createProp(spec, this.M));
      this.propGroups[1].add(createProp(mirrorSpec(spec), this.M));
    }
    this.propGroups[1].visible = false;
    this.man.setHighlight(clip.highlight);
    // Keep a camera angle the user chose by dragging; otherwise follow the clip's view.
    if (snapCamera || !this.userMoved) this.setView(this.forcedView || clip.camera.view || "three", snapCamera);
    this.onCue({ cue: "", rep: this.rep, title: clip.title, clipIndex: this.clipIndex, clipCount: this.clips.length });
  }

  setView(view, snap = false) {
    const clip = this.clip;
    const cam = (clip && clip.camera) || {};
    const target = new THREE.Vector3(...(cam.target || [0, 0.9, 0]));
    const dist = cam.dist || 3.4;
    const dir = Array.isArray(view) ? new THREE.Vector3(...view) : new THREE.Vector3(...(VIEWS[view] || VIEWS.three));
    dir.normalize();
    const pos = target.clone().addScaledVector(dir, dist);
    this.viewName = Array.isArray(view) ? "custom" : view;
    if (snap) {
      this.camera.position.copy(pos);
      this.camTarget.copy(target);
      this.camera.lookAt(target);
      if (this.controls) {
        this.controls.target.copy(target);
        this.controls.update();
      }
      this.camGoal = null;
    } else {
      this.camGoal = { pos, target, t: 0 };
    }
    this.render();
  }

  setSpeed(s) {
    this.speed = s;
  }
  play() {
    this.playing = true;
    this.lastNow = performance.now();
    this.updateLoop();
  }
  pause() {
    this.playing = false;
    this.updateLoop();
  }
  toggle() {
    this.playing ? this.pause() : this.play();
    return this.playing;
  }
  nextClip(step = 1) {
    if (!this.clips.length) return;
    this.clipIndex = (this.clipIndex + step + this.clips.length) % this.clips.length;
    this.time = 0;
    this.clipLoops = 0;
    this.applyClip(false);
  }

  updateLoop() {
    const run = this.playing && this.visible && this.clips.length > 0;
    this.renderer.setAnimationLoop(run ? () => this.tick() : null);
    if (!run) this.render();
  }

  tick() {
    const now = performance.now();
    const dt = Math.min((now - this.lastNow) / 1000, 0.1) * this.speed;
    this.lastNow = now;
    const clip = this.clip;
    if (clip) {
      const before = Math.floor(this.time / clip.duration);
      this.time += dt;
      const after = Math.floor(this.time / clip.duration);
      if (after > before) {
        this.rep += 1;
        this.clipLoops += 1;
        const limit = clip.loops ?? (this.clips.length > 1 ? 2 : Infinity);
        if (this.clipLoops >= limit && this.clips.length > 1) {
          this.clipIndex = (this.clipIndex + 1) % this.clips.length;
          this.time = 0;
          this.clipLoops = 0;
          this.applyClip(false);
        }
      }
    }
    this.render();
  }

  // Poses the figure for the current time (or an explicit time) and draws one frame.
  render(time = null) {
    const clip = this.clip;
    if (clip) {
      const s = sampleClip(clip, time == null ? this.time : time);
      const J = computeJoints(s.pose);
      this.man.update(J);
      this.propGroups[0].visible = !s.mirrored;
      this.propGroups[1].visible = s.mirrored;
      this.updateAttachments(clip, J, s.mirrored);
      this.man.setPulse(0.5 + 0.5 * Math.sin(s.phase * Math.PI * 2));
      if (clip.floorScroll) this.gridTex.offset.y = ((time == null ? this.time : time) * clip.floorScroll) % 1;
      if (s.cue !== this.lastCue || this.rep !== this.lastRep) {
        this.lastCue = s.cue;
        this.lastRep = this.rep;
        this.onCue({ cue: s.cue, rep: this.rep, title: clip.title, clipIndex: this.clipIndex, clipCount: this.clips.length });
      }
    }
    if (this.camGoal) {
      const g = this.camGoal;
      g.t = Math.min(1, g.t + 0.06);
      const k = EASE.inOut(g.t);
      this.camera.position.lerp(g.pos, k);
      this.camTarget.lerp(g.target, k);
      if (g.t >= 1) this.camGoal = null;
    }
    if (this.controls) {
      if (this.camGoal || !this.userMoved) this.controls.target.copy(this.camTarget);
      this.controls.update();
    } else {
      this.camera.lookAt(this.camTarget);
    }
    this.renderer.render(this.scene, this.camera);
  }

  updateAttachments(clip, J, mirrored) {
    const hold = clip.hold ? (mirrored ? mirrorHold(clip.hold) : clip.hold) : null;
    const d = this.dumbbells;
    d.L.visible = d.R.visible = d.goblet.visible = false;
    if (hold) {
      if (hold.goblet) {
        const mid = J.handL.clone().lerp(J.handR, 0.5);
        d.goblet.visible = true;
        d.goblet.position.copy(mid).add(new THREE.Vector3(0, 0, 0.035).applyMatrix4(J.Rc));
        const up = new THREE.Vector3(0, 1, 0).applyMatrix4(J.Rc);
        d.goblet.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), up);
      }
      for (const s of ["L", "R"]) {
        if (!hold[s]) continue;
        const db = d[s];
        db.visible = true;
        db.position.copy(J["hand" + s]);
        const fore = J["foreDir" + s];
        const axisName = hold.axis || "x";
        let ref;
        if (axisName === "z") ref = new THREE.Vector3(0, 0, 1).applyMatrix4(J.Rc);
        else if (axisName === "y") ref = new THREE.Vector3(0, 1, 0);
        else if (axisName === "wz") ref = new THREE.Vector3(0, 0, 1);
        else if (axisName === "wx") ref = new THREE.Vector3(1, 0, 0);
        else ref = new THREE.Vector3(1, 0, 0).applyMatrix4(J.Rc);
        const axis = ref.addScaledVector(fore, -ref.dot(fore));
        if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
        db.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis.normalize());
      }
    }
    this.bandPool.forEach((b) => (b.mesh.visible = false));
    clip.bands.forEach((spec, i) => {
      const band = this.bandPool[i];
      if (!band) return;
      const a = this.point(mirrored ? swapSide(spec.a) : spec.a, J);
      const b = this.point(mirrored ? swapSide(spec.b) : spec.b, J);
      if (!a || !b) return;
      band.mesh.visible = true;
      band.set(a, b);
    });
    const showString = clip.effects.includes("string");
    this.stringLine.mesh.visible = showString;
    if (showString) {
      const top = J.head.clone().add(new THREE.Vector3(0, 0.11, 0).applyMatrix4(J.Rh));
      this.stringLine.set(top, top.clone().add(new THREE.Vector3(0, 1.4, 0)));
    }
  }

  point(ref, J) {
    if (Array.isArray(ref)) return new THREE.Vector3(...ref);
    if (typeof ref === "string" && J[ref]) return J[ref].clone();
    return null;
  }

  // Renders a still image of clip `clipIndex` at time `t`; used by the library thumbnails.
  snapshot(id, clipIndex = 0, t = null, view = null) {
    if (this.id !== id) this.load(id, { view });
    if (this.clipIndex !== clipIndex && this.clips[clipIndex]) {
      this.clipIndex = clipIndex;
      this.applyClip(true);
    }
    if (view) this.setView(view, true);
    const clip = this.clip;
    const time = t == null && clip ? thumbTime(clip) : t || 0;
    this.render(time);
    return this.renderer.domElement.toDataURL("image/png");
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.ro && this.ro.disconnect();
    this.io && this.io.disconnect();
    this.mq && this.mq.removeEventListener && this.mq.removeEventListener("change", this.onScheme);
    this.controls && this.controls.dispose();
    this.man.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// The most telling moment of a clip for a still image: its `thumb` time if set,
// otherwise the key (on the first side) where the body is furthest from the start.
function thumbTime(clip) {
  if (clip.thumb != null) return clip.thumb;
  const end = clip.half ?? clip.duration;
  const start = computeJoints(clip.keys[0].pose);
  let best = clip.duration * 0.45;
  let bestD = 0.02;
  for (const k of clip.keys) {
    if (k.t >= end) break;
    const J = computeJoints(k.pose);
    let d = 0;
    for (const n of ["head", "handL", "handR", "kneeL", "kneeR", "ankleL", "ankleR", "pelvis"]) d += J[n].distanceTo(start[n]);
    if (d > bestD) {
      bestD = d;
      best = k.t;
    }
  }
  return best;
}

function mirrorHold(h) {
  return { ...h, L: h.R, R: h.L };
}
