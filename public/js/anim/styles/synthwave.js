// Synthwave: the figure as neon tubes in a 1980s retro-future. A striped sun sets
// behind wireframe mountains, a magenta grid scrolls across the floor in true
// perspective (the same camera as every other style, so the view buttons still
// work), and the figure is mirrored on the wet floor. Cyan tubes, hot pink where
// the muscles work. Drawn on a 2D canvas, without three.js.

import { asLayer, boxFaces, depthOf, fitCanvas, horizonY, litRegions, projectSegment } from "./flat.js";
import { hash } from "./kit.js";

const CYAN = [33, 246, 255];
const PINK = [255, 43, 214];
const VIOLET = [154, 92, 255];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

// A neon tube: a wide faint glow, a narrower brighter one and a near-white core
// (lite: just a glow and a core). `path` is a Path2D (many lines at once) or points.
const FULL = [[4.2, 0.12], [2.2, 0.28], [1, 0.85], [0.42, 0.95, true]];
const LITE = [[2.6, 0.22], [0.8, 0.9]];
function tube(ctx, path, width, color, alpha = 1, closed = false, lite = false) {
  if (!(path instanceof Path2D)) {
    const pts = path;
    path = new Path2D();
    pts.forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)));
    if (closed) path.closePath();
  }
  for (const [w, a, white] of lite ? LITE : FULL) {
    ctx.strokeStyle = rgba(white ? [255, 255, 255] : color, a * alpha);
    ctx.lineWidth = Math.max(0.6, width * w);
    ctx.stroke(path);
  }
}

