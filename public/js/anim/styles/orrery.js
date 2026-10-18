// A moving brass orrery: planets at the joints, engraved rods along the bones.
import { asLayer, bodyPieces, dumbbellHeads, fitCanvas, isLit, litRegions, sceneFaces } from "./flat.js";
import { hash } from "./kit.js";

const SKY = "#101c2d", GOLD = "#c99e58", PALE = "#f6db96", ACTIVE = "#ff9764";
const PLANETS = ["#63b7ac", "#ca7056", "#8ba9d2", "#d6b379"];

export function createFigure() {
  const canvas = asLayer(document.createElement("canvas"), "orrery");
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  let J, lit = new Set(), t = 0, pulse = 0;
  const path = (pts, close = false) => {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    if (close) ctx.closePath();
  };
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
  function planet(p, r, color, seed, orbit = true) {
    r = Math.max(1, r);
    const a = t * (0.28 + seed * 0.025) + seed * 1.9;
    ctx.save(); ctx.translate(p.x, p.y);
    if (orbit) {
      ctx.save(); ctx.rotate(seed * 0.6);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.8, r * 0.67, 0, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.03, r * 0.3, r * 0.25, r * 1.25);
    g.addColorStop(0, PALE); g.addColorStop(0.32, color); g.addColorStop(1, SKY);
    circle(0, 0, r); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.strokeStyle = "#f6db9644"; ctx.lineWidth = 0.65;
    for (const k of [-0.4, 0.35]) {
      ctx.beginPath(); ctx.ellipse(0, r * k, r, r * 0.2, -0.25, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (orbit) {
      ctx.rotate(seed * 0.6);
      ctx.strokeStyle = PALE; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.8, r * 0.67, 0, 0, Math.PI); ctx.stroke();
      circle(Math.cos(a) * r * 1.8, Math.sin(a) * r * 0.67, Math.max(1.1, r * 0.18));
      ctx.fillStyle = PALE; ctx.fill();
    }
    ctx.restore();
  }
  function rod(pts, width, active) {
    path(pts); ctx.strokeStyle = active ? ACTIVE : GOLD; ctx.lineWidth = Math.max(2, width); ctx.stroke();
    path(pts); ctx.strokeStyle = SKY; ctx.lineWidth = Math.max(0.7, width * 0.48); ctx.stroke();
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = active ? ACTIVE : PALE; ctx.lineWidth = 0.6;
      for (let k = 0.2; k < 0.9; k += 0.16) {
        const x = a.x + dx * k, y = a.y + dy * k, size = width * 0.35;
        path([{ x: x - dy / len * size, y: y + dx / len * size }, { x: x + dy / len * size, y: y - dx / len * size }]); ctx.stroke();
      }
    }
  }
  function draw(view) {
    const { width: w, height: h } = view, dpr = fitCanvas(canvas, w, h);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const back = ctx.createRadialGradient(w / 2, h * 0.43, 0, w / 2, h * 0.43, Math.max(w, h) * 0.7);
    back.addColorStop(0, "#263b4d"); back.addColorStop(1, SKY);
    ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
    ctx.lineCap = ctx.lineJoin = "round";
    const radius = Math.min(w, h) * 0.43, cx = w / 2, cy = h / 2;
    ctx.strokeStyle = "#c99e583b"; ctx.lineWidth = 0.7;
    for (const r of [radius, radius * 1.04]) { circle(cx, cy, r); ctx.stroke(); }
    for (let i = 0; i < 120; i++) {
      const a = i * Math.PI / 60, inner = radius * (i % 10 ? 0.98 : 0.94);
      path([{ x: cx + Math.cos(a) * inner, y: cy + Math.sin(a) * inner }, { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }]); ctx.stroke();
    }
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 2) * w, y = hash(i, 3) * h;
      ctx.fillStyle = "#f6db9666"; circle(x, y, i % 13 ? 0.6 : 1.2); ctx.fill();
      if (!(i % 13)) { path([{ x: x - 3, y }, { x: x + 3, y }]); ctx.stroke(); path([{ x, y: y - 3 }, { x, y: y + 3 }]); ctx.stroke(); }
    }
    if (!J) return;
    const u = view.scaleAt(J.pelvis);
    for (const f of sceneFaces(view)) {
      path(f.pts, true); ctx.fillStyle = f.ghost ? "#c99e580a" : `rgba(34,48,61,${0.7 + f.light * 0.3})`; ctx.fill();
      ctx.strokeStyle = f.ghost ? "#c99e5844" : GOLD; ctx.lineWidth = f.kind === "metal" ? 1.5 : 0.8; ctx.stroke();
    }
    const floor = Array.from({ length: 65 }, (_, i) => {
      const a = i * Math.PI / 32;
      return view.project({ x: J.pelvis.x + Math.cos(a) * 0.5, y: 0.004, z: J.pelvis.z + Math.sin(a) * 0.5 });
    });
    path(floor); ctx.strokeStyle = "#c99e5855"; ctx.lineWidth = 0.7; ctx.stroke();
    rod([view.project(J.neckBase), view.project(J.headJoint)], u * 0.025, isLit(lit, "neck"));
    for (const p of bodyPieces(J, view)) {
      const active = isLit(lit, p.kind === "torso" ? "torso" : p.region);
      if (p.kind === "head") {
        planet(p.pts[0], u * 0.1, "#dcd9bb", 1);
        ctx.save(); circle(p.pts[0].x, p.pts[0].y, u * 0.097); ctx.clip();
        for (let i = 0; i < 7; i++) {
          const a = hash(i, 8) * Math.PI * 2, r = Math.sqrt(hash(i, 9)) * u * 0.075;
          circle(p.pts[0].x + Math.cos(a) * r, p.pts[0].y + Math.sin(a) * r, u * (0.006 + hash(i, 10) * 0.011));
          ctx.fillStyle = "#48525b44"; ctx.fill();
        }
        ctx.restore();
      } else if (p.kind === "torso") {
        rod(p.pts.concat(p.pts[0]), u * 0.018, active);
        const a = view.project(J.neckBase), b = view.project(J.pelvis);
        rod([a, b], u * 0.027, active);
        const c = { x: a.x * 0.64 + b.x * 0.36, y: a.y * 0.64 + b.y * 0.36 };
        const r = u * 0.09 * (lit.heart ? 1 + pulse * 0.09 : 1);
        ctx.strokeStyle = active || lit.heart ? ACTIVE : GOLD; ctx.lineWidth = 1;
        for (let i = 0; i < 16; i++) {
          const a = i * Math.PI / 8 + t * 0.08;
          path([{ x: c.x + Math.cos(a) * r * 1.15, y: c.y + Math.sin(a) * r * 1.15 }, { x: c.x + Math.cos(a) * r * 1.4, y: c.y + Math.sin(a) * r * 1.4 }]); ctx.stroke();
        }
        planet(c, r, active || lit.heart ? ACTIVE : "#e0ad4c", 0, false);
        planet(b, u * 0.045, "#63b7ac", 2);
      } else {
        const seed = ["upperArm", "forearm", "thigh", "shin", "foot"].indexOf(p.region.slice(0, -1)) + (p.side === "L" ? 0 : 5);
        rod(p.pts, u * (p.kind === "leg" ? 0.035 : 0.025), active);
        planet(p.pts[0], u * (p.kind === "foot" ? 0.025 : 0.036), active ? ACTIVE : PLANETS[seed % 4], seed + 3);
        if (p.kind === "foot" || p.region.startsWith("forearm")) planet(p.pts[p.pts.length - 1], u * 0.024, active ? ACTIVE : PLANETS[(seed + 1) % 4], seed + 4, false);
      }
    }
    for (const db of view.attachments.dumbbells) {
      const { a, b, r } = dumbbellHeads(db), A = view.project(a), B = view.project(b);
      rod([A, B], u * 0.025, false);
      for (const p of [A, B]) planet(p, u * r, "#bc9b60", 2, false);
    }
    ctx.strokeStyle = ACTIVE; ctx.lineWidth = Math.max(1.5, u * 0.013);
    for (const points of view.attachments.bands) { path(points.map(view.project)); ctx.stroke(); }
    if (view.attachments.string) { path(view.attachments.string.map(view.project)); ctx.strokeStyle = PALE; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]); }
  }
  return {
    dom: canvas, draw, update(joints, info = {}) { J = joints; t = info.t || 0; },
    setHighlight(groups) { lit = litRegions(groups); }, setPulse(v) { pulse = v; }, setTheme() {},
    snapshot: () => canvas.toDataURL("image/png"), dispose: () => canvas.remove(),
  };
}
