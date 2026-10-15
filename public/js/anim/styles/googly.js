// Googly: a fuzzy purple monster in enormous trainers. Its googly eyes run on real
// physics: each pupil is a little ball with weight, thrown about by every jolt of
// the head and dropping back with gravity, bouncing off the rim. The antenna wobbles
// on a spring, the mouth opens wider (buck teeth and all) the deeper the knees bend,
// and the worked muscles turn hot pink and sparkle; heart work beats on its belly.
// Drawn on a 2D canvas, without three.js.

import { asLayer, dumbbellHeads, fitCanvas, isLit, litRegions, sceneFaces } from "./flat.js";
import { hash } from "./kit.js";

const FUR = "#8a6cff";
const FUR_DARK = "#6a4fe0";
const FUR_LIGHT = "#b8a6ff";
const PINK = "#ff5fa8";
const PINK_LIGHT = "#ff9ccb";
const INK = "#2b2140";

// Props in candy colours by kind: [top, sides, front/back, outline]. The see-through
// wall is a pale ghost.
const CANDY = {
  prop: ["#ffd166", "#f4a63a", "#e08e2b", "#7a3b12"],
  propDark: ["#f2a65a", "#d9822f", "#c06e22", "#6a3210"],
  wood: ["#8be8c8", "#5fcfaa", "#48b893", "#1f5c4c"],
  mat: ["#7fdcf0", "#55c4dd", "#3fadc7", "#1d5a6b"],
  metal: ["#e4e6ee", "#b9bccb", "#a2a6b8", "#4a4e5e"],
  band: ["#ff6f86", "#ff4f6d", "#e8405e", "#7a1a2c"],
  wall: ["#fffaf0", "#fff4e0", "#ffeed4", "#c9a27a"],
};

// Where each region sparkles: between two joints.
const SPARKS = [
  ["thighL", "hipL", "kneeL"], ["thighR", "hipR", "kneeR"], ["shinL", "kneeL", "ankleL"], ["shinR", "kneeR", "ankleR"],
  ["footL", "heelL", "toeL"], ["footR", "heelR", "toeR"], ["upperArmL", "shoulderL", "elbowL"], ["upperArmR", "shoulderR", "elbowR"],
  ["forearmL", "elbowL", "handL"], ["forearmR", "elbowR", "handR"], ["chest", "thoracic", "neckBase"], ["abdomen", "lumbar", "thoracic"],
  ["pelvis", "pelvis", "lumbar"], ["neck", "neckBase", "headJoint"],
];
function angleAt(a, b, c) {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z], v = [c.x - b.x, c.y - b.y, c.z - b.z];
  const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI;
}

