// Shared helpers for the flat styles, which draw without three.js: Pictogram (SVG),
// Ink brush (2D canvas) and ASCII (text). The stage still works out the pose (rig.js)
// and the camera, and gives them a view (Stage.flatView): a project(point) to CSS
// pixels, scaleAt(point) in pixels per metre, the size and the props.
//
// A flat style's figure has `dom` (the element laid over the stage) instead of
// `group`, keeps the joints from update(J) and draws them in draw(view). It also
// returns snapshot(), a data URL of the last frame for thumbnails.

import { GROUPS } from "../mannequin.js";

// The regions (the mannequin's part names) the highlighted muscle groups light up.
// Heart work is kept apart (lit.heart): flat styles draw a heart for it, and keep the
// chest region for chest muscles.
export function litRegions(groups = []) {
  const lit = new Set();
  for (const g of groups) if (g !== "heart") for (const n of GROUPS[g] || []) lit.add(n);
  lit.heart = groups.includes("heart");
  return lit;
}

// The body as drawable pieces, each a chain of projected joints with its region and
// depth (larger is further away), sorted far to near.
//   kind: "head" (pts[0] centre), "torso" (shoulders and hips), or a limb
//   ("arm" | "leg" | "foot") drawn through its points.
export function bodyPieces(J, view) {
  const P = (n) => view.project(J[n]);
  const pieces = [];
  const piece = (kind, region, names, side = "") => {
    const pts = names.map(P);
    pieces.push({ kind, region, side, pts, z: pts.reduce((a, p) => a + p.z, 0) / pts.length });
  };
  piece("torso", "chest", ["shoulderL", "shoulderR", "hipR", "hipL"]);
  piece("head", "head", ["head"]);
  for (const s of ["L", "R"]) {
    piece("arm", "upperArm" + s, ["shoulder" + s, "elbow" + s], s);
    piece("arm", "forearm" + s, ["elbow" + s, "wrist" + s, "hand" + s], s);
    piece("leg", "thigh" + s, ["hip" + s, "knee" + s], s);
    piece("leg", "shin" + s, ["knee" + s, "ankle" + s], s);
    piece("foot", "foot" + s, ["heel" + s, "ball" + s, "toe" + s], s);
  }
  // A limb sits at the depth of its whole side, so an arm never splits around the torso.
  const sideZ = {};
  for (const s of ["L", "R"]) {
    const own = pieces.filter((p) => p.side === s);
    sideZ[s] = own.reduce((a, p) => a + p.z, 0) / own.length;
  }
  const torsoZ = pieces[0].z;
  for (const p of pieces) if (p.side) p.z = sideZ[p.side] + (p.kind === "arm" ? -1e-4 : 0);
  pieces[1].z = torsoZ - 1e-5; // the head over the torso
  return pieces.sort((a, b) => b.z - a.z);
}

// ---------- props ----------
//
// Every prop (props.js) as simple solids: boxes in the prop's own frame, plus a wedge
// for the slant board. kind says what it's made of, so a style can colour it:
// "prop", "propDark", "wood", "metal", "mat", "band" or "wall" (see-through: ghost).

