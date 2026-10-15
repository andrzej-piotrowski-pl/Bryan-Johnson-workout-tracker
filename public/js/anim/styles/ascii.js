// ASCII: the figure typed out in characters on a green-screen terminal. The scene is
// rasterised at one pixel per character cell and each cell's brightness picks a
// character from RAMP: a dotted floor grid, the step, then the body, its near side
// brighter, the worked muscles in amber. Drawn as text in a <pre>, without three.js.

import { asLayer, boxFaces, litRegions } from "./flat.js";

const RAMP = " .,:-=+*#%@";
const BG = "#03130a";
const GREEN = "#5dff9a";
const DIM = "#2a8a4c";
const AMBER = "#ffb84d";
const CSS = `
.ascii-pre { margin: 0; position: absolute; left: 0; top: 0; color: ${GREEN}; transform-origin: 0 0; white-space: pre;
  text-shadow: 0 0 4px rgba(93,255,154,0.55); animation: ascii-flicker 4s steps(1) infinite; }
.ascii-pre b { color: ${AMBER}; font-weight: inherit; text-shadow: 0 0 5px rgba(255,184,77,0.6); }
.ascii-pre i { color: ${DIM}; font-style: normal; text-shadow: none; }
@keyframes ascii-flicker { 0%, 100% { opacity: 1; } 47% { opacity: 0.93; } 48% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ascii-pre { animation: none; } }`;

