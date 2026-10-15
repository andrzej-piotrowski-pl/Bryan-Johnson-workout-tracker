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
export function litRegions(groups = []) {
  const lit = new Set();
  for (const g of groups) for (const n of GROUPS[g] || []) lit.add(n);
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

// The faces of a box-shaped prop (step, box), projected, far to near, each with the
// share of light it gets (top 1, sides less).
export function boxFaces(spec, view) {
  if (spec.type !== "step" && spec.type !== "box") return [];
  const w = spec.w ?? (spec.type === "step" ? 0.62 : 0.45);
  const d = spec.d ?? (spec.type === "step" ? 0.34 : 0.42);
  const h = spec.h ?? (spec.type === "step" ? 0.18 : 0.45);
  const [x0 = 0, , z0 = 0] = spec.pos || [];
  const a = ((spec.rotY || 0) * Math.PI) / 180;
  const corner = (sx, y, sz) => {
    const lx = (sx * w) / 2, lz = (sz * d) / 2;
    return view.project({ x: x0 + lx * Math.cos(a) + lz * Math.sin(a), y, z: z0 - lx * Math.sin(a) + lz * Math.cos(a) });
  };
  const c = {};
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [k, y] of [["b", 0], ["t", h]]) c[k + sx + sz] = corner(sx, y, sz);
  const faces = [
    { light: 1, pts: [c["t-1-1"], c["t1-1"], c["t11"], c["t-11"]] },
    { light: 0.62, pts: [c["b-11"], c["b11"], c["t11"], c["t-11"]] },
    { light: 0.62, pts: [c["b-1-1"], c["b1-1"], c["t1-1"], c["t-1-1"]] },
    { light: 0.78, pts: [c["b1-1"], c["b11"], c["t11"], c["t1-1"]] },
    { light: 0.78, pts: [c["b-1-1"], c["b-11"], c["t-11"], c["t-1-1"]] },
  ];
  // Painted far to near, the faces turned away end up hidden behind the others.
  for (const f of faces) f.z = f.pts.reduce((s, p) => s + p.z, 0) / 4;
  return faces.sort((p, q) => q.z - p.z);
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