export function createFigure() {
  const canvas = asLayer(document.createElement("canvas"), "synthwave");
  let ctx = canvas.getContext("2d");
  // Sky, sun, mountains and scanlines don't move: drawn once per size and view.
  const back = document.createElement("canvas");
  const lines = document.createElement("canvas");
  let backKey = "";
  let J = null;
  let lit = new Set();
  let t = 0;
  let still = false;

  function sky(w, h, hy) {
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, "#070119");
    g.addColorStop(0.55, "#1d0640");
    g.addColorStop(1, "#5a0f6e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hy);
    for (let i = 0; i < 90; i++) {
      const x = hash(i, 1) * w, y = hash(i, 2) * hy * 0.75;
      ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.7 * hash(i, 4) * hash(i, 3)})`;
      ctx.fillRect(x, y, hash(i, 5) < 0.85 ? 1 : 2, hash(i, 5) < 0.85 ? 1 : 2);
    }
  }

  // The sun sits on the horizon: yellow to pink, with bands cut out of its lower half.
  function sun(w, h, hy, cx) {
    const r = Math.max(12, Math.min(Math.min(w, h) * 0.26, hy * 0.86));
    const glow = ctx.createRadialGradient(cx, hy, r * 0.6, cx, hy, r * 2.1);
    glow.addColorStop(0, "rgba(255,80,160,0.35)");
    glow.addColorStop(1, "rgba(255,80,160,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, hy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, hy);
    ctx.clip();
    const g = ctx.createLinearGradient(0, hy - r, 0, hy);
    g.addColorStop(0, "#fff36b");
    g.addColorStop(0.45, "#ff9a3d");
    g.addColorStop(1, "#ff2fa0");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, hy, r, Math.PI, 0);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 7; i++) {
      const y = hy - r * (0.52 - i * 0.078);
      ctx.fillRect(cx - r, y, 2 * r, r * (0.012 + i * 0.011));
    }
    ctx.restore();
  }

  // Two ranges of wireframe mountains along the horizon.
  function mountains(w, hy) {
    for (const [layer, color, height, alpha] of [[0, VIOLET, 0.16, 0.7], [1, CYAN, 0.09, 0.9]]) {
      const pts = [];
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * w;
        const peak = Math.abs(Math.sin(i * 1.7 + layer * 2.3)) * 0.6 + hash(i, layer + 9) * 0.4;
        pts.push({ x, y: hy - peak * height * w * 0.35 * (i % 2 ? 1 : 0.45) });
      }
      ctx.fillStyle = layer ? "#12042a" : "#1a0638";
      ctx.beginPath();
      ctx.moveTo(0, hy);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(w, hy);
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      tube(ctx, pts, 1.1, color, alpha * 0.5);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // The floor grid, 60 cm squares lined up with the view so its lines run to the
  // vanishing point, scrolling toward the viewer and fading with distance.
  function grid(view, w, h, hy) {
    const S = 0.6;
    const e = view.camera.world;
    const fl = Math.hypot(e[8], e[10]) || 1;
    const f = { x: -e[8] / fl, z: -e[10] / fl }, r = { x: -f.z, z: f.x };
    const o = J ? { x: J.pelvis.x, z: J.pelvis.z } : { x: 0, z: 0 };
    const at = (a, b) => ({ x: o.x + r.x * a + f.x * b, y: 0, z: o.z + r.z * a + f.z * b });
    const off = still ? 0 : (t * 0.8) % S;
    // Lines go into four bands by distance, each band one batch of strokes.
    const bands = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const line = (a, b) => {
      const seg = projectSegment(view, a, b);
      if (!seg) return;
      const d = Math.max(0.5, Math.min(depthOf(view, a), depthOf(view, b)));
      const band = bands[d < 3 ? 0 : d < 6 ? 1 : d < 12 ? 2 : 3];
      band.moveTo(seg[0].x, seg[0].y);
      band.lineTo(seg[1].x, seg[1].y);
    };
    for (let i = -40; i <= 40; i++) line(at(i * S, -8), at(i * S, 70));
    for (let j = -12; j <= 110; j++) line(at(-40, j * S - off), at(40, j * S - off));
    ctx.globalCompositeOperation = "lighter";
    bands.forEach((b, i) => tube(ctx, b, 1.4, PINK, [0.7, 0.5, 0.32, 0.16][i], false, true));
    ctx.globalCompositeOperation = "source-over";
    // A haze over the far floor, so the grid melts into the horizon.
    const haze = ctx.createLinearGradient(0, hy, 0, hy + h * 0.07);
    haze.addColorStop(0, "rgba(130,25,150,0.9)");
    haze.addColorStop(1, "rgba(130,25,150,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, hy, w, h * 0.07);
  }

  // The body as tubes: torso outline, limbs, head ring. flip mirrors it in the floor.
  function body(view, u, flip, alpha) {
    const T = (pts, width, color, a, closed = false) => tube(ctx, pts, width, color, a, closed, flip); // the reflection: lite tubes
    const P = (n) => view.project(flip ? { x: J[n].x, y: -J[n].y, z: J[n].z } : J[n]);
    const near = P("hipL").z + P("shoulderL").z < P("hipR").z + P("shoulderR").z ? "L" : "R";
    const far = near === "L" ? "R" : "L";
    const col = (region) => (lit.has(region) ? PINK : CYAN);
    const limb = (s, a) => {
      T(["hip" + s, "knee" + s].map(P), u * 0.022, col("thigh" + s), a);
      T(["knee" + s, "ankle" + s, "heel" + s, "toe" + s, "ankle" + s].map(P), u * 0.02, col("shin" + s), a);
      T(["shoulder" + s, "elbow" + s].map(P), u * 0.02, col("upperArm" + s), a);
      T(["elbow" + s, "wrist" + s, "hand" + s].map(P), u * 0.018, col("forearm" + s), a);
    };
    limb(far, alpha * 0.55);
    T(["shoulderL", "shoulderR", "hipR", "hipL"].map(P), u * 0.022, CYAN, alpha, true);
    if (lit.has("chest")) {
      // A pink heart pulsing in the chest.
      const c = view.project(flip ? { x: J.thoracic.x, y: -J.thoracic.y - 0.1, z: J.thoracic.z } : { x: J.thoracic.x, y: J.thoracic.y + 0.1, z: J.thoracic.z });
      const r = u * 0.05 * (0.9 + 0.2 * Math.abs(Math.sin(t * 4)));
      const heart = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        heart.push({ x: c.x + r * 16 * Math.sin(a) ** 3 / 16, y: c.y - (r * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))) / 16 });
      }
      T(heart, u * 0.012, PINK, alpha, true);
    }
    T(["neckBase", "headJoint"].map(P), u * 0.018, CYAN, alpha);
    const head = P("head");
    const ring = [];
    const r = u * 0.1;
    for (let i = 0; i <= 28; i++) ring.push({ x: head.x + Math.cos((i / 28) * Math.PI * 2) * r * 0.86, y: head.y + Math.sin((i / 28) * Math.PI * 2) * r });
    // Now and then the head tube flickers, like an old sign.
    const flicker = !still && hash(Math.floor(t * 12), 77) < 0.03 ? 0.25 : 1;
    T(ring, u * 0.022, CYAN, alpha * flicker, true);
    limb(near, alpha);
  }

  function draw(view) {
    const { width: w, height: h } = view;
    const dpr = fitCanvas(canvas, w, h);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = ctx.lineJoin = "round";
    // (Before the camera is placed, the projections aren't numbers yet: fall back.)
    const horizon = horizonY(view), centre = view.project({ x: 0, y: 0, z: 0 }).x;
    const hy = Number.isFinite(horizon) ? Math.max(h * 0.12, Math.min(h * 0.8, horizon)) : h * 0.3;
    const sunX = Number.isFinite(centre) ? centre : w / 2;
    const key = `${w}x${h}x${dpr}:${Math.round(hy)}:${Math.round(sunX)}`;
    if (key !== backKey) {
      backKey = key;
      for (const c of [back, lines]) {
        c.width = canvas.width;
        c.height = canvas.height;
      }
      const real = ctx;
      ctx = back.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = ctx.lineJoin = "round";
      sky(w, h, hy);
      sun(w, h, hy, sunX);
      mountains(w, hy);
      const g = ctx.createLinearGradient(0, hy, 0, h);
      g.addColorStop(0, "#220846");
      g.addColorStop(1, "#06010f");
      ctx.fillStyle = g;
      ctx.fillRect(0, hy, w, h - hy);
      ctx = lines.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "rgba(0,0,0,0.13)";
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      ctx = real;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(back, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    grid(view, w, h, hy);
    if (!J) return;
    const u = view.scaleAt(J.pelvis);
    // The wet floor: the figure mirrored below it, faint.
    ctx.globalCompositeOperation = "lighter";
    body(view, u, true, 0.22);
    ctx.globalCompositeOperation = "source-over";
    // The step: dark faces that hide the grid, neon violet edges.
    for (const spec of view.props) {
      for (const f of boxFaces(spec, view)) {
        ctx.fillStyle = f.light === 1 ? "#1b0838" : "#10042a";
        ctx.beginPath();
        f.pts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        tube(ctx, f.pts, u * 0.012, VIOLET, 0.8, true);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.globalCompositeOperation = "lighter";
    body(view, u, false, 1);
    ctx.globalCompositeOperation = "source-over";
    // Scanlines.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lines, 0, 0);
  }

  return {
    dom: canvas,
    update(joints, info = {}) {
      J = joints;
      still = !!info.still;
      t = performance.now() / 1000;
    },
    draw,
    setHighlight(groups) {
      lit = litRegions(groups);
    },
    setPulse() {},
    setTheme() {},
    snapshot: () => canvas.toDataURL("image/png"),
    dispose: () => canvas.remove(),
  };
}
