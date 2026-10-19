// Voxel: a blocky, Minecraft-style figure. Every part is a box with a pixel-art
// texture (face, shirt, jeans, trainers), on a grass floor with a cobblestone step.

import * as THREE from "three";
import { DIM } from "../rig.js";
import { canvasTexture, createHighlighter, createRig, createTwins, disposeTree, hash, propDresser, SIDES } from "./kit.js";

const PALETTE = {
  h: "#5a3a22", H: "#46301b", s: "#e0ac7e", S: "#c9946a", w: "#ffffff", b: "#3b5bdb", m: "#8a4b3a",
  c: "#27a6b8", C: "#1f8a99", p: "#3b4cc0", P: "#2f3d9e", g: "#7a7f87", G: "#5c6168", x: "#e9e9e9",
};

// A texture from rows of palette letters, one pixel per letter.
const pixels = (rows) =>
  canvasTexture(rows[0].length, rows.length, (x) => rows.forEach((row, y) => [...row].forEach((ch, i) => {
    x.fillStyle = PALETTE[ch];
    x.fillRect(i, y, 1, 1);
  })), { nearest: true });

// Rows of `w` letters mixing two shades at random, for cloth and stone.
const noise = (w, h, a, b, seed, share = 0.3) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, i) => (hash(seed, i, y) < share ? b : a)).join(""));

const FACE = ["hhhhhhhh", "hhhhhhhh", "hsssssHh", "ssssssss", "swbsSbws", "sssSSsss", "ssmmmmss", "ssssssss"];
const SIDE = ["hhhhhhhh", "hhhhhhhh", "hhhhhHss", "hhhsssss", "hhssssss", "hsssssss", "ssssssss", "ssssssss"];
const BACK = ["hhhhhhhh", "hhhhhhhh", "hhHhhhhh", "hhhhhhhh", "hhhhhhHh", "hhhhhhhh", "Hhhhhhhh", "ssssssss"];

export function createFigure() {
  const rig = createRig();
  const lambert = (map, color = 0xffffff) => new THREE.MeshLambertMaterial({ map, color });
  const T = {
    face: pixels(FACE), side: pixels(SIDE), back: pixels(BACK), hair: pixels(noise(8, 8, "h", "H", 1)), skin: pixels(noise(8, 8, "s", "S", 2, 0.08)),
    shirt: pixels(["csssssc", ...noise(7, 11, "c", "C", 3)].map((r) => r.slice(0, 7))),
    sleeve: pixels([...noise(4, 4, "c", "C", 4), ...noise(4, 8, "s", "S", 5, 0.06)]),
    jeans: pixels(noise(4, 12, "p", "P", 6)), shoe: pixels(["xxxx", ...noise(4, 5, "g", "G", 7), "GGGG"]),
  };
  const M = Object.fromEntries(Object.entries(T).map(([k, t]) => [k, lambert(t)]));
  const head = [M.side, M.side, M.hair, M.skin, M.face, M.back]; // +x, −x, +y, −y, +z (face), −z

  let hlColor = new THREE.Color(0x34d6a4);
  const twins = createTwins((base) => {
    const m = lambert(base.map, new THREE.Color(0xffffff).lerp(hlColor, 0.45));
    m.emissive.copy(hlColor).multiplyScalar(0.25);
    return m;
  });
  const hl = createHighlighter((mesh, on) => twins.swap(mesh, on));

  const cube = (w, h, d, mat, anchor, pos, region) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = m.receiveShadow = true;
    m.position.set(...pos);
    rig.anchors[anchor].add(m);
    if (region) hl.tag(m, region);
    return m;
  };
  // A box along a bone, a little longer than it so the blocks overlap at the joints.
  const limb = (size, mat, bone, region) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size, 1, size), mat);
    m.castShadow = m.receiveShadow = true;
    rig.seg(m, bone, { from: -0.08, to: 1.06, twist: true });
    hl.tag(m, region);
  };

  cube(0.17, 0.18, 0.17, head, "head", [0, -0.025, 0.01]);
  cube(0.33, 0.27, 0.165, M.shirt, "chest", [0, 0.115, 0], "chest");
  cube(0.31, 0.2, 0.155, M.shirt, "abdomen", [0, 0, 0], "abdomen");
  cube(0.32, 0.17, 0.165, M.jeans, "pelvis", [0, 0.02, 0], "pelvis");
  limb(0.105, M.skin, "neck", "neck");
  const footLength = DIM.heel + DIM.toe, footHeight = 0.04;
  const heelY = -DIM.ankleH, toeY = -DIM.ankleH * 0.55;
  const soleSlope = (toeY - heelY) / footLength;
  for (const [s] of SIDES) {
    limb(0.105, M.sleeve, "upperArm" + s, "upperArm" + s);
    limb(0.095, M.skin, "forearm" + s, "forearm" + s);
    cube(0.09, 0.1, 0.04, M.skin, "hand" + s, [0, 0, 0.003], "hand" + s);
    limb(0.1, M.jeans, "thigh" + s, "thigh" + s);
    limb(0.08, M.jeans, "shin" + s, "shin" + s);
    // Slant the block's sole between heel and toe so pitched feet stay on their contact points.
    const foot = cube(0.125, footHeight, footLength, M.shoe, "foot" + s, [0, heelY + footHeight / 2, (DIM.toe - DIM.heel) / 2], "foot" + s);
    const position = foot.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) position.setY(i, position.getY(i) + soleSlope * (position.getZ(i) + footLength / 2));
    position.needsUpdate = true;
    foot.geometry.computeVertexNormals();
    foot.geometry.computeBoundingBox();
    foot.geometry.computeBoundingSphere();
  }

  // Props get a pixel texture in their own colour (a cobblestone grey step, wood, the
  // mat); metal and the see-through wall stay as they are.
  const grain = canvasTexture(16, 16, (x) => {
    for (let i = 0; i < 256; i++) {
      const v = 200 + Math.round(55 * hash(i, 9)) - (hash(i, 10) < 0.3 ? 60 : 0);
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.fillRect(i % 16, Math.floor(i / 16), 1, 1);
    }
  }, { nearest: true });
  return {
    group: rig.group,
    look: (dark) => ({
      tone: "none",
      hemi: [0xffffff, dark ? 0x3a4a3a : 0x8a9a80, dark ? 1.1 : 1.3],
      key: [0xfff6e0, 1.9],
      rim: [0xffffff, 0.2],
      floor: { color: dark ? "#2f5a2a" : "#6aa84f", grid: dark ? "#1d3a1a" : "#3d7a2a", gridOpacity: 0.7 },
    }),
    update(J) { rig.update(J); rig.keepFeetAboveFloor(); },
    setHighlight: (groups) => hl.set(groups),
    setPulse(v) {
      for (const m of twins.all()) m.emissiveIntensity = 0.5 + 0.9 * v;
    },
    setTheme(dark, colors = {}) {
      hlColor = new THREE.Color(colors.hl || 0x34d6a4);
      for (const m of twins.all()) {
        m.color.set(0xffffff).lerp(hlColor, 0.45);
        m.emissive.copy(hlColor).multiplyScalar(0.25);
      }
    },
    dressProp: propDresser((src) => (src.metalness > 0.3 || src.transparent ? src : lambert(grain, src.color))),
    dispose: () => disposeTree(rig.group, [...Object.values(M), ...twins.all()]),
  };
}
