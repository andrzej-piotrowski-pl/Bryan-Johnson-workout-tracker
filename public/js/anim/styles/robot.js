// Ceramic shells and exposed joints, animated by the same exercise rig.
import * as THREE from "three";
import { SIDES, buildBody, createHighlighter, createRig, createTwins, disposeTree, propDresser } from "./kit.js";

export function createFigure() {
  const rig = createRig();
  const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 });
  const mats = {
    skin: material(0xc8d1dc), top: material(0xe8eef4), bottom: material(0x66778d),
    shoe: material(0xdce6ee), sole: material(0x263449), sock: material(0x263449),
    joint: material(0x263449), visor: material(0x133d51), light: material(0x47d7dc),
  };
  const twins = createTwins(() => {
    const m = material(0xffb74d);
    m.emissive.set(0xffa832);
    return m;
  });
  const hl = createHighlighter((mesh, on) => twins.swap(mesh, on));
  const ball = new THREE.SphereGeometry(1, 16, 12);
  const helmet = new THREE.BoxGeometry(1.8, 1.8, 1.8);
  buildBody(rig, {
    geo: { sphere: ball, seg: (rt, rb) => new THREE.CylinderGeometry(rt, rb, 1, 12) },
    mat: (role) => mats[role], sleeve: 0.78, shorts: 0.78, girth: 0.95,
    part(mesh, region) {
      if (region === "head") mesh.geometry = helmet;
      hl.tag(mesh, region);
    },
  });
  const add = (anchor, geo, mat, pos, scale) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    rig.anchors[anchor].add(mesh);
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  add("head", box, mats.visor, [0, 0.015, 0.099], [0.15, 0.073, 0.018]);
  for (const [s, side] of SIDES) {
    add("head", box, mats.light, [side * 0.038, 0.018, 0.111], [0.026, 0.012, 0.008]);
    for (const joint of ["elbow", "knee", "wrist"]) {
      add(joint + s, ball, mats.joint, [0, 0, 0], [0.039, 0.039, 0.039]);
    }
  }
  add("chest", box, mats.joint, [0, 0.15, 0.116], [0.105, 0.1, 0.015]);
  add("chest", box, mats.light, [0, 0.15, 0.127], [0.062, 0.012, 0.008]);

  return {
    group: rig.group,
    look: (dark) => ({ hemi: [0xffffff, dark ? 0x283d59 : 0x9aaabe, 1.2], key: [0xf4f8ff, 2.4], rim: [0x9ce8ff, 0.8] }),
    update: (J) => rig.update(J),
    setHighlight: (groups) => hl.set(groups),
    setPulse(v) { for (const m of twins.all()) m.emissiveIntensity = 0.15 + v * 0.35; },
    setTheme() {},
    dressProp: propDresser((src) => material(src.color)),
    dispose: () => disposeTree(rig.group, [...Object.values(mats), ...twins.all()]),
  };
}
