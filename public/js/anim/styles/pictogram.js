// Pictogram: the figure as a sign, after Otl Aicher's pictograms for the 1972 Munich
// Olympics. Even white bars for the limbs, a tapering torso, a round head floating
// above the shoulders, on a blue tile; the worked limbs in Munich orange and, for heart
// work, an orange heart on the chest. A thin
// gap in the tile's colour runs round each near limb so it reads in front of the far
// one. Drawn as SVG, no three.js.

import { asLayer, bodyPieces, boxFaces, litRegions } from "./flat.js";

const NS = "http://www.w3.org/2000/svg";
const TILE = "#1d6fb8";
const FIGURE = "#ffffff";
const ACCENT = "#f7a541";
const PROP = { 1: "#64a6e0", 0.78: "#428dd1", 0.62: "#3179c0" };
// Bar widths in metres.
const WIDTH = { arm: 0.084, leg: 0.11, foot: 0.064, torso: 0.13, gap: 0.03, head: 0.122 };
// A heart, 1 unit wide, centred on the origin.
const HEART = "M0 0.32C-0.06 0.26-0.5 -0.02-0.5 -0.2-0.5 -0.36-0.38 -0.46-0.25 -0.46-0.14 -0.46-0.05 -0.4 0 -0.3 0.05 -0.4 0.14 -0.46 0.25 -0.46 0.38 -0.46 0.5 -0.36 0.5 -0.2 0.5 -0.02 0.06 0.26 0 0.32Z";

const n = (v) => v.toFixed(1);
const poly = (pts) => "M" + pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L") + "Z";
const line = (pts) => "M" + pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L");

export function createFigure() {
  const svg = asLayer(document.createElementNS(NS, "svg"), "pictogram");
  svg.setAttribute("aria-hidden", "true");
  let J = null;
  let lit = new Set();
  let beat = 1;

  function draw(view) {
    const { width: w, height: h } = view;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    let out = `<rect width="${w}" height="${h}" fill="${TILE}"/>`;
    if (!J) return void (svg.innerHTML = out);
    const u = view.scaleAt(J.pelvis);
    const ground = view.project({ x: J.pelvis.x, y: 0, z: J.pelvis.z });
    out += `<ellipse cx="${n(ground.x)}" cy="${n(ground.y)}" rx="${n(u * 0.42)}" ry="${n(u * 0.07)}" fill="#000" opacity="0.14"/>`;
    for (const spec of view.props) {
      for (const f of boxFaces(spec, view)) out += `<path d="${poly(f.pts)}" fill="${PROP[f.light]}" stroke="${TILE}" stroke-width="${n(u * 0.01)}" stroke-linejoin="round"/>`;
    }
    // Pieces far to near; the limbs of one side go as one chain, gap first, then the bars,
    // so the gap separates them from what's behind but not from each other.
    const pieces = bodyPieces(J, view);
    const chains = [];
    for (const p of pieces) {
      const key = p.side ? p.side + (p.kind === "arm" ? "arm" : "leg") : p.kind;
      const last = chains[chains.length - 1];
      if (last && last.key === key) last.items.push(p);
      else chains.push({ key, items: [p] });
    }
    for (const { items } of chains) {
      for (const pass of ["gap", "bar"]) {
        for (const p of items) {
          const color = pass === "gap" ? TILE : p.kind !== "torso" && lit.has(p.region) ? ACCENT : FIGURE;
          const extra = pass === "gap" ? WIDTH.gap * 2 : 0;
          if (p.kind === "head") {
            const c = p.pts[0];
            out += `<circle cx="${n(c.x)}" cy="${n(c.y - u * 0.012)}" r="${n(u * (WIDTH.head + extra / 2))}" fill="${color}"/>`;
          } else if (p.kind === "torso") {
            out += `<path d="${poly(p.pts)}" fill="${color}" stroke="${color}" stroke-width="${n(u * (WIDTH.torso + extra))}" stroke-linejoin="round"/>`;
            if (pass === "bar" && lit.has("chest")) {
              const c = view.project(J.thoracic.clone().lerp(J.neckBase, 0.45));
              out += `<path d="${HEART}" fill="${ACCENT}" transform="translate(${n(c.x)} ${n(c.y)}) scale(${n(u * 0.085 * beat)})"/>`;
            }
          } else {
            out += `<path d="${line(p.pts)}" fill="none" stroke="${color}" stroke-width="${n(u * (WIDTH[p.kind] + extra))}" stroke-linecap="round" stroke-linejoin="round"/>`;
          }
        }
      }
    }
    svg.innerHTML = out;
  }

  return {
    dom: svg,
    update(joints) {
      J = joints;
    },
    draw,
    setHighlight(groups) {
      lit = litRegions(groups);
    },
    setPulse(v) {
      beat = 0.9 + 0.2 * v;
    },
    setTheme() {},
    snapshot: () => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)),
    dispose: () => svg.remove(),
  };
}
