// Doodle: a biro stick figure in the margin of a school notebook, having opinions.
// The lines are redrawn with a fresh wobble eight times a second, like hand-drawn
// animation. The worked muscles get yellow highlighter, the heart a red-pen doodle;
// the face strains on the way up, sweat drops fly, motion lines trail the feet, the
// reps pile up as tally marks in the margin and a speech bubble complains about it
// all. Drawn as SVG, without three.js.

import { asLayer, boxFaces, litRegions } from "./flat.js";
import { hash } from "./kit.js";

const NS = "http://www.w3.org/2000/svg";
const INK = "#22409a";
const RED = "#d8332f";
const HAND = `font-family="'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', 'Segoe Print', 'Bradley Hand', cursive"`;
const QUOTES = [
  "Step up. Step down. Repeat until enlightened.",
  "My legs just filed a complaint.",
  "Zone 2 means I can still talk. Barely.",
  "Is this the step? It's always the step.",
  "Heart rate: yes.",
  "I'm not sweating. I'm sparkling.",
  "Up, up, down, down... no cheat codes?",
  "Somewhere, a staircase is proud of me.",
  "Talking pace. Talking. Pace. Pace.",
];
const n = (v) => v.toFixed(1);

// A smooth path through points (Catmull-Rom as cubic Béziers).
function curve(pts, closed = false) {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${n(P[1].x)} ${n(P[1].y)}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d += `C${n(p1.x + (p2.x - p0.x) / 6)} ${n(p1.y + (p2.y - p0.y) / 6)} ${n(p2.x - (p3.x - p1.x) / 6)} ${n(p2.y - (p3.y - p1.y) / 6)} ${n(p2.x)} ${n(p2.y)}`;
  }
  return closed ? d + "Z" : d;
}

// The same points, nudged sideways at random every `step` pixels: a hand-drawn line.
function wobble(pts, seed, amp, step = 11) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
    const k = Math.max(1, Math.round(L / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, o = (hash(seed, i * 37 + j) - 0.5) * 2 * amp;
      out.push({ x: a.x + (b.x - a.x) * t + nx * o, y: a.y + (b.y - a.y) * t + ny * o });
    }
  }
  const z = pts[pts.length - 1];
  out.push({ x: z.x + (hash(seed, 999) - 0.5) * amp, y: z.y + (hash(seed, 998) - 0.5) * amp });
  return out;
}

function wobblyCircle(c, r, seed, amp) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.3, rr = r + (hash(seed, i) - 0.5) * 2 * amp;
    pts.push({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr });
  }
  return curve(pts, true);
}

