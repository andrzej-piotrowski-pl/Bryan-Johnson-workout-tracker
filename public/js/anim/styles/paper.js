// Folded paper shapes: polygon limbs, crease lines and a small offset shadow.
import { asLayer, bodyPieces, dumbbellHeads, isLit, litRegions, sceneFaces } from "./flat.js";

const NS = "http://www.w3.org/2000/svg";
const n = (v) => v.toFixed(1);
const poly = (pts) => "M" + pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L") + "Z";
const line = (pts) => "M" + pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L");
const PAPER = "#f4eddf", INK = "#324e60", ACCENT = "#cf6046";

export function createFigure() {
  const svg = asLayer(document.createElementNS(NS, "svg"), "paper-cutout");
  svg.setAttribute("aria-hidden", "true");
  let J, lit = new Set();
  function draw(view) {
    const { width: w, height: h } = view;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    let out = `<rect width="${w}" height="${h}" fill="${PAPER}"/>`;
    if (!J) return void (svg.innerHTML = out);
    const u = view.scaleAt(J.pelvis);
    for (const f of sceneFaces(view)) {
      const color = f.kind === "metal" ? INK : f.kind === "mat" ? "#bdcbb8" : "#d6ba8b";
      out += `<path d="${poly(f.pts)}" fill="${color}" opacity="${f.ghost ? 0.25 : f.light}" stroke="${PAPER}" stroke-width="1"/>`;
    }
    const pieces = bodyPieces(J, view);
    pieces.push({ kind: "arm", region: "neck", pts: [view.project(J.neckBase), view.project(J.headJoint)] });
    for (const p of pieces) {
      const color = isLit(lit, p.kind === "torso" ? "torso" : p.region) ? ACCENT : p.kind === "head" ? "#d9b490" : "#648894";
      let pts = p.pts;
      if (p.kind === "head") {
        const c = pts[0], r = u * 0.11;
        pts = Array.from({ length: 8 }, (_, i) => ({ x: c.x + Math.cos(i * Math.PI / 4) * r, y: c.y + Math.sin(i * Math.PI / 4) * r * 1.12 }));
      } else if (p.kind !== "torso") {
        const a = pts[0], b = pts[pts.length - 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const r = u * (p.kind === "leg" ? 0.052 : p.kind === "arm" ? 0.036 : 0.03);
        const x = (b.y - a.y) / len * r, y = -(b.x - a.x) / len * r;
        pts = [{ x: a.x + x, y: a.y + y }, { x: b.x + x * 0.7, y: b.y + y * 0.7 }, { x: b.x - x * 0.7, y: b.y - y * 0.7 }, { x: a.x - x, y: a.y - y }];
      }
      const d = poly(pts);
      const edge = p.kind === "torso" ? n(u * 0.11) : "1.5";
      out += `<path d="${d}" fill="#514736" stroke="#514736" stroke-width="${edge}" stroke-linejoin="bevel" opacity="0.14" transform="translate(3 4)"/><path d="${d}" fill="${color}" stroke="${p.kind === "torso" ? color : PAPER}" stroke-width="${edge}" stroke-linejoin="bevel"/>`;
      if (pts.length >= 4) out += `<path d="M${n(pts[0].x)} ${n(pts[0].y)}L${n(pts[2].x)} ${n(pts[2].y)}" stroke="#fff" stroke-opacity="0.25" stroke-width="1"/>`;
    }
    const at = view.attachments;
    for (const db of at.dumbbells) {
      const { a, b, r } = dumbbellHeads(db), A = view.project(a), B = view.project(b), R = Math.max(2, u * r);
      out += `<path d="${line([A, B])}" stroke="${INK}" stroke-width="${n(u * 0.025)}"/>`;
      for (const p of [A, B]) out += `<rect x="${n(p.x - R)}" y="${n(p.y - R)}" width="${n(R * 2)}" height="${n(R * 2)}" fill="${INK}" stroke="${PAPER}"/>`;
    }
    for (const points of at.bands) out += `<path d="${line(points.map(view.project))}" fill="none" stroke="${ACCENT}" stroke-width="${n(Math.max(2, u * 0.018))}"/>`;
    if (at.string) out += `<path d="${line(at.string.map(view.project))}" stroke="${INK}" stroke-width="2" stroke-dasharray="4 3"/>`;
    if (lit.heart) {
      const c = view.project(J.thoracic);
      out += `<text x="${n(c.x)}" y="${n(c.y)}" text-anchor="middle" fill="${ACCENT}" font-size="${n(u * 0.1)}">♥</text>`;
    }
    svg.innerHTML = out;
  }
  return {
    dom: svg, draw, update(joints) { J = joints; }, setHighlight(groups) { lit = litRegions(groups); },
    setPulse() {}, setTheme() {},
    snapshot: () => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)),
    dispose: () => svg.remove(),
  };
}
