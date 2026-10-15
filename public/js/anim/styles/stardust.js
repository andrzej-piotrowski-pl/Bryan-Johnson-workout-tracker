// Stardust: the figure as a cloud of about 1,800 particles in deep space. Each one is
// tied to a spot on a limb (or in the torso or head) and chases it with its own
// lag, so the body shimmers and its moving parts smear into light trails, like a
// long exposure. The joints shine as stars joined by faint constellation lines, the
// worked muscles burn gold, and the step is a constellation of its own. Drawn on a
// 2D canvas, without three.js.

import { asLayer, boxFaces, fitCanvas, litRegions } from "./flat.js";
import { hash } from "./kit.js";

const COUNT = 1800;
// Where the particles live, with each piece's share of them and its radius (metres).
const PIECES = [
  { kind: "torso", region: "chest", share: 0.24 },
  { kind: "head", region: "head", share: 0.08, r: 0.1 },
  ...["L", "R"].flatMap((s) => [
    { kind: "limb", region: "thigh" + s, joints: ["hip" + s, "knee" + s], share: 0.07, r: 0.065 },
    { kind: "limb", region: "shin" + s, joints: ["knee" + s, "ankle" + s], share: 0.05, r: 0.045 },
    { kind: "limb", region: "foot" + s, joints: ["heel" + s, "toe" + s], share: 0.02, r: 0.03 },
    { kind: "limb", region: "upperArm" + s, joints: ["shoulder" + s, "elbow" + s], share: 0.04, r: 0.042 },
    { kind: "limb", region: "forearm" + s, joints: ["elbow" + s, "wrist" + s, "hand" + s], share: 0.035, r: 0.034 },
  ]),
  { kind: "limb", region: "neck", joints: ["neckBase", "headJoint"], share: 0.01, r: 0.04 },
];
const STARS = ["head", "neckBase", "shoulderL", "shoulderR", "elbowL", "elbowR", "handL", "handR", "pelvis", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"];
const LINES = [["head", "neckBase"], ["neckBase", "shoulderL"], ["neckBase", "shoulderR"], ["shoulderL", "elbowL"], ["elbowL", "handL"], ["shoulderR", "elbowR"], ["elbowR", "handR"], ["neckBase", "pelvis"], ["pelvis", "hipL"], ["pelvis", "hipR"], ["hipL", "kneeL"], ["kneeL", "ankleL"], ["hipR", "kneeR"], ["kneeR", "ankleR"]];

// A soft round glow, drawn once and stamped for the stars.
function sprite(r, color) {
  const c = document.createElement("canvas");
  c.width = c.height = r * 2;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, r * 2, r * 2);
  return c;
}