export function createFigure() {
  const canvas = asLayer(document.createElement("canvas"), "googly");
  const ctx = canvas.getContext("2d");
  let J = null;
  let lit = new Set();
  let still = false;
  let beat = 1;
  let last = 0;
  // Each pupil: offset from its eye's centre and velocity, in pixels; plus where the eye was.
  const eyes = [0, 1].map(() => ({ x: 0, y: 0, vx: 0, vy: 0, ex: null, ey: null, evx: 0, evy: 0 }));
  const antenna = { x: null, y: null, vx: 0, vy: 0 };

  // A fur outline: short strands sticking out of an ellipse's edge.
  function furBlob(cx, cy, rx, ry, rot, color, tip, seed, len) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tip;
    ctx.lineWidth = Math.max(1.2, len * 0.28);
    ctx.lineCap = "round";
    const N = Math.round((rx + ry) * 1.4);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + hash(seed, i) * 0.1;
      const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      const l = len * (0.6 + 0.8 * hash(seed, i + 500));
      const bend = (hash(seed, i + 900) - 0.5) * 0.9;
      ctx.moveTo(ex * 0.9, ey * 0.9);
      ctx.lineTo(ex + Math.cos(a + bend) * l, ey + Math.sin(a + bend) * l);
    }
    ctx.stroke();
    ctx.restore();
  }

  // A furry noodle limb through screen points.
  function furLimb(pts, width, color, tip, seed) {
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = tip;
    ctx.lineWidth = Math.max(1, width * 0.09);
    ctx.beginPath();
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1];
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
      const count = Math.max(2, Math.round(L / 3.2));
      for (let i = 0; i < count; i++) {
        const t = (i + hash(seed, s * 50 + i)) / count, side = i % 2 ? 1 : -1;
        const x = a.x + (b.x - a.x) * t + nx * side * width * 0.42, y = a.y + (b.y - a.y) * t + ny * side * width * 0.42;
        const l = width * (0.18 + 0.2 * hash(seed, s * 50 + i + 300));
        ctx.moveTo(x, y);
        ctx.lineTo(x + nx * side * l + (b.x - a.x) / L * l * 0.4, y + ny * side * l + (b.y - a.y) / L * l * 0.4);
      }
    }
    ctx.stroke();
  }

  // A huge trainer from heel to toe (pink when the feet are worked).
  function shoe(heel, toe, u, hot) {
    const ang = Math.atan2(toe.y - heel.y, toe.x - heel.x);
    const len = Math.max(u * 0.24, Math.hypot(toe.x - heel.x, toe.y - heel.y) * 1.5);
    const cx = (heel.x + toe.x) / 2 + Math.cos(ang) * len * 0.12, cy = (heel.y + toe.y) / 2 - u * 0.02;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    const flip = Math.abs(ang) > Math.PI / 2 ? -1 : 1;
    ctx.scale(1, flip);
    ctx.fillStyle = hot ? "#ffd3e8" : "#fff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.012, len * 0.55, u * 0.06, 0, Math.PI, 0);
    ctx.lineTo(len * 0.55, u * 0.02);
    ctx.lineTo(-len * 0.55, u * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const stripe = hot ? PINK : "#ff4f6d";
    ctx.fillStyle = stripe;
    ctx.fillRect(-len * 0.5, u * 0.005, len, u * 0.022);
    ctx.strokeStyle = stripe;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-len * 0.15, -u * 0.045);
    ctx.quadraticCurveTo(len * 0.05, -u * 0.005, len * 0.25, -u * 0.035);
    ctx.stroke();
    ctx.restore();
  }

  // A cartoon dumbbell: a dark handle and two chunky round heads with a shine.
  function dumbbell(view, db, u) {
    const { a, b, r } = dumbbellHeads(db);
    const A = view.project(a), B = view.project(b), R = Math.max(3, u * r * 1.15);
    ctx.lineCap = "round";
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, R * 0.45);
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    for (const c of [A, B]) {
      ctx.fillStyle = "#3a2f5c";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(c.x - R * 0.35, c.y - R * 0.35, R * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function sparkle(x, y, s, a) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }

  // The pupil physics: gravity, the eye's own acceleration thrown back at the pupil,
  // a little drag, and bounces off the inside of the rim.
  function stepEye(eye, ex, ey, R, dt, g) {
    if (eye.ex == null || still) {
      Object.assign(eye, { ex, ey, evx: 0, evy: 0, vx: 0, vy: 0, x: 0, y: R * 0.95 });
      return;
    }
    const evx = (ex - eye.ex) / dt, evy = (ey - eye.ey) / dt;
    const ax = (evx - eye.evx) / dt, ay = (evy - eye.evy) / dt;
    Object.assign(eye, { ex, ey, evx, evy });
    eye.vx += (-ax * 0.9) * dt;
    eye.vy += (g - ay * 0.9) * dt;
    eye.vx *= Math.pow(0.35, dt);
    eye.vy *= Math.pow(0.35, dt);
    eye.x += eye.vx * dt;
    eye.y += eye.vy * dt;
    const d = Math.hypot(eye.x, eye.y);
    if (d > R) {
      const nx = eye.x / d, ny = eye.y / d;
      eye.x = nx * R;
      eye.y = ny * R;
      const vn = eye.vx * nx + eye.vy * ny;
      if (vn > 0) {
        eye.vx -= 1.55 * vn * nx;
        eye.vy -= 1.55 * vn * ny;
        eye.vx *= 0.92;
        eye.vy *= 0.92;
      }
    }
  }

  function draw(view) {
    const { width: w, height: h } = view;
    const dpr = fitCanvas(canvas, w, h);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0.001, last ? now - last : 0.016));
    last = now;
    // A sunny backdrop with polka dots.
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.8);
    bg.addColorStop(0, "#fff1b8");
    bg.addColorStop(1, "#ffb08f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let y = 0, row = 0; y < h + 40; y += 38, row++) for (let x = row % 2 ? 19 : 0; x < w + 40; x += 38) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!J) return;
    const u = view.scaleAt(J.pelvis);
    const P = (k) => view.project(J[k]);
    const ground = view.project({ x: J.pelvis.x, y: 0, z: J.pelvis.z });
    ctx.fillStyle = "rgba(120,40,40,0.16)";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, u * 0.42, u * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // The props: chunky candy-coloured blocks.
    ctx.lineJoin = "round";
    for (const f of sceneFaces(view)) {
      const c = CANDY[f.kind] || CANDY.prop;
      ctx.globalAlpha = f.ghost ? 0.4 : 1;
      ctx.fillStyle = f.light >= 0.95 ? c[0] : f.light > 0.7 ? c[1] : c[2];
      ctx.strokeStyle = c[3];
      ctx.lineWidth = 2;
      ctx.beginPath();
      f.pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const near = P("hipL").z + P("shoulderL").z < P("hipR").z + P("shoulderR").z ? "L" : "R";
    const far = near === "L" ? "R" : "L";
    const furOf = (region, dark) => (isLit(lit, region) ? (dark ? "#e2448f" : PINK) : dark ? FUR_DARK : FUR);
    const tipOf = (region) => (isLit(lit, region) ? PINK_LIGHT : FUR_LIGHT);
    const limbs = (s, dark) => {
      furLimb([P("hip" + s), P("knee" + s)], u * 0.1, furOf("thigh" + s, dark), tipOf("thigh" + s), s === "L" ? 3 : 4);
      furLimb([P("knee" + s), P("ankle" + s)], u * 0.085, furOf("shin" + s, dark), tipOf("shin" + s), s === "L" ? 5 : 6);
      shoe(P("heel" + s), P("toe" + s), u, lit.has("foot" + s));
    };
    // Each dumbbell goes with the hand nearest it (a goblet with either), drawn under the mitten.
    const held = { L: [], R: [] };
    for (const db of view.attachments.dumbbells) held[db.c.distanceTo(J.handL) < db.c.distanceTo(J.handR) ? "L" : "R"].push(db);
    const arm = (s, dark) => {
      furLimb([P("shoulder" + s), P("elbow" + s)], u * 0.07, furOf("upperArm" + s, dark), tipOf("upperArm" + s), s === "L" ? 7 : 8);
      furLimb([P("elbow" + s), P("hand" + s)], u * 0.066, furOf("forearm" + s, dark), tipOf("forearm" + s), s === "L" ? 9 : 10);
      for (const db of held[s]) dumbbell(view, db, u);
      const hp = P("hand" + s);
      ctx.fillStyle = isLit(lit, "forearm" + s) ? (dark ? "#e2448f" : PINK) : dark ? FUR_DARK : FUR;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, u * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.arc(hp.x + k * u * 0.022, hp.y + u * 0.035, u * 0.014, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    arm(far, true);
    limbs(far, true);

    // The body: one furry bean along the spine, with a lighter belly.
    const nb = P("neckBase"), pv = P("pelvis");
    const cx = (nb.x + pv.x) / 2, cy = (nb.y + pv.y) / 2 + u * 0.02;
    const rot = Math.atan2(pv.y - nb.y, pv.x - nb.x) - Math.PI / 2;
    const len = Math.hypot(pv.x - nb.x, pv.y - nb.y);
    const bodyLit = isLit(lit, "torso");
    furBlob(cx, cy, u * 0.2, len * 0.62 + u * 0.06, rot, bodyLit ? PINK : FUR, bodyLit ? PINK_LIGHT : FUR_LIGHT, 11, u * 0.035);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = bodyLit ? "#ffc2de" : "#c9b9ff";
    ctx.beginPath();
    ctx.ellipse(0, u * 0.03, u * 0.12, len * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    if (lit.heart) {
      // A heart on the belly, beating.
      const s = u * 0.05 * beat;
      ctx.fillStyle = bodyLit ? "#e8174f" : PINK;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.9);
      ctx.bezierCurveTo(-s * 1.6, -s * 0.2, -s * 0.8, -s * 1.4, 0, -s * 0.5);
      ctx.bezierCurveTo(s * 0.8, -s * 1.4, s * 1.6, -s * 0.2, 0, s * 0.9);
      ctx.fill();
    }
    ctx.restore();

    // Bands as stretchy candy ropes; the string as a faint dashed line.
    ctx.lineCap = "round";
    for (const [a, b] of view.attachments.bands) {
      const A = view.project(a), B = view.project(b);
      ctx.strokeStyle = "#e8405e";
      ctx.lineWidth = Math.max(3, u * 0.022);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = Math.max(1, u * 0.006);
      ctx.stroke();
    }
    if (view.attachments.string) {
      const [A, B] = view.attachments.string.map((p) => view.project(p));
      ctx.strokeStyle = "rgba(122,59,18,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // The head: a big furry ball with an antenna, huge eyes and a mouth; a pink fur
    // collar when the neck is worked.
    const hd = P("head");
    const hx = hd.x, hy = hd.y - u * 0.04, hr = u * 0.16;
    // Antenna on a spring.
    const restX = hx + hr * 0.25, restY = hy - hr * 1.75;
    if (antenna.x == null || still) Object.assign(antenna, { x: restX, y: restY, vx: 0, vy: 0 });
    else {
      antenna.vx += ((restX - antenna.x) * 180 - antenna.vx * 7) * dt;
      antenna.vy += ((restY - antenna.y) * 180 - antenna.vy * 7) * dt;
      antenna.x += antenna.vx * dt;
      antenna.y += antenna.vy * dt;
    }
    ctx.strokeStyle = FUR_DARK;
    ctx.lineWidth = Math.max(2, u * 0.012);
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.15, hy - hr * 0.85);
    ctx.quadraticCurveTo(hx + hr * 0.2, hy - hr * 1.4, antenna.x, antenna.y);
    ctx.stroke();
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.arc(antenna.x, antenna.y, u * 0.028, 0, Math.PI * 2);
    ctx.fill();
    if (lit.has("neck")) {
      const nk = P("neckBase");
      furBlob(nk.x, nk.y - u * 0.02, u * 0.15, u * 0.07, rot, PINK, PINK_LIGHT, 17, u * 0.03);
    }
    furBlob(hx, hy, hr, hr * 0.95, 0, FUR, FUR_LIGHT, 13, u * 0.035);

    // Mouth: wider open the deeper the knee bends.
    const flex = Math.max(...["L", "R"].map((s) => 180 - angleAt(J["hip" + s], J["knee" + s], J["ankle" + s])));
    const open = Math.min(1, flex / 80);
    const e = J.Rh.elements;
    const turn = e[8] * view.camera.world[0] + e[10] * view.camera.world[2]; // −1 … 1: which way the face points on screen
    const fx = hx + turn * hr * 0.35;
    ctx.fillStyle = "#4a1030";
    ctx.beginPath();
    ctx.ellipse(fx, hy + hr * 0.38, hr * 0.42, hr * (0.08 + 0.3 * open), 0, 0, Math.PI);
    ctx.lineTo(fx - hr * 0.42, hy + hr * 0.38);
    ctx.fill();
    ctx.fillStyle = "#ff7aa2";
    ctx.beginPath();
    ctx.ellipse(fx + hr * 0.08, hy + hr * (0.42 + 0.22 * open), hr * 0.2, hr * 0.09 * (0.4 + open), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(fx - hr * 0.13, hy + hr * 0.38, hr * 0.12, hr * 0.14);
    ctx.fillRect(fx + hr * 0.01, hy + hr * 0.38, hr * 0.12, hr * 0.14);

    // The googly eyes.
    const R = u * 0.068, pr = R * 0.48;
    const g = 9.8 * u * 0.9;
    [-1, 1].forEach((k, i) => {
      const ex = fx + k * R * 1.02, ey = hy - hr * 0.22 + (k > 0 ? -R * 0.08 : 0);
      stepEye(eyes[i], ex, ey, R - pr - 1.5, dt, g);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#2b2140";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const p = eyes[i];
      const px = still ? ex + k * -R * 0.25 : ex + p.x, py = still ? ey + R * 0.32 : ey + p.y;
      ctx.fillStyle = "#151020";
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(ex - R * 0.35, ey - R * 0.4, R * 0.16, 0, Math.PI * 2);
      ctx.fill();
    });

    arm(near, false);
    limbs(near, false);

    // Sparkles around the worked muscles.
    SPARKS.forEach(([region, a, b], r) => {
      if (!isLit(lit, region)) return;
      const A = P(a), B = P(b);
      for (let i = 0; i < 3; i++) {
        const ph = still ? 0.5 : (now * 1.3 + i * 0.33 + hash(i, r)) % 1;
        const t = hash(i, r + 40);
        const x = A.x + (B.x - A.x) * t + (hash(i, r + 80) - 0.5) * u * 0.3, y = A.y + (B.y - A.y) * t + (hash(i, r + 120) - 0.5) * u * 0.2;
        sparkle(x, y, u * 0.03 * Math.sin(Math.PI * ph), 0.95);
      }
    });
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
    setPulse(v) {
      beat = 0.85 + 0.3 * v;
    },
    setTheme() {},
    snapshot: () => canvas.toDataURL("image/png"),
    dispose: () => canvas.remove(),
  };
}