// Words into lines of at most `max` characters.
function wrap(text, max) {
  const lines = [];
  let line = "";
  for (const w of text.split(" ")) {
    if ((line + " " + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  return line ? [...lines, line] : lines;
}

let drawings = 0;

export function createFigure() {
  const svg = asLayer(document.createElementNS(NS, "svg"), "doodle");
  svg.setAttribute("aria-hidden", "true");
  const id = "dd" + ++drawings;
  let J = null;
  let lit = new Set();
  let still = false;
  let beat = 1;
  let reps = 0;
  let up = false;
  const trail = { L: [], R: [] }; // recent foot positions on screen, for motion lines

  function draw(view) {
    const { width: w, height: h } = view;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    const now = performance.now() / 1000;
    const seed = still ? 1 : Math.floor(now * 8); // the line boil: a new wobble 8 times a second
    let o = `<defs><pattern id="${id}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 0V7" stroke="${INK}" stroke-width="1" stroke-opacity="0.55"/></pattern></defs>`;
    // The notebook page: ruled lines, a red margin and punched holes.
    o += `<rect width="${w}" height="${h}" fill="#fdfbf3"/>`;
    for (let y = 46; y < h; y += 23) o += `<path d="M0 ${y}H${w}" stroke="#9fc3e8" stroke-width="1" stroke-opacity="0.75"/>`;
    o += `<path d="M44 0V${h}" stroke="#ef8a8a" stroke-width="1.3"/>`;
    for (const y of [h * 0.18, h * 0.5, h * 0.82]) o += `<circle cx="20" cy="${n(y)}" r="7" fill="#e9e4d6" stroke="#d6cfbd"/>`;
    if (!J) return void (svg.innerHTML = o);

    const u = view.scaleAt(J.pelvis);
    const P = (k) => view.project(J[k]);
    const amp = Math.max(0.9, u * 0.004);
    const pen = (pts, sd, width = 2.3, color = INK) => {
      const d = curve(wobble(pts, sd, amp));
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${curve(wobble(pts, sd + 500, amp))}" fill="none" stroke="${color}" stroke-width="${width * 0.5}" stroke-opacity="0.45" stroke-linecap="round"/>`;
    };

    // Reps as tally marks in the margin: one each time the hips come up onto the step.
    if (!still) {
      if (!up && J.pelvis.y > 1.06) (up = true), reps++;
      if (up && J.pelvis.y < 0.99) up = false;
    }
    const shown = still ? 7 : reps;
    o += `<text x="52" y="38" fill="${INK}" font-size="13" ${HAND}>reps:</text>`;
    for (let i = 0; i < Math.min(shown, 40); i++) {
      const g = Math.floor(i / 5), k = i % 5, x0 = 92 + g * 30;
      o += k < 4
        ? pen([{ x: x0 + k * 5, y: 26 }, { x: x0 + k * 5 + 1, y: 40 }], 300 + i, 1.6)
        : pen([{ x: x0 - 3, y: 38 }, { x: x0 + 19, y: 27 }], 300 + i, 1.6);
    }

    // Ground: a wobbly line and a scribbled shadow.
    const g = view.project({ x: J.pelvis.x, y: 0, z: J.pelvis.z });
    o += pen([{ x: g.x - u * 0.8, y: g.y + 2 }, { x: g.x + u * 0.8, y: g.y }], 7, 1.8);
    const scribble = [];
    for (let i = 0; i <= 9; i++) scribble.push({ x: g.x - u * 0.25 + (u * 0.5 * i) / 9, y: g.y - 3 + (i % 2) * 6 });
    o += `<path d="${curve(wobble(scribble, seed + 3, amp, 30))}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-opacity="0.35"/>`;

    // The step, outlined and hatched.
    for (const spec of view.props) {
      for (const f of boxFaces(spec, view)) {
        o += `<path d="M${f.pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}Z" fill="${f.light === 1 ? "#fdfbf3" : `url(#${id}-hatch)`}"/>`;
        o += pen([...f.pts, f.pts[0]], 40 + Math.round(f.light * 10) + seed, 1.8);
      }
    }

    // Highlighter on the worked muscles, under the ink.
    const marker = (pts, width) => `<path d="M${pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}" fill="none" stroke="#ffe94a" stroke-opacity="0.75" stroke-width="${n(width)}" stroke-linecap="square" style="mix-blend-mode:multiply"/>`;
    for (const s of ["L", "R"]) {
      if (lit.has("thigh" + s)) o += marker([P("hip" + s), P("knee" + s)], u * 0.11);
      if (lit.has("shin" + s)) o += marker([P("knee" + s), P("ankle" + s)], u * 0.09);
      if (lit.has("upperArm" + s)) o += marker([P("shoulder" + s), P("elbow" + s)], u * 0.08);
      if (lit.has("forearm" + s)) o += marker([P("elbow" + s), P("hand" + s)], u * 0.07);
    }
    if (lit.has("pelvis")) o += marker([P("hipL"), P("hipR")], u * 0.14);
    if (lit.has("abdomen")) o += marker([P("lumbar"), P("thoracic")], u * 0.12);

    // The stick figure: arms from one shoulder point, legs from the hips, little feet.
    const neck = view.project(J.neckBase.clone().lerp(J.thoracic, 0.15));
    const near = P("hipL").z < P("hipR").z ? "L" : "R";
    for (const s of near === "L" ? ["R", "L"] : ["L", "R"]) {
      o += pen([P("pelvis"), P("knee" + s), P("ankle" + s), P("toe" + s)], seed * 3 + (s === "L" ? 1 : 2));
      o += pen([neck, P("elbow" + s), P("hand" + s)], seed * 3 + (s === "L" ? 11 : 12));
    }
    o += pen([neck, P("pelvis")], seed * 3 + 21, 2.6);
    o += pen([P("headJoint"), neck], seed * 3 + 22, 2.3);

    // The head and its face, turned the way the head faces.
    const hd = P("head"), r = u * 0.1;
    o += `<path d="${wobblyCircle(hd, r, seed * 5 + 1, amp * 0.8)}" fill="#fdfbf3" stroke="${INK}" stroke-width="2.3"/>`;
    // Eyes and mouth sit on the front of the head in 3D, so they turn with it.
    const e = J.Rh.elements;
    const onHead = (x, y, z) => view.project({ x: J.head.x + e[0] * x + e[4] * y + e[8] * z, y: J.head.y + e[1] * x + e[5] * y + e[9] * z, z: J.head.z + e[2] * x + e[6] * y + e[10] * z });
    const facing = onHead(0, 0, 0.1).z < hd.z; // the face is on our side of the head
    const flex = Math.max(...["L", "R"].map((s) => 180 - angleAt(J["hip" + s], J["knee" + s], J["ankle" + s])));
    const strain = flex > 55 ? 2 : flex > 28 ? 1 : 0;
    if (facing) {
      for (const k of [-1, 1]) {
        const ep = onHead(0.034 * k, 0.018, 0.088);
        o += strain === 2
          ? pen([{ x: ep.x - 3 * k, y: ep.y - 2.5 }, { x: ep.x + 3 * k, y: ep.y }, { x: ep.x - 3 * k, y: ep.y + 2.5 }], seed + 70 + k, 1.6)
          : `<circle cx="${n(ep.x)}" cy="${n(ep.y)}" r="${n(Math.max(1.6, r * 0.09))}" fill="${INK}"/>`;
        if (strain) {
          const b1 = onHead(0.034 * k - 0.016, 0.05 + 0.006 * strain * k, 0.084), b2 = onHead(0.034 * k + 0.016, 0.05 - 0.006 * strain * k, 0.084);
          o += pen([b1, b2], seed + 80 + k, 1.4);
        }
      }
      const ml = onHead(-0.03, -0.042, 0.088), mr = onHead(0.03, -0.042, 0.088), mc = onHead(0, -0.05, 0.09);
      o += strain === 2
        ? `<ellipse cx="${n(mc.x)}" cy="${n(mc.y)}" rx="${n(r * 0.17)}" ry="${n(r * 0.14)}" fill="#fdfbf3" stroke="${INK}" stroke-width="1.6"/>`
        : strain === 1
          ? pen([ml, mr], seed + 90, 1.6)
          : `<path d="M${n(ml.x)} ${n(ml.y)}Q${n(mc.x)} ${n(mc.y + r * 0.3)} ${n(mr.x)} ${n(mr.y)}" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`;
    }

    // Sweat drops flying off the head.
    for (let k = 0; k < 3; k++) {
      const t0 = still ? 0.35 + k * 0.2 : (now + k * 0.37) % 1.1;
      if (t0 > 0.75) continue;
      const dir = hash(k, Math.floor((now + k * 0.37) / 1.1)) < 0.5 ? -1 : 1;
      const x = hd.x + dir * (r * 1.05 + 55 * t0), y = hd.y - r * 0.6 - 70 * t0 + 260 * t0 * t0;
      o += `<path d="M${n(x)} ${n(y - 7)}Q${n(x + 4.5)} ${n(y + 1)} ${n(x)} ${n(y + 3)}Q${n(x - 4.5)} ${n(y + 1)} ${n(x)} ${n(y - 7)}Z" fill="#cfe6ff" stroke="${INK}" stroke-width="1.3" opacity="${n(1 - t0 / 0.75)}"/>`;
    }

    // Motion lines behind a foot that's moving fast.
    for (const s of ["L", "R"]) {
      const p = P("ankle" + s), tr = trail[s];
      tr.push({ t: now, x: p.x, y: p.y });
      while (tr.length && now - tr[0].t > 0.12) tr.shift();
      const q = tr[0];
      if (still || !q) continue;
      const dx = p.x - q.x, dy = p.y - q.y, L = Math.hypot(dx, dy);
      if (L < u * 0.05) continue;
      const nx = -dy / L, ny = dx / L;
      for (const k of [-1, 0, 1]) {
        const ox = nx * k * 7, oy = ny * k * 7;
        o += pen([{ x: p.x - (dx / L) * 12 + ox, y: p.y - (dy / L) * 12 + oy }, { x: p.x - (dx / L) * (26 + 6 * (k === 0)) + ox, y: p.y - (dy / L) * (26 + 6 * (k === 0)) + oy }], seed + 120 + k, 1.4);
      }
    }

    // A red-pen heart by the chest when the heart is working.
    if (lit.has("chest")) {
      const c = view.project(J.thoracic.clone().lerp(J.neckBase, 0.4));
      const s = u * 0.045 * beat, x = c.x + u * 0.16, y = c.y - u * 0.02;
      o += `<path d="M${n(x)} ${n(y + s)}C${n(x - s * 1.6)} ${n(y - s * 0.2)} ${n(x - s * 0.8)} ${n(y - s * 1.4)} ${n(x)} ${n(y - s * 0.5)}C${n(x + s * 0.8)} ${n(y - s * 1.4)} ${n(x + s * 1.6)} ${n(y - s * 0.2)} ${n(x)} ${n(y + s)}Z" fill="${RED}" fill-opacity="0.85" stroke="${RED}" stroke-width="1.2"/>`;
      o += pen([{ x: x + s * 1.4, y: y - s * 1.3 }, { x: x + s * 2.1, y: y - s * 1.9 }], seed + 140, 1.2, RED);
      o += pen([{ x: x + s * 1.7, y: y - s * 0.4 }, { x: x + s * 2.5, y: y - s * 0.5 }], seed + 141, 1.2, RED);
    }

    // The speech bubble: a new opinion every few seconds.
    const quote = QUOTES[still ? 0 : Math.floor(now / 4.2) % QUOTES.length];
    const lines = wrap(quote, 19);
    const bw = Math.max(...lines.map((l) => l.length)) * 7 + 22, bh = lines.length * 16 + 14;
    // The first spot round the head that's on the page, off the head and clear of the
    // stage's buttons (top right).
    const spots = [
      [hd.x + r * 1.1, hd.y - r * 1.3 - bh],
      [hd.x - r * 1.1 - bw, hd.y - r * 1.3 - bh],
      [hd.x + r * 1.5, hd.y - bh * 0.6],
      [hd.x - r * 1.5 - bw, hd.y - bh * 0.6],
    ];
    const fits = ([x, y]) => x >= 52 && x + bw <= w - 8 && y >= 50 && y + bh <= h - 80 && !(x + bw > w - 112 && y < 190);
    const [bx, by] = spots.find(fits) || [Math.max(52, Math.min(w - bw - 8, spots[0][0])), Math.max(50, spots[0][1])];
    const right = bx > hd.x;
    const tail = right ? { x: bx + 18, y: by + bh } : { x: bx + bw - 18, y: by + bh };
    const box = [{ x: bx, y: by + 6 }, { x: bx + 6, y: by }, { x: bx + bw - 6, y: by }, { x: bx + bw, y: by + 6 }, { x: bx + bw, y: by + bh - 6 }, { x: bx + bw - 6, y: by + bh }, { x: bx + 6, y: by + bh }, { x: bx, y: by + bh - 6 }];
    o += `<path d="${curve(wobble([...box, box[0]], seed + 200, amp * 0.8, 24))}" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/>`;
    const tip = { x: hd.x + (right ? r * 0.75 : -r * 0.75), y: hd.y - r * 0.75 };
    if (tail.y < tip.y) o += `<path d="M${n(tail.x - 6)} ${n(tail.y - 1)}L${n(tip.x)} ${n(tip.y)}L${n(tail.x + 6)} ${n(tail.y - 1)}" fill="#ffffff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    else o += `<path d="M${n(right ? bx + 1 : bx + bw - 1)} ${n(by + bh / 2 - 6)}L${n(tip.x)} ${n(tip.y)}L${n(right ? bx + 1 : bx + bw - 1)} ${n(by + bh / 2 + 6)}" fill="#ffffff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    lines.forEach((l, i) => (o += `<text x="${n(bx + 11)}" y="${n(by + 20 + i * 16)}" fill="${INK}" font-size="12.5" ${HAND}>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`));
    svg.innerHTML = o;
  }

  return {
    dom: svg,
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
    snapshot: () => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)),
    dispose: () => svg.remove(),
  };
}

function angleAt(a, b, c) {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z], v = [c.x - b.x, c.y - b.y, c.z - b.z];
  const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI;
}
