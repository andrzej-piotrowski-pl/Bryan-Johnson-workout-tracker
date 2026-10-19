// Printed dots and heavy outlines, like a two-colour comic panel.
import { asLayer, bodyPieces, dumbbellHeads, fitCanvas, isLit, litRegions, sceneFaces } from "./flat.js";

const PAPER = "#fff9e9", INK = "#242733", ACCENT = "#d84c39";

export function createFigure() {
  const canvas = asLayer(document.createElement("canvas"), "halftone");
  const ctx = canvas.getContext("2d");
  canvas.setAttribute("aria-hidden", "true");
  const tile = document.createElement("canvas");
  tile.width = tile.height = 8;
  const dots = tile.getContext("2d");
  dots.fillStyle = "#d9e8eb";
  dots.fillRect(0, 0, 8, 8);
  dots.fillStyle = "#758e9a";
  dots.beginPath(); dots.arc(2, 2, 1, 0, Math.PI * 2); dots.fill();
  const pattern = ctx.createPattern(tile, "repeat");
  let J, lit = new Set();
  const path = (pts, close = false) => {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    if (close) ctx.closePath();
  };
  function draw(view) {
    const { width: w, height: h } = view;
    const dpr = fitCanvas(canvas, w, h);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
    if (!J) return;
    const u = view.scaleAt(J.pelvis);
    ctx.lineCap = ctx.lineJoin = "round";
    for (const f of sceneFaces(view)) {
      path(f.pts, true);
      ctx.globalAlpha = f.ghost ? 0.25 : 1;
      ctx.fillStyle = f.kind === "metal" ? INK : pattern;
      ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const pieces = bodyPieces(J, view);
    pieces.push({ kind: "arm", region: "neck", pts: [view.project(J.neckBase), view.project(J.headJoint)] });
    for (const p of pieces) {
      const fill = isLit(lit, p.kind === "torso" ? "torso" : p.region) ? ACCENT : pattern;
      if (p.kind === "head") {
        ctx.beginPath(); ctx.arc(p.pts[0].x, p.pts[0].y, u * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
      } else if (p.kind === "torso") {
        path(p.pts, true); ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = u * 0.11 + 4; ctx.stroke();
        ctx.strokeStyle = fill; ctx.lineWidth = u * 0.11; ctx.stroke();
      } else {
        const width = u * (p.kind === "leg" ? 0.105 : p.kind === "arm" ? 0.075 : 0.065);
        path(p.pts); ctx.strokeStyle = INK; ctx.lineWidth = width + 4; ctx.stroke();
        ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.stroke();
      }
    }
    for (const db of view.attachments.dumbbells) {
      const { a, b, r } = dumbbellHeads(db), A = view.project(a), B = view.project(b);
      path([A, B]); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, u * 0.03); ctx.stroke();
      for (const p of [A, B]) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, u * r), 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); }
    }
    ctx.strokeStyle = ACCENT; ctx.lineWidth = Math.max(2, u * 0.018);
    for (const points of view.attachments.bands) { path(points.map(view.project)); ctx.stroke(); }
    if (view.attachments.string) { ctx.setLineDash([5, 4]); path(view.attachments.string.map(view.project)); ctx.stroke(); ctx.setLineDash([]); }
    if (lit.heart) {
      const c = view.project(J.thoracic);
      ctx.fillStyle = ACCENT; ctx.font = `${u * 0.12}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("♥", c.x, c.y);
    }
  }
  return {
    dom: canvas, draw, update(joints) { J = joints; }, setHighlight(groups) { lit = litRegions(groups); },
    setPulse() {}, setTheme() {}, snapshot: () => canvas.toDataURL("image/png"), dispose: () => canvas.remove(),
  };
}
