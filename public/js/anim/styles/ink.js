// Ink brush: the figure painted in sumi-e brush strokes on rice paper. Each limb is
// one stroke that swells and lifts, with dry-brush streaks; the near side in black
// ink, the far side in a grey wash; the head an ensō circle; vermilion washes under
// the worked muscles. Old frames fade slowly, so the movement leaves a trail of ink.
// Drawn on 2D canvases, without three.js.

import { asLayer, boxFaces, fitCanvas, litRegions, smooth } from "./flat.js";
import { hash } from "./kit.js";

const PAPER = "#efe6d2";
const INK = [26, 22, 18];
const RED = [196, 52, 30];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

let paperTile = null;
function paper() {
  if (paperTile) return paperTile;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = PAPER;
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    x.fillStyle = hash(i, 1) < 0.5 ? "rgba(120,100,70,0.06)" : "rgba(255,255,255,0.12)";
    x.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 1 + hash(i, 4) * 1.5, 1 + hash(i, 5) * 1.5);
  }
  x.lineCap = "round";
  for (let i = 0; i < 140; i++) {
    const px = hash(i, 6) * 256, py = hash(i, 7) * 256, a = hash(i, 8) * Math.PI * 2, l = 8 + hash(i, 9) * 34;
    x.strokeStyle = `rgba(130,110,80,${0.05 + hash(i, 10) * 0.07})`;
    x.lineWidth = 0.5 + hash(i, 11) * 0.7;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a + 0.5) * l * 0.5, py + Math.sin(a + 0.5) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.stroke();
  }
  return (paperTile = c);
}

// One brush stroke through screen points: it presses in, runs, and lifts off.
function brush(ctx, pts, width, color, seed, { lift = 0.2, dry = 3 } = {}) {
  const path = smooth(pts, 8);
  const n = path.length;
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  const total = L[n - 1];
  if (total < 2) return;
  const left = [], right = [], radius = [], normal = [];
  for (let i = 0; i < n; i++) {
    const s = L[i] / total;
    const press = Math.min(1, s / 0.12) ** 0.5 * Math.min(1, (1 - s) / lift) ** 0.8;
    const r = (width / 2) * (0.3 + 0.7 * press) * (1 + 0.14 * (hash(seed, i) - 0.5));
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
    let nx = a.y - b.y, ny = b.x - a.x;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    radius.push(r);
    normal.push([nx, ny]);
    left.push([path[i].x + nx * r, path[i].y + ny * r]);
    right.push([path[i].x - nx * r, path[i].y - ny * r]);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(...left[0]);
  for (const p of left) ctx.lineTo(...p);
  for (const p of right.reverse()) ctx.lineTo(...p);
  ctx.closePath();
  ctx.fill();
  // Dry-brush streaks: thin lines where the bristles ran out of ink.
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  for (let k = 0; k < dry; k++) {
    const off = hash(seed, 50 + k) * 1.5 - 0.75;
    const from = Math.floor(n * (0.25 + 0.5 * hash(seed, 60 + k)));
    ctx.strokeStyle = `rgba(0,0,0,${0.35 + 0.3 * hash(seed, 70 + k)})`;
    ctx.lineWidth = 0.6 + width * 0.035;
    ctx.beginPath();
    for (let i = from; i < n; i++) ctx.lineTo(path[i].x + normal[i][0] * radius[i] * off, path[i].y + normal[i][1] * radius[i] * off);
    ctx.stroke();
  }
  ctx.restore();
}

// An ensō: a circle in one stroke, heavy where the brush lands, dry where it leaves.
function enso(ctx, c, r, width, color) {
  const a0 = 2.4, sweep = Math.PI * 1.8, N = 56;
  const outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, a = a0 - sweep * s;
    const w = width * Math.min(1, s / 0.05) ** 0.5 * (1 - 0.7 * s) * (1 + 0.12 * (hash(7, i) - 0.5));
    outer.push([c.x + Math.cos(a) * (r + w / 2), c.y + Math.sin(a) * (r + w / 2)]);
    inner.push([c.x + Math.cos(a) * (r - w / 2), c.y + Math.sin(a) * (r - w / 2)]);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const p of outer) ctx.lineTo(...p);
  for (const p of inner.reverse()) ctx.lineTo(...p);
  ctx.closePath();
  ctx.fill();
}

// A soft vermilion wash along a few points.
function wash(ctx, pts, width, alpha) {
  ctx.save();
  ctx.lineCap = ctx.lineJoin = "round";
  for (const [k, a] of [[1, 0.35], [0.7, 0.45], [0.42, 0.55]]) {
    ctx.strokeStyle = rgba(RED, alpha * a);
    ctx.lineWidth = width * k;
    ctx.beginPath();
    for (const p of pts) ctx.lineTo(p.x, p.y);
    if (pts.length === 1) ctx.lineTo(pts[0].x + 0.1, pts[0].y);
    ctx.stroke();
  }
  ctx.restore();
}

// The red seal stamp in the corner, with 人 ("person") cut in two strokes.
function seal(ctx, x, y, s) {
  ctx.fillStyle = "#b8321c";
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, s * 0.12);
  ctx.fill();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = s * 0.11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y + s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.45, y + s * 0.6, x + s * 0.2, y + s * 0.8);
  ctx.moveTo(x + s * 0.48, y + s * 0.45);
  ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.7, x + s * 0.82, y + s * 0.8);
  ctx.stroke();
}

