// Low poly: faceted shapes and flat colours, like Quaternius' free game characters.
// Few polygons, so it's light to draw, and the flat faces make every pose easy to read.

import * as THREE from "three";
import { SIDES, buildBody, createHighlighter, createRig, createTwins, disposeTree, propDresser } from "./kit.js";

export function createFigure() {
  const rig = createRig();
  const flat = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0 });
  const mats = {
    skin: flat(0xf0c08a),
    top: flat(0x3f88c5),
    bottom: flat(0x2e3a59),
    shoe: flat(0xe4572e),
    sole: flat(0xf2efe9),
    sock: flat(0xf2efe9),
    hair: flat(0x6b4226),
    eye: flat(0x1d1d24),
  };
  let hlColor = new THREE.Color(0x34d6a4);
  const twins = createTwins((base) => {
    const m = flat(base.color.clone().lerp(hlColor, 0.25));
    m.emissive.copy(hlColor).multiplyScalar(0.3);
    m.userData.from = base;
    return m;
  });
  const hl = createHighlighter((mesh, on) => twins.swap(mesh, on));

  const geo = { sphere: new THREE.IcosahedronGeometry(1, 1), seg: (rt, rb) => new THREE.CylinderGeometry(rt, rb, 1, 6, 1) };
  buildBody(rig, { geo, mat: (role) => mats[role], head: 1.1, girth: 1.1, sleeve: 0.5, shorts: 0.55, part: (m, region) => hl.tag(m, region) });

  const H = rig.anchors.head;
  const hair = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mats.hair);
  hair.scale.set(0.112, 0.075, 0.122);
  hair.position.set(0, 0.07, -0.016);
  hair.castShadow = true;
  H.add(hair);
  const fringe = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mats.hair);
  fringe.scale.set(0.09, 0.03, 0.05);
  fringe.position.set(0.02, 0.085, 0.07);
  fringe.rotation.z = -0.3;
  H.add(fringe);
  const eyeGeo = new THREE.BoxGeometry(0.014, 0.022, 0.01);
  for (const [, s] of SIDES) {
    const e = new THREE.Mesh(eyeGeo, mats.eye);
    e.position.set(0.036 * s, 0.012, 0.104);
    e.rotation.y = 0.35 * s;
    H.add(e);
  }

  return {
    group: rig.group,
    look: (dark) => ({ hemi: [0xffffff, dark ? 0x3d4a5c : 0x9aa8b8, 1.25], key: [0xfff6ea, 2.4], rim: [0xbfd8ff, 0.5] }),
    update: (J) => rig.update(J),
    setHighlight: (groups) => hl.set(groups),
    setPulse(v) {
      for (const m of twins.all()) m.emissiveIntensity = 0.5 + 0.8 * v;
    },
    setTheme(dark, colors = {}) {
      hlColor = new THREE.Color(colors.hl || 0x34d6a4);
      for (const m of twins.all()) {
        m.color.copy(m.userData.from.color).lerp(hlColor, 0.25);
        m.emissive.copy(hlColor).multiplyScalar(0.3);
      }
    },
    dressProp: propDresser((src) => flat(src.color)),
    dispose: () => disposeTree(rig.group, [...Object.values(mats), ...twins.all()]),
  };
}
