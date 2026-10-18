// Two ink plates, cut marks and uneven edges, like a hand-pulled linocut poster.
import { asLayer, bodyPieces, dumbbellHeads, fitCanvas, isLit, litRegions, sceneFaces } from "./flat.js";
import { hash } from "./kit.js";

const PAPER = "#f4e6c5", INK = "#123d47", RED = "#d94b32", GOLD = "#e6a833";

export function createFigure() {
  const canvas = asLayer(document.createElement("canvas"), "linocut");
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  const grain = document.createElement("canvas");
  grain.width = grain.height = 192;
  const g = grain.getContext("2d");
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = i % 2 ? "#ffffff22" : "#533c2010";
    g.fillRect(hash(i, 1) * 192, hash(i, 2) * 192, 0.7 + hash(i, 3), 0.7 + hash(i, 4) * 2);
  }
  const texture = ctx.createPattern(grain, "repeat");
  let J, lit = new Set();
  const path = (pts, close = false) => {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    if (close) ctx.closePath();
  };
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
  function limb(pts, radius, color, seed) {
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.1) continue;
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      const shape = [];
      for (let side = 0; side < 2; side++) for (let i = 0; i <= 8; i++) {
        const f = side ? 1 - i / 8 : i / 8;
        shape.push({ x: f * len, y: (side ? 1 : -1) * radius * (1 - f * 0.23) * (0.94 + hash(seed, i, side) * 0.12) });
      }
      path(shape, true); ctx.fillStyle = color; ctx.fill();
      ctx.clip(); ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(0.8, radius * 0.075);
      for (let i = 0; i < 5; i++) {
        const y = (i - 2) * radius * 0.3;
        ctx.beginPath(); ctx.moveTo(len * 0.06, y);
        ctx.quadraticCurveTo(len * 0.45, y - radius * 0.25, len * (0.78 + hash(seed, i) * 0.15), y * 0.7);
        ctx.stroke();
      }
      ctx.restore();
      circle(a.x, a.y, radius * 0.94); ctx.fillStyle = color; ctx.fill();
      circle(b.x, b.y, radius * 0.72); ctx.fill();
    }
  }
  function draw(view) {
    const { width: w, height: h } = view, dpr = fitCanvas(canvas, w, h);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.4, r = Math.min(w, h) * 0.34;
    const sun = Array.from({ length: 100 }, (_, i) => {
      const a = i * Math.PI / 50, radius = r * (0.988 + hash(i, 7) * 0.024);
      return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
    });
    path(sun, true); ctx.fillStyle = RED; ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = PAPER; ctx.lineWidth = 1;
    for (let i = 0; i < 64; i++) {
      const a = i * Math.PI / 32, inner = r * (0.8 + hash(i, 8) * 0.12);
      path([{ x: cx + Math.cos(a) * inner, y: cy + Math.sin(a) * inner }, { x: cx + Math.cos(a + 0.008) * r, y: cy + Math.sin(a + 0.008) * r }]); ctx.stroke();
    }
    ctx.restore();
    if (!J) return;
    const u = view.scaleAt(J.pelvis);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (const f of sceneFaces(view)) {
      ctx.globalAlpha = f.ghost ? 0.2 : 1;
      path(f.pts, true); ctx.fillStyle = f.kind === "metal" ? INK : "#d0b984"; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.clip(); ctx.lineWidth = 0.8;
      for (let x = 0; x < w + h; x += 9) { path([{ x, y: 0 }, { x: x - h, y: h }]); ctx.stroke(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // The neck stays connected in sideways and floor poses too.
    limb([view.project(J.neckBase), view.project(J.headJoint)], u * 0.034, INK, 99);
    for (const p of bodyPieces(J, view)) {
      const color = isLit(lit, p.kind === "torso" ? "torso" : p.region) ? GOLD : INK;
      if (p.kind === "head") {
        const c = p.pts[0], R = J.Rh.elements;
        const up = view.project({ x: J.head.x + R[4] * 0.1, y: J.head.y + R[5] * 0.1, z: J.head.z + R[6] * 0.1 });
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.atan2(up.y - c.y, up.x - c.x) + Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(0, 0, u * 0.092, u * 0.113, -0.08, 0, Math.PI * 2);
        ctx.fillStyle = INK; ctx.fill(); ctx.clip();
        ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1, u * 0.009);
        path([{ x: -u * 0.055, y: -u * 0.025 }, { x: -u * 0.02, y: -u * 0.03 }]); ctx.stroke();
        path([{ x: u * 0.02, y: -u * 0.03 }, { x: u * 0.055, y: -u * 0.025 }]); ctx.stroke();
        path([{ x: 0, y: -u * 0.015 }, { x: -u * 0.012, y: u * 0.025 }, { x: u * 0.01, y: u * 0.028 }]); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, u * 0.025, u * 0.032, 0.25, 2.65); ctx.stroke();
        for (let i = 0; i < 5; i++) {
          ctx.beginPath(); ctx.arc(-u * 0.02, -u * 0.04, u * (0.04 + i * 0.018), 3.3, 5.7); ctx.stroke();
        }
        ctx.restore();
      } else if (p.kind === "torso") {
        path(p.pts, true); ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = u * 0.08; ctx.stroke();
        ctx.save(); ctx.clip(); ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1, u * 0.006);
        const a = p.pts[0], b = p.pts[1], c = p.pts[2], d = p.pts[3];
        for (let i = 1; i < 12; i++) {
          const f = i / 12;
          const left = { x: a.x + (d.x - a.x) * f, y: a.y + (d.y - a.y) * f };
          const right = { x: b.x + (c.x - b.x) * f, y: b.y + (c.y - b.y) * f };
          ctx.beginPath(); ctx.moveTo(left.x, left.y);
          ctx.quadraticCurveTo((left.x + right.x) / 2, (left.y + right.y) / 2 + u * 0.04, right.x, right.y); ctx.stroke();
        }
        ctx.restore();
      } else limb(p.pts, u * (p.kind === "leg" ? 0.058 : p.kind === "arm" ? 0.04 : 0.032), color, p.region.charCodeAt(0) + p.side.charCodeAt(0));
    }
    for (const db of view.attachments.dumbbells) {
      const { a, b, r } = dumbbellHeads(db), A = view.project(a), B = view.project(b);
      path([A, B]); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, u * 0.026); ctx.stroke();
      for (const p of [A, B]) {
        circle(p.x, p.y, u * r); ctx.fillStyle = INK; ctx.fill();
        ctx.strokeStyle = PAPER; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.strokeStyle = RED; ctx.lineWidth = Math.max(2, u * 0.018);
    for (const points of view.attachments.bands) { path(points.map(view.project)); ctx.stroke(); }
    if (view.attachments.string) { path(view.attachments.string.map(view.project)); ctx.stroke(); }
    if (lit.heart) {
      const p = view.project(J.thoracic);
      ctx.fillStyle = RED; ctx.font = `${u * 0.13}px serif`; ctx.textAlign = "center"; ctx.fillText("♥", p.x, p.y);
    }
    ctx.fillStyle = texture; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    for (const x of [w * 0.04, w * 0.96]) for (const y of [h * 0.04, h * 0.96]) {
      path([{ x: x - 4, y }, { x: x + 4, y }]); ctx.stroke();
      path([{ x, y: y - 4 }, { x, y: y + 4 }]); ctx.stroke();
    }
  }
  return {
    dom: canvas, draw, update(joints) { J = joints; }, setHighlight(groups) { lit = litRegions(groups); },
    setPulse() {}, setTheme() {}, snapshot: () => canvas.toDataURL("image/png"), dispose: () => canvas.remove(),
  };
}
