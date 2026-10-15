// Blueprint: the figure as an engineering drawing that measures you while you move.
// White line work on blueprint blue: limbs as outlined parts with dash-dot centre
// lines, joints as crossed bolt holes, the far side in hidden (dashed) lines, the
// worked muscles hatched like a cut section. Live angle dimensions at the hips and
// knees, the step's height dimensioned, a ground line, a framed sheet and a title
// block with readouts. Drawn as SVG, without three.js.

import { asLayer, boxFaces, litRegions } from "./flat.js";

const NS = "http://www.w3.org/2000/svg";
const PAPER = "#0f4477";
const INK = "#eaf4ff";
const n = (v) => v.toFixed(1);
const FONT = `font-family="JetBrains Mono, ui-monospace, Menlo, Consolas, monospace"`;

// The angle at b between the lines to a and c, in degrees (3D).
function angle(a, b, c) {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z], v = [c.x - b.x, c.y - b.y, c.z - b.z];
  const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI;
}

let drawings = 0;

export function createFigure() {
  const svg = asLayer(document.createElementNS(NS, "svg"), "blueprint");
  const id = "bp" + ++drawings; // pattern ids, unique to this drawing
  svg.setAttribute("aria-hidden", "true");
  let J = null;
  let lit = new Set();

  function draw(view) {
    const { width: w, height: h } = view;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    let o = `<defs>
      <pattern id="${id}-minor" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="${INK}" stroke-opacity="0.07" stroke-width="0.6"/></pattern>
      <pattern id="${id}-major" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="url(#${id}-minor)"/><path d="M60 0H0V60" fill="none" stroke="${INK}" stroke-opacity="0.16" stroke-width="0.8"/></pattern>
      <pattern id="${id}-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${PAPER}"/><path d="M0 0V5" stroke="#ffd27a" stroke-width="1.3"/></pattern>
      <radialGradient id="${id}-light" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1b5c96"/><stop offset="1" stop-color="#0a3360"/></radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-light)"/><rect width="${w}" height="${h}" fill="url(#${id}-major)"/>`;
    o += frame(w, h);
    if (!J) return void (svg.innerHTML = o);
    const u = view.scaleAt(J.pelvis);
    const P = (k) => view.project(J[k]);
    const near = P("hipL").z + P("shoulderL").z < P("hipR").z + P("shoulderR").z ? "L" : "R";
    const far = near === "L" ? "R" : "L";

    const knee = (s) => 180 - angle(J["hip" + s], J["knee" + s], J["ankle" + s]);
    const hip = (s) => 180 - angle(J.neckBase, J["hip" + s], J["knee" + s]);
    const elbow = (s) => 180 - angle(J["shoulder" + s], J["elbow" + s], J["wrist" + s]);
    // The title strip along the top (under the figure), with the readouts (as many as fit).
    const readouts = [
      ["KNEE L/R", `${Math.round(knee("L"))}/${Math.round(knee("R"))}°`],
      ["HIP L/R", `${Math.round(hip("L"))}/${Math.round(hip("R"))}°`],
      ["ELBOW L/R", `${Math.round(elbow("L"))}/${Math.round(elbow("R"))}°`],
      ["PELVIS", `${Math.round(J.pelvis.y * 1000)} mm`],
    ];
    o += titleStrip(readouts, Math.max(150, w - 128));
    o += ground(view, u);
    for (const spec of view.props) o += prop(spec, view, u);

    // A part: an outlined bar with a centre line. Hidden (far) parts are dashed.
    const part = (keys, width, region, hidden) => {
      const pts = keys.map(P);
      const d = "M" + pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L");
      const W = u * width;
      const fill = lit.has(region) ? `url(#${id}-hatch)` : PAPER;
      let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n(W)}" stroke-linecap="round" stroke-linejoin="round"${hidden ? ` stroke-opacity="0.55"` : ""}/>`;
      s += `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${n(Math.max(1, W - 2.6))}" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (hidden) s += `<path d="${d}" fill="none" stroke="${PAPER}" stroke-width="${n(W + 1)}" stroke-dasharray="5 4" stroke-linecap="butt" opacity="0.55"/>`;
      s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="0.7" stroke-dasharray="10 3 2 3" opacity="0.8"/>`;
      return s;
    };
    const bolt = (k, r = 0.022) => {
      const p = P(k), R = u * r;
      return `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(R)}" fill="${PAPER}" stroke="${INK}" stroke-width="0.9"/><path d="M${n(p.x - R * 1.6)} ${n(p.y)}H${n(p.x + R * 1.6)}M${n(p.x)} ${n(p.y - R * 1.6)}V${n(p.y + R * 1.6)}" stroke="${INK}" stroke-width="0.6"/>`;
    };
    const side = (s, hidden) =>
      part(["hip" + s, "knee" + s], 0.13, "thigh" + s, hidden) +
      part(["knee" + s, "ankle" + s], 0.095, "shin" + s, hidden) +
      part(["heel" + s, "ball" + s, "toe" + s], 0.06, "foot" + s, hidden) +
      part(["shoulder" + s, "elbow" + s], 0.085, "upperArm" + s, hidden) +
      part(["elbow" + s, "wrist" + s, "hand" + s], 0.07, "forearm" + s, hidden) +
      (hidden ? "" : ["hip", "knee", "ankle", "shoulder", "elbow"].map((j) => bolt(j + s)).join(""));

    o += side(far, true);
    // Torso, neck and head.
    const torso = ["shoulderL", "shoulderR", "hipR", "hipL"].map(P);
    o += `<path d="M${torso.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}Z" fill="${lit.has("chest") ? `url(#${id}-hatch)` : PAPER}" stroke="${INK}" stroke-width="${n(u * 0.11)}" stroke-linejoin="round"/>`;
    o += `<path d="M${torso.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}Z" fill="${lit.has("chest") ? `url(#${id}-hatch)` : PAPER}" stroke="${lit.has("chest") ? `url(#${id}-hatch)` : PAPER}" stroke-width="${n(Math.max(1, u * 0.11 - 2.6))}" stroke-linejoin="round"/>`;
    const spine = ["neckBase", "thoracic", "lumbar", "pelvis"].map(P);
    o += `<path d="M${spine.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}" fill="none" stroke="${INK}" stroke-width="0.7" stroke-dasharray="10 3 2 3"/>`;
    o += part(["neckBase", "headJoint"], 0.08, "neck", false);
    const hd = P("head"), hr = u * 0.105;
    o += `<circle cx="${n(hd.x)}" cy="${n(hd.y)}" r="${n(hr)}" fill="${PAPER}" stroke="${INK}" stroke-width="1.3"/>`;
    o += `<path d="M${n(hd.x - hr * 1.3)} ${n(hd.y)}H${n(hd.x + hr * 1.3)}M${n(hd.x)} ${n(hd.y - hr * 1.3)}V${n(hd.y + hr * 1.3)}" stroke="${INK}" stroke-width="0.6" stroke-dasharray="6 2 1.5 2"/>`;
    o += side(near, false);

    // Live angle dimensions at the near hip and both knees.
    o += arc(P("knee" + near), P("hip" + near), P("ankle" + near), u * 0.12, `KNEE ${Math.round(knee(near))}°`, 1);
    o += arc(P("knee" + far), P("hip" + far), P("ankle" + far), u * 0.1, `${Math.round(knee(far))}°`, -1, true);
    o += arc(P("hip" + near), P("neckBase"), P("knee" + near), u * 0.16, `HIP ${Math.round(hip(near))}°`, -1);

    svg.innerHTML = o;
  }

  // The sheet: a double border with zone marks along the edges.
  function frame(w, h) {
    const m = 8;
    let s = `<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="${INK}" stroke-opacity="0.55" stroke-width="1.2"/>`;
    s += `<rect x="${m + 5}" y="${m + 5}" width="${w - 2 * m - 10}" height="${h - 2 * m - 10}" fill="none" stroke="${INK}" stroke-opacity="0.3" stroke-width="0.6"/>`;
    const cols = 6, rowsN = 4;
    for (let i = 1; i < cols; i++) {
      const x = m + ((w - 2 * m) * i) / cols;
      s += `<path d="M${n(x)} ${m}v5M${n(x)} ${h - m}v-5" stroke="${INK}" stroke-opacity="0.5"/>`;
    }
    for (let i = 0; i < cols; i++) s += `<text x="${n(m + ((w - 2 * m) * (i + 0.5)) / cols)}" y="${m + 4.2}" fill="${INK}" fill-opacity="0.5" font-size="5" text-anchor="middle" ${FONT}>${i + 1}</text>`;
    for (let i = 0; i < rowsN; i++) s += `<text x="${m + 2.5}" y="${n(m + ((h - 2 * m) * (i + 0.5)) / rowsN)}" fill="${INK}" fill-opacity="0.5" font-size="5" text-anchor="middle" ${FONT}>${"ABCD"[i]}</text>`;
    return s;
  }

  function titleStrip(readouts, maxW) {
    const x = 20, y = 18, cw = 4.9; // cw: width of one 8 px mono character
    let line = "", width = 0;
    for (const [k, v] of readouts) {
      const item = `${k} <tspan font-weight="700" fill="#ffe3a6">${v}</tspan>`;
      const len = (k.length + v.length + 4) * cw;
      if (width + len > maxW - 14) break;
      line += (line ? '<tspan fill-opacity="0.4"> · </tspan>' : "") + item;
      width += len;
    }
    const w = Math.min(maxW, Math.max(width + 14, 190));
    return `<g ${FONT} fill="${INK}"><rect x="${x}" y="${y}" width="${n(w)}" height="31" fill="${PAPER}" fill-opacity="0.85" stroke="${INK}" stroke-width="0.9"/>
      <text x="${x + 7}" y="${y + 12}" font-size="8.5" font-weight="700" letter-spacing="0.5">HOME PROTOCOL · ZONE 2 <tspan font-weight="400" fill-opacity="0.6" letter-spacing="0">DWG Z2-STEP-UP · REV 1.7</tspan></text>
      <path d="M${x} ${y + 16.5}h${n(w)}" stroke="${INK}" stroke-width="0.5" stroke-opacity="0.7"/>
      <text x="${x + 7}" y="${y + 27}" font-size="8">${line}</text></g>`;
  }

  // An angle dimension at b, from the line to a round to the line to c, with its label
  // set off to one side (dir: +1 or −1 along the bisector).
  function arc(b, a, c, r, label, dir, faint = false) {
    const a1 = Math.atan2(a.y - b.y, a.x - b.x), a2 = Math.atan2(c.y - b.y, c.x - b.x);
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const p1 = { x: b.x + Math.cos(a1) * r, y: b.y + Math.sin(a1) * r };
    const p2 = { x: b.x + Math.cos(a1 + d) * r, y: b.y + Math.sin(a1 + d) * r };
    const mid = a1 + d / 2 + (dir < 0 ? Math.PI : 0);
    const lx = b.x + Math.cos(mid) * r * 2.1, ly = b.y + Math.sin(mid) * r * 2.1;
    const op = faint ? 0.55 : 1;
    let s = `<g opacity="${op}"><path d="M${n(b.x)} ${n(b.y)}L${n(p1.x)} ${n(p1.y)}M${n(b.x)} ${n(b.y)}L${n(p2.x)} ${n(p2.y)}" stroke="${INK}" stroke-width="0.5" stroke-dasharray="2 2"/>`;
    s += `<path d="M${n(p1.x)} ${n(p1.y)}A${n(r)} ${n(r)} 0 0 ${d > 0 ? 1 : 0} ${n(p2.x)} ${n(p2.y)}" fill="none" stroke="#ffd27a" stroke-width="1.1"/>`;
    for (const [p, ang] of [[p1, a1 + (d > 0 ? Math.PI / 2 : -Math.PI / 2)], [p2, a1 + d + (d > 0 ? -Math.PI / 2 : Math.PI / 2)]]) {
      const ax = Math.cos(ang), ay = Math.sin(ang);
      s += `<path d="M${n(p.x)} ${n(p.y)}l${n(-ax * 5 + ay * 2)} ${n(-ay * 5 - ax * 2)}M${n(p.x)} ${n(p.y)}l${n(-ax * 5 - ay * 2)} ${n(-ay * 5 + ax * 2)}" stroke="#ffd27a" stroke-width="1"/>`;
    }
    const tw = label.length * 5.2 + 8;
    s += `<path d="M${n(b.x + Math.cos(mid) * r)} ${n(b.y + Math.sin(mid) * r)}L${n(lx)} ${n(ly)}" stroke="${INK}" stroke-width="0.5"/>`;
    s += `<rect x="${n(lx - tw / 2)}" y="${n(ly - 7)}" width="${n(tw)}" height="13" rx="2" fill="${PAPER}" stroke="#ffd27a" stroke-width="0.8"/>`;
    s += `<text x="${n(lx)}" y="${n(ly + 3)}" fill="#ffe3a6" font-size="8.5" font-weight="700" text-anchor="middle" ${FONT}>${label}</text></g>`;
    return s;
  }

  // The floor as a ground line with hatching under it.
  function ground(view, u) {
    const e = view.camera.world;
    const rl = Math.hypot(e[0], e[2]) || 1;
    const r = { x: e[0] / rl, z: e[2] / rl };
    const at = (k) => view.project({ x: J.pelvis.x + r.x * k, y: 0, z: J.pelvis.z + r.z * k });
    const a = at(-0.95), b = at(0.95);
    let s = `<path d="M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}" stroke="${INK}" stroke-width="1.4"/>`;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let i = 0; i <= len; i += 7) {
      const x = a.x + ((b.x - a.x) * i) / len, y = a.y + ((b.y - a.y) * i) / len;
      s += `<path d="M${n(x)} ${n(y)}l-6 8" stroke="${INK}" stroke-opacity="0.5" stroke-width="0.7"/>`;
    }
    return s;
  }

  // The step: its faces outlined, hidden edges dashed underneath, and its height dimensioned.
  function prop(spec, view, u) {
    const faces = boxFaces(spec, view);
    if (!faces.length) return "";
    let s = "";
    for (const f of faces) {
      const d = "M" + f.pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L") + "Z";
      s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.6"/>`;
    }
    for (const f of faces) s += `<path d="M${f.pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}Z" fill="${PAPER}" fill-opacity="${f.light === 1 ? 0.55 : 0.85}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
    // Height: on the bottom corner lowest on screen (nearest the viewer), offset outward.
    const hgt = spec.h ?? (spec.type === "step" ? 0.18 : 0.45);
    const w = spec.w ?? (spec.type === "step" ? 0.62 : 0.45), dp = spec.d ?? (spec.type === "step" ? 0.34 : 0.42);
    const [x0 = 0, , z0 = 0] = spec.pos || [];
    const a = ((spec.rotY || 0) * Math.PI) / 180;
    const world = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
      const lx = (sx * w) / 2, lz = (sz * dp) / 2;
      return { x: x0 + lx * Math.cos(a) + lz * Math.sin(a), y: 0, z: z0 - lx * Math.sin(a) + lz * Math.cos(a) };
    });
    const base = world.reduce((best, c) => (view.project(c).y > view.project(best).y ? c : best), world[0]);
    const bottom = view.project(base), top = view.project({ ...base, y: hgt });
    const ox = -u * 0.12;
    s += `<path d="M${n(bottom.x - 3)} ${n(bottom.y)}h${n(ox - 6)}M${n(top.x - 3)} ${n(top.y)}h${n(ox - 6)}" stroke="${INK}" stroke-width="0.6"/>`;
    const x = bottom.x + ox;
    s += `<path d="M${n(x)} ${n(bottom.y)}V${n(top.y)}M${n(x)} ${n(bottom.y)}l-2.5 -6M${n(x)} ${n(bottom.y)}l2.5 -6M${n(x)} ${n(top.y)}l-2.5 6M${n(x)} ${n(top.y)}l2.5 6" stroke="#ffd27a" stroke-width="1"/>`;
    s += `<text x="${n(x - 5)}" y="${n((bottom.y + top.y) / 2 + 3)}" fill="#ffe3a6" font-size="8.5" font-weight="700" text-anchor="end" ${FONT}>${Math.round(hgt * 1000)}</text>`;
    return s;
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
    setPulse() {},
    setTheme() {},
    snapshot: () => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)),
    dispose: () => svg.remove(),
  };
}