function solids(spec) {
  const B = (kind, cx, cy, cz, sx, sy, sz) => ({ kind, box: [cx, cy, cz, sx, sy, sz] });
  switch (spec.type) {
    case "wall": {
      const w = spec.w ?? 2.2, h = spec.h ?? 2.3;
      return [B("wall", 0, h / 2, 0, w, h, 0.05)];
    }
    case "step":
    case "box": {
      const step = spec.type === "step";
      const w = spec.w ?? (step ? 0.62 : 0.45), d = spec.d ?? (step ? 0.34 : 0.42), h = spec.h ?? (step ? 0.18 : 0.45);
      return [B(step ? "prop" : "wood", 0, h / 2, 0, w, h, d)];
    }
    case "bench": {
      const w = spec.w ?? 0.42, d = spec.d ?? 1.15, h = spec.h ?? 0.46;
      return [B("prop", 0, h - 0.04, 0, w, 0.08, d), ...[-1, 1].map((k) => B("propDark", 0, (h - 0.08) / 2, k * (d / 2 - 0.08), w * 0.8, h - 0.08, 0.06))];
    }
    case "chair": {
      const s = 0.44, h = spec.h ?? 0.45, o = s / 2 - 0.03;
      const parts = [B("wood", 0, h, 0, s, 0.05, s)];
      for (const [x, z] of [[-o, -o], [o, -o], [-o, o], [o, o]]) parts.push(B("propDark", x, h / 2, z, 0.035, h, 0.035));
      if (spec.back !== false) parts.push(B("wood", 0, h + 0.24, -s / 2 + 0.02, s, 0.42, 0.04));
      return parts;
    }
    case "sofa": {
      const w = spec.w ?? 1.7, d = 0.85;
      return [B("prop", 0, 0.21, 0, w, 0.42, d), B("propDark", 0, 0.58, -d / 2 + 0.1, w, 0.42, 0.2)];
    }
    case "slant": {
      const w = spec.w ?? 0.46, d = spec.d ?? 0.38;
      return [{ kind: "wood", wedge: [w, d, d * Math.tan(((spec.angle ?? 14) * Math.PI) / 180)] }];
    }
    case "mat":
      return [B("mat", 0, 0.006, 0, spec.w ?? 0.62, 0.012, spec.d ?? 1.85)];
    case "doorframe": {
      const w = spec.w ?? 0.9, h = spec.h ?? 2.05;
      const parts = [...[-1, 1].map((k) => B("prop", k * (w / 2 + 0.035), h / 2, 0, 0.07, h, 0.14)), B("prop", 0, h + 0.04, 0, w + 0.14, 0.08, 0.14)];
      if (spec.bar) {
        parts.push(B("metal", 0, spec.barH ?? 2.0, spec.barZ ?? 0.08, w + 0.12, 0.032, 0.032));
        for (const s of [-1, 1]) parts.push(B("metal", s * (w / 2 + 0.035), spec.barH ?? 2.0,
          (spec.barZ ?? 0.08) / 2, 0.035, 0.035, spec.barZ ?? 0.08));
      }
      return parts;
    }
    case "door": {
      const w = spec.w ?? 0.86, h = 2.02;
      const parts = [B("prop", 0, h / 2, 0, w, h, 0.04), ...[-1, 1].map((k) => B("propDark", k * (w / 2 + 0.03), (h + 0.06) / 2, 0, 0.06, h + 0.06, 0.1))];
      if (spec.anchorH != null) parts.push(B("band", spec.anchorX ?? 0, spec.anchorH, 0.04, 0.044, 0.044, 0.06));
      return parts;
    }
    case "bar":
      return [B("metal", 0, spec.h ?? 2.0, 0, spec.w ?? 1.0, 0.032, 0.032)];
    default:
      return [];
  }
}

// A prop's solids in world space: boxes as { kind, c: [x, y, z], h: [half sizes], yaw }
// and the slant as { kind, wedge: [w, d, h], c, yaw } (high edge at its back, −Z).
export function propParts(spec) {
  const [x0 = 0, y0 = 0, z0 = 0] = spec.pos || [];
  const yaw = ((spec.rotY || 0) * Math.PI) / 180;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  return solids(spec).map((s) => {
    if (s.wedge) return { kind: s.kind, wedge: s.wedge, c: [x0, y0, z0], yaw };
    const [cx, cy, cz, sx, sy, sz] = s.box;
    return { kind: s.kind, c: [x0 + cx * cos + cz * sin, y0 + cy, z0 - cx * sin + cz * cos], h: [sx / 2, sy / 2, sz / 2], yaw };
  });
}

// The faces of a solid in world space, each with its outward normal and the share of
// light it gets (top 1, front and back 0.62, sides 0.78, underneath 0.5).
function solidFaces(part) {
  const cos = Math.cos(part.yaw), sin = Math.sin(part.yaw);
  const [x0, y0, z0] = part.c;
  const W = (x, y, z) => ({ x: x0 + x * cos + z * sin, y: y0 + y, z: z0 - x * sin + z * cos });
  const N = (x, y, z) => ({ x: x * cos + z * sin, y, z: -x * sin + z * cos });
  if (part.wedge) {
    const [w, d, h] = part.wedge, a = w / 2, b = d / 2;
    const l = Math.hypot(d, h);
    return [
      { light: 0.95, n: N(0, d / l, h / l), pts: [W(-a, 0, b), W(a, 0, b), W(a, h, -b), W(-a, h, -b)] },
      { light: 0.62, n: N(0, 0, -1), pts: [W(-a, 0, -b), W(-a, h, -b), W(a, h, -b), W(a, 0, -b)] },
      { light: 0.78, n: N(1, 0, 0), pts: [W(a, 0, b), W(a, 0, -b), W(a, h, -b)] },
      { light: 0.78, n: N(-1, 0, 0), pts: [W(-a, 0, b), W(-a, h, -b), W(-a, 0, -b)] },
    ];
  }
  const [hx, hy, hz] = part.h;
  // The box's centre is already in world space; build the faces around it in its frame.
  const C = (x, y, z) => ({ x: part.c[0] + x * cos + z * sin, y: part.c[1] + y, z: part.c[2] - x * sin + z * cos });
  const faces = [
    { light: 1, n: N(0, 1, 0), pts: [C(-hx, hy, -hz), C(hx, hy, -hz), C(hx, hy, hz), C(-hx, hy, hz)] },
    { light: 0.62, n: N(0, 0, 1), pts: [C(-hx, -hy, hz), C(hx, -hy, hz), C(hx, hy, hz), C(-hx, hy, hz)] },
    { light: 0.62, n: N(0, 0, -1), pts: [C(-hx, -hy, -hz), C(hx, -hy, -hz), C(hx, hy, -hz), C(-hx, hy, -hz)] },
    { light: 0.78, n: N(1, 0, 0), pts: [C(hx, -hy, -hz), C(hx, -hy, hz), C(hx, hy, hz), C(hx, hy, -hz)] },
    { light: 0.78, n: N(-1, 0, 0), pts: [C(-hx, -hy, -hz), C(-hx, -hy, hz), C(-hx, hy, hz), C(-hx, hy, -hz)] },
  ];
  if (part.c[1] - hy > 0.01) faces.push({ light: 0.5, n: N(0, -1, 0), pts: [C(-hx, -hy, -hz), C(hx, -hy, -hz), C(hx, -hy, hz), C(-hx, -hy, hz)] });
  return faces;
}