export function createFigure() {
  const layer = asLayer(document.createElement("div"), "ink");
  layer.style.background = `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(90,70,40,0.2)), ${PAPER} url(${paper().toDataURL()})`;
  const still = document.createElement("canvas"); // ground, step and seal: redrawn every frame
  const trail = document.createElement("canvas"); // the figure: old frames fade away
  for (const c of [still, trail]) {
    c.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    layer.appendChild(c);
  }
  let J = null;
  let lit = new Set();
  let beat = 1;
  let last = 0;
  let size = [1, 1];

  function draw(view) {
    const { width: w, height: h } = view;
    size = [w, h];
    const dpr = fitCanvas(still, w, h);
    fitCanvas(trail, w, h);
    const sx = still.getContext("2d"), tx = trail.getContext("2d");
    sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sx.clearRect(0, 0, w, h);
    seal(sx, 14, 14, 26);
    const now = performance.now() / 1000;
    const dt = now - last;
    last = now;
    tx.save();
    tx.globalCompositeOperation = "destination-out";
    tx.fillStyle = `rgba(0,0,0,${dt > 0.25 ? 1 : 1 - Math.exp(-dt / 0.08)})`;
    tx.fillRect(0, 0, w, h);
    tx.restore();
    if (!J) return;
    const u = view.scaleAt(J.pelvis);

    // Ground and step, in a light grey ink.
    const g = view.project({ x: J.pelvis.x, y: 0, z: J.pelvis.z });
    brush(sx, [{ x: g.x - u * 0.75, y: g.y + u * 0.02 }, { x: g.x + u * 0.1, y: g.y + u * 0.03 }, { x: g.x + u * 0.8, y: g.y + u * 0.015 }], u * 0.05, rgba(INK, 0.22), 3, { dry: 2 });
    sx.lineJoin = "round";
    for (const spec of view.props) {
      for (const f of boxFaces(spec, view)) {
        sx.strokeStyle = rgba(INK, 0.55);
        sx.lineWidth = Math.max(1, u * 0.008);
        sx.beginPath();
        f.pts.forEach((p, i) => sx.lineTo(p.x + (hash(i, f.light * 9) - 0.5) * 1.5, p.y));
        sx.closePath();
        sx.fillStyle = PAPER; // faces painted far to near hide the edges behind them
        sx.fill();
        sx.fillStyle = f.light === 1 ? "rgba(60,50,40,0.06)" : "rgba(60,50,40,0.16)";
        sx.fill();
        sx.stroke();
      }
    }

    // The figure: red washes first, then ink, far side in grey.
    const P = (n) => view.project(J[n]);
    const near = P("hipL").z + P("shoulderL").z < P("hipR").z + P("shoulderR").z ? "L" : "R";
    for (const s of ["L", "R"]) {
      if (lit.has("thigh" + s)) wash(tx, [P("hip" + s), P("knee" + s)], u * 0.2, 0.55 * beat);
      if (lit.has("shin" + s)) wash(tx, [P("knee" + s), P("ankle" + s)], u * 0.16, 0.55 * beat);
      if (lit.has("upperArm" + s)) wash(tx, [P("shoulder" + s), P("elbow" + s)], u * 0.15, 0.55 * beat);
      if (lit.has("forearm" + s)) wash(tx, [P("elbow" + s), P("wrist" + s)], u * 0.13, 0.55 * beat);
    }
    if (lit.has("chest")) wash(tx, [view.project(J.thoracic.clone().lerp(J.neckBase, 0.4))], u * 0.36, 0.6 * beat);
    if (lit.has("pelvis")) wash(tx, [P("pelvis")], u * 0.26, 0.5 * beat);
    if (lit.has("abdomen")) wash(tx, [P("lumbar"), P("thoracic")], u * 0.2, 0.5 * beat);

    const stroke = (side, names, width, seed, opts) => brush(tx, names.map(P), u * width, rgba(INK, side && side !== near ? 0.42 : 0.9), seed, opts);
    const far = near === "L" ? "R" : "L";
    for (const s of [far, near]) {
      if (s === near) stroke("", ["neckBase", "thoracic", "lumbar", "pelvis"], 0.15, 1, { lift: 0.35 });
      stroke(s, ["hip" + s, "knee" + s, "ankle" + s, "toe" + s], 0.095, s === "L" ? 11 : 12);
      stroke(s, ["shoulder" + s, "elbow" + s, "wrist" + s, "hand" + s], 0.065, s === "L" ? 21 : 22, { lift: 0.3 });
    }
    const head = P("head");
    enso(tx, head, u * 0.1, u * 0.055, rgba(INK, 0.9));
  }

  return {
    dom: layer,
    update(joints, { still } = {}) {
      J = joints;
      if (still) last = 0; // a still frame (thumbnail) starts on clean paper
    },
    draw,
    setHighlight(groups) {
      lit = litRegions(groups);
    },
    setPulse(v) {
      beat = 0.75 + 0.25 * v;
    },
    setTheme() {},
    snapshot() {
      const [w, h] = size;
      const c = document.createElement("canvas");
      c.width = still.width;
      c.height = still.height;
      const x = c.getContext("2d");
      x.fillStyle = x.createPattern(paper(), "repeat");
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(still, 0, 0);
      x.drawImage(trail, 0, 0);
      const v = x.createRadialGradient(c.width / 2, c.height * 0.45, Math.min(w, h) * 0.3, c.width / 2, c.height * 0.45, Math.max(c.width, c.height) * 0.7);
      v.addColorStop(0, "rgba(90,70,40,0)");
      v.addColorStop(1, "rgba(90,70,40,0.2)");
      x.fillStyle = v;
      x.fillRect(0, 0, c.width, c.height);
      return c.toDataURL("image/png");
    },
    dispose: () => layer.remove(),
  };
}