export function createFigure() {
  const layer = asLayer(document.createElement("div"), "ascii");
  layer.style.background = BG;
  layer.style.overflow = "hidden";
  layer.innerHTML = `<style>${CSS}</style><pre class="ascii-pre"></pre><div style="position:absolute;inset:0;background:repeating-linear-gradient(rgba(0,0,0,0.22) 0 1px, transparent 1px 3px), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55))"></div>`;
  const pre = layer.querySelector("pre");
  const raster = document.createElement("canvas");
  const rx = raster.getContext("2d", { willReadFrequently: true });
  let J = null;
  let lit = new Set();
  let grid = { cols: 0, rows: 0, cw: 1, ch: 1, font: 10, w: 0, h: 0 };
  let cells = [];

  // Cell size for the stage's size: about 5.5 px wide, 48 to 140 columns.
  function layout(w, h) {
    if (grid.w === w && grid.h === h) return;
    const cols = Math.max(48, Math.min(140, Math.round(w / 5.5)));
    const cw = w / cols, ch = cw * 1.8;
    grid = { cols, rows: Math.max(10, Math.floor(h / ch)), cw, ch, font: cw / 0.6, w, h };
    raster.width = grid.cols;
    raster.height = grid.rows;
    pre.style.font = `${grid.font}px/${ch}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`;
    pre.style.transform = "";
    pre.textContent = "M".repeat(cols);
    const real = pre.getBoundingClientRect().width;
    if (real > 0) pre.style.transform = `scaleX(${w / real})`; // fonts differ: stretch to the width
  }

  function draw(view) {
    const { width: w, height: h } = view;
    layout(w, h);
    const { cols, rows } = grid;
    rx.setTransform(1, 0, 0, 1, 0, 0);
    rx.fillStyle = "#000";
    rx.fillRect(0, 0, cols, rows);
    rx.setTransform(cols / w, 0, 0, rows / h, 0, 0);
    rx.lineCap = rx.lineJoin = "round";
    if (J) {
      const u = view.scaleAt(J.pelvis);
      const P = (n) => view.project(J[n]);
      // Floor grid, 30 cm squares.
      rx.strokeStyle = "rgb(80,0,0)";
      rx.lineWidth = grid.cw * 0.7;
      for (let i = -4; i <= 4; i++) {
        for (const [a, b] of [[{ x: i * 0.3, z: -1.2 }, { x: i * 0.3, z: 1.2 }], [{ x: -1.2, z: i * 0.3 }, { x: 1.2, z: i * 0.3 }]]) {
          const p = view.project({ x: a.x, y: 0, z: a.z }), q = view.project({ x: b.x, y: 0, z: b.z });
          rx.beginPath();
          rx.moveTo(p.x, p.y);
          rx.lineTo(q.x, q.y);
          rx.stroke();
        }
      }
      for (const spec of view.props) {
        for (const f of boxFaces(spec, view)) {
          rx.fillStyle = `rgb(${Math.round(70 + 90 * f.light)},0,0)`;
          rx.beginPath();
          for (const p of f.pts) rx.lineTo(p.x, p.y);
          rx.closePath();
          rx.fill();
        }
      }
      // The body, far side first: each limb a wide dim stroke under a narrow bright
      // one, so its middle gets the dense characters. Green channel marks highlights.
      const near = P("hipL").z + P("shoulderL").z < P("hipR").z + P("shoulderR").z ? "L" : "R";
      const far = near === "L" ? "R" : "L";
      const limb = (names, width, bright, region) => {
        const g = lit.has(region) ? 255 : 0;
        const pts = names.map(P);
        for (const [k, b] of [[1, 0.55], [0.5, 1]]) {
          rx.strokeStyle = `rgb(${Math.round(bright * b)},${g},0)`;
          rx.lineWidth = u * width * k;
          rx.beginPath();
          for (const p of pts) rx.lineTo(p.x, p.y);
          rx.stroke();
        }
      };
      const side = (s, bright) => {
        limb(["hip" + s, "knee" + s], 0.16, bright, "thigh" + s);
        limb(["knee" + s, "ankle" + s], 0.13, bright, "shin" + s);
        limb(["heel" + s, "toe" + s], 0.09, bright, "foot" + s);
        limb(["shoulder" + s, "elbow" + s], 0.11, bright, "upperArm" + s);
        limb(["elbow" + s, "wrist" + s, "hand" + s], 0.095, bright, "forearm" + s);
      };
      side(far, 165);
      const torso = ["shoulderL", "shoulderR", "hipR", "hipL"].map(P);
      for (const [k, b] of [[0.24, 0.6], [0.08, 1]]) {
        rx.fillStyle = rx.strokeStyle = `rgb(${Math.round(225 * b)},${lit.has("chest") ? 255 : 0},0)`;
        rx.lineWidth = u * k;
        rx.beginPath();
        for (const p of torso) rx.lineTo(p.x, p.y);
        rx.closePath();
        rx.fill();
        rx.stroke();
      }
      const head = P("head");
      for (const [r, b] of [[0.13, 0.6], [0.085, 1]]) {
        rx.fillStyle = `rgb(${Math.round(255 * b)},0,0)`;
        rx.beginPath();
        rx.arc(head.x, head.y, u * r, 0, Math.PI * 2);
        rx.fill();
      }
      side(near, 255);
    }
    // Pixels → characters; runs of amber (<b>) and dim (<i>) cells are wrapped.
    const data = rx.getImageData(0, 0, cols, rows).data;
    cells = [];
    const lines = [];
    const label = "> protocol.exe" + (Math.floor(performance.now() / 530) % 2 ? " _" : "  ");
    for (let y = 0; y < rows; y++) {
      let line = "", open = "";
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        let ch = RAMP[Math.min(RAMP.length - 1, Math.floor((data[i] / 256) * RAMP.length))];
        let tag = data[i + 1] > 128 && data[i] > 40 ? "b" : data[i] < 110 && ch !== " " ? "i" : "";
        if (y === 1 && x >= 2 && x < 2 + label.length) [ch, tag] = [label[x - 2], ""];
        cells.push([ch, tag]);
        if (tag !== open) {
          if (open) line += `</${open}>`;
          if (tag) line += `<${tag}>`;
          open = tag;
        }
        line += ch;
      }
      if (open) line += `</${open}>`;
      lines.push(line);
    }
    pre.innerHTML = lines.join("\n");
  }

  return {
    dom: layer,
    update(joints) {
      J = joints;
    },
    draw,
    setHighlight(groups) {
      lit = litRegions(groups);
    },
    setPulse() {},
    setTheme() {},
    // The same characters typed onto a canvas, for thumbnails.
    snapshot() {
      const { cols, rows, cw, ch, w, h } = grid;
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      const x = c.getContext("2d");
      x.fillStyle = BG;
      x.fillRect(0, 0, c.width, c.height);
      x.font = `${ch * 0.95}px ui-monospace, Menlo, Consolas, monospace`;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.shadowBlur = 4;
      for (let y = 0; y < rows; y++) {
        for (let i = 0; i < cols; i++) {
          const [chr, tag] = cells[y * cols + i] || [" ", ""];
          if (chr === " ") continue;
          x.fillStyle = x.shadowColor = tag === "b" ? AMBER : tag === "i" ? DIM : GREEN;
          x.fillText(chr, (i + 0.5) * cw, (y + 0.5) * ch);
        }
      }
      return c.toDataURL("image/png");
    },
    dispose: () => layer.remove(),
  };
}