export function createFigure() {
  const canvas = asLayer(document.createElement("canvas"), "stardust");
  canvas.style.background = "#03020a";
  const ctx = canvas.getContext("2d");
  const space = document.createElement("canvas"); // the backdrop, drawn once per size
  const starBlue = sprite(32, "rgba(150,200,255,0.55)");
  const starGold = sprite(32, "rgba(255,190,90,0.6)");

  // Each particle: its piece, where on it, its lag and size; position and previous position.
  const total = PIECES.reduce((a, p) => a + p.share, 0);
  const parts = [];
  let k = 0;
  PIECES.forEach((piece, pi) => {
    const n = Math.round((piece.share / total) * COUNT);
    for (let i = 0; i < n; i++, k++) {
      const g = (hash(k, 3) + hash(k, 4) + hash(k, 5)) / 1.5 - 1; // roughly bell-shaped, −1…1
      parts.push({ pi, a: hash(k, 1), b: hash(k, 2), g, ang: hash(k, 6) * Math.PI * 2, lag: 0.12 + 0.3 * hash(k, 7), size: hash(k, 8) < 0.9 ? 0 : hash(k, 8) < 0.98 ? 1 : 2, x: 0, y: 0, px: 0, py: 0 });
    }
  });
  let J = null;
  let lit = new Set();
  let still = false;
  let fresh = true;
  let last = 0;
  let size = "";

  function paintSpace(w, h, dpr) {
    space.width = Math.round(w * dpr);
    space.height = Math.round(h * dpr);
    const x = space.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = x.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.75);
    g.addColorStop(0, "#130d33");
    g.addColorStop(0.5, "#07051a");
    g.addColorStop(1, "#020108");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    // Nebulae: a few big soft clouds of colour.
    x.globalCompositeOperation = "lighter";
    for (const [cx, cy, r, c] of [[0.2, 0.3, 0.45, "rgba(120,40,160,0.18)"], [0.85, 0.2, 0.4, "rgba(30,90,170,0.16)"], [0.7, 0.85, 0.5, "rgba(160,50,110,0.12)"]]) {
      const n = x.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, r * Math.max(w, h));
      n.addColorStop(0, c);
      n.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = n;
      x.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 260; i++) {
      const b = hash(i, 21);
      x.fillStyle = `rgba(${b > 0.8 ? "255,220,190" : "200,220,255"},${0.2 + 0.7 * hash(i, 22) ** 2})`;
      const s = hash(i, 23) < 0.93 ? 0.8 : 1.6;
      x.fillRect(hash(i, 24) * w, hash(i, 25) * h, s, s);
    }
  }

  // Where particle p should be on screen.
  function target(p, view, P, u) {
    const piece = PIECES[p.pi];
    if (piece.kind === "torso") {
      const [a, b, c, d] = P.torso;
      const top = { x: a.x + (b.x - a.x) * p.a, y: a.y + (b.y - a.y) * p.a };
      const bot = { x: d.x + (c.x - d.x) * p.a, y: d.y + (c.y - d.y) * p.a };
      const sw = u * 0.035 * p.g;
      return { x: top.x + (bot.x - top.x) * p.b + sw, y: top.y + (bot.y - top.y) * p.b + sw * 0.5 };
    }
    if (piece.kind === "head") {
      const c = P.head, r = u * piece.r * Math.sqrt(p.a);
      return { x: c.x + Math.cos(p.ang) * r * 0.88, y: c.y + Math.sin(p.ang) * r };
    }
    const pts = P[p.pi];
    const f = p.a * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f)), t = f - i;
    const A = pts[i], B = pts[i + 1];
    let nx = A.y - B.y, ny = B.x - A.x;
    const l = Math.hypot(nx, ny) || 1;
    const off = u * piece.r * p.g;
    return { x: A.x + (B.x - A.x) * t + (nx / l) * off, y: A.y + (B.y - A.y) * t + (ny / l) * off };
  }

  function draw(view) {
    const { width: w, height: h } = view;
    const dpr = fitCanvas(canvas, w, h);
    if (size !== `${w}x${h}x${dpr}`) {
      size = `${w}x${h}x${dpr}`;
      paintSpace(w, h, dpr);
      fresh = true;
    }
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, last ? now - last : 0.016);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Long exposure: the backdrop goes over the last frame only partly, so moving light smears.
    ctx.globalAlpha = still || fresh ? 1 : Math.min(1, 0.32 * dt * 60);
    ctx.drawImage(space, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!J) return;
    const u = view.scaleAt(J.pelvis);
    const P = { torso: ["shoulderL", "shoulderR", "hipR", "hipL"].map((n) => view.project(J[n])), head: view.project(J.head) };
    PIECES.forEach((piece, i) => piece.joints && (P[i] = piece.joints.map((n) => view.project(J[n]))));
    ctx.globalCompositeOperation = "lighter";

    // The step and a ring on the floor, as constellations.
    ctx.strokeStyle = "rgba(140,170,255,0.22)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 4]);
    for (const spec of view.props) {
      for (const f of boxFaces(spec, view)) {
        ctx.beginPath();
        f.pts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();
        for (const p of f.pts) ctx.drawImage(starBlue, p.x - 5, p.y - 5, 10, 10);
      }
    }
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const p = view.project({ x: J.pelvis.x + Math.cos(a) * 0.62, y: 0, z: J.pelvis.z + Math.sin(a) * 0.62 });
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(170,140,255,0.18)";
    ctx.stroke();
    ctx.setLineDash([]);

    // Constellation lines along the bones.
    ctx.strokeStyle = "rgba(160,200,255,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [a, b] of LINES) {
      const p = view.project(J[a]), q = view.project(J[b]);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();

    // The particles chase their spots; each is drawn as a streak from where it was.
    const ease = still || fresh ? 1 : null;
    const batches = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const tg = target(p, view, P, u);
      const swirl = still ? 0 : 1.2;
      tg.x += Math.sin(now * (1.3 + p.lag * 3) + p.ang * 7) * swirl;
      tg.y += Math.cos(now * (1.1 + p.lag * 2) + p.ang * 5) * swirl;
      const k = ease ?? 1 - Math.pow(1 - p.lag, dt * 60);
      p.px = p.x;
      p.py = p.y;
      p.x += (tg.x - p.x) * k;
      p.y += (tg.y - p.y) * k;
      const gold = lit.has(PIECES[p.pi].region) ? 3 : 0;
      const path = batches[gold + p.size];
      path.moveTo(still || fresh ? p.x - 0.6 : p.px, still || fresh ? p.y : p.py);
      path.lineTo(p.x + 0.01, p.y + 0.01);
    }
    fresh = false;
    ctx.lineCap = "butt";
    const colors = ["rgba(170,210,255,0.55)", "rgba(200,190,255,0.75)", "rgba(255,255,255,0.95)", "rgba(255,185,90,0.6)", "rgba(255,210,130,0.8)", "rgba(255,245,220,0.95)"];
    batches.forEach((b, i) => {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = [1.4, 2.1, 2.9][i % 3];
      ctx.stroke(b);
    });

    // The joints shine as stars.
    for (const n of STARS) {
      const p = view.project(J[n]);
      const region = n.startsWith("knee") || n.startsWith("hip") ? "thigh" + n.slice(-1) : n === "neckBase" ? "chest" : "";
      const s = n === "head" ? 34 : 22;
      ctx.drawImage(lit.has(region) ? starGold : starBlue, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  return {
    dom: canvas,
    update(joints, info = {}) {
      J = joints;
      still = !!info.still;
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