// A prop's faces on screen: only the ones turned toward the camera, far to near, each
// { pts, z, light, kind, ghost } (ghost: the see-through wall).
export function propFaces(spec, view) {
  const cam = view.camera.pos;
  const out = [];
  for (const part of propParts(spec)) {
    for (const f of solidFaces(part)) {
      const c = f.pts.reduce((a, p) => ({ x: a.x + p.x / f.pts.length, y: a.y + p.y / f.pts.length, z: a.z + p.z / f.pts.length }), { x: 0, y: 0, z: 0 });
      if (f.n.x * (cam[0] - c.x) + f.n.y * (cam[1] - c.y) + f.n.z * (cam[2] - c.z) <= 0) continue;
      const pts = f.pts.map((p) => view.project(p));
      out.push({ pts, z: pts.reduce((a, p) => a + p.z, 0) / pts.length, light: f.light, kind: part.kind, ghost: part.kind === "wall" });
    }
  }
  return out.sort((p, q) => q.z - p.z);
}

// The props' faces, all of them sorted together (so a mat under a bench sorts right).
export function sceneFaces(view) {
  return view.props.flatMap((spec) => propFaces(spec, view)).sort((p, q) => q.z - p.z);
}

// A smooth curve through points (Catmull-Rom), `n` samples per span.
export function smooth(pts, n = 6) {
  if (pts.length < 3) {
    const [a, b] = pts;
    return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
  }
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Keeps a canvas the size of its element, in device pixels; returns the scale.
export function fitCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  return dpr;
}

// Lays a style's element over the stage, letting drags through to the canvas below.
export function asLayer(el, className) {
  el.setAttribute("class", "flat-layer " + className);
  el.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";
  return el;
}

// How far in front of the camera a world point is, in metres (negative: behind it).
export function depthOf(view, p) {
  const e = view.camera.world, c = view.camera.pos;
  return -((p.x - c[0]) * e[8] + (p.y - c[1]) * e[9] + (p.z - c[2]) * e[10]);
}

// A world segment projected to the screen, cut where it passes behind the camera;
// null when it's all behind. Returns [start, end] screen points.
export function projectSegment(view, a, b, near = 0.2) {
  const da = depthOf(view, a), db = depthOf(view, b);
  if (da < near && db < near) return null;
  const cut = (near - da) / (db - da);
  const at = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  return [view.project(da < near ? at(cut) : a), view.project(db < near ? at(cut) : b)];
}

// The screen height of the horizon: where the floor meets the sky, far away.
export function horizonY(view) {
  const e = view.camera.world, c = view.camera.pos;
  const fx = -e[8], fz = -e[10], l = Math.hypot(fx, fz) || 1;
  return view.project({ x: c[0] + (fx / l) * 1000, y: c[1], z: c[2] + (fz / l) * 1000 }).y;
}

// A held dumbbell (from view.attachments) as its two heads: centres a and b, radius and
// length along the handle, all in metres (props.js builds it the same way).
export function dumbbellHeads(db) {
  const o = 0.07 + 0.035 * db.size;
  const at = (k) => ({ x: db.c.x + db.axis.x * o * k, y: db.c.y + db.axis.y * o * k, z: db.c.z + db.axis.z * o * k });
  return { a: at(-1), b: at(1), r: 0.056 * db.size, len: 0.07 * db.size };
}

// Whether a drawn piece should light up: its own region, or one it stands in for in a
// simple drawing (the shoulder joint goes with the upper arm, the hand with the
// forearm; "torso" is lit by the chest, the abdomen or the pelvis).
export function isLit(lit, region) {
  if (region === "torso") return lit.has("chest") || lit.has("abdomen") || lit.has("pelvis");
  const side = region.slice(-1);
  if (region.startsWith("upperArm")) return lit.has(region) || lit.has("shoulder" + side);
  if (region.startsWith("forearm")) return lit.has(region) || lit.has("hand" + side);
  return lit.has(region);
}
