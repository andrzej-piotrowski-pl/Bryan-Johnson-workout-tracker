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
  const parts = buildBody(rig, { geo, mat: (role) => mats[role], head: 1.1, girth: 1.1, sleeve: 0.5, shorts: 0.55, part: (m, region) => hl.tag(m, region) });
  // A 48 mm palm replaces the default 75 mm depth while keeping the wrist axis intact.
  for (const [s] of SIDES) {
    parts[`hand${s}`].scale.z = 0.024;
    parts[`sole${s}`].position.y -= 0.0045; // Align outsole and shoe-shell bottoms.
  }
  const worldUp = new THREE.Vector3(0, 1, 0), localUp = new THREE.Vector3(), inverseFoot = new THREE.Quaternion();
  const floorPoints = Object.fromEntries(SIDES.map(([s]) => {
    const points = [];
    for (const mesh of [parts[`foot${s}`], parts[`sole${s}`]]) {
      mesh.updateMatrix();
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrix));
    }
    return [s, points];
  }));

  const H = rig.anchors.head;
  // Keep the shared body sphere intact; taper this head's upper side corners for prone turns.
  const headGeometry = parts.head.geometry.clone();
  const headPositions = headGeometry.attributes.position;
  for (let i = 0; i < headPositions.count; i++) {
    if (headPositions.getY(i) > 0.8 && Math.abs(headPositions.getZ(i)) < 1e-6) headPositions.setX(i, headPositions.getX(i) * 0.9);
  }
  headGeometry.computeVertexNormals();
  headGeometry.computeBoundingSphere();
  parts.head.geometry = headGeometry;

  // Center the cap on the skull and taper its upper side corners for prone head turns.
  const hairGeometry = new THREE.IcosahedronGeometry(1, 0);
  const hairPositions = hairGeometry.attributes.position;
  for (let i = 0; i < hairPositions.count; i++) {
    if (hairPositions.getY(i) > 0.8 && Math.abs(hairPositions.getZ(i)) < 1e-6) hairPositions.setX(i, hairPositions.getX(i) * 0.4);
  }
  hairGeometry.computeVertexNormals();
  hairGeometry.computeBoundingSphere();
  const hair = new THREE.Mesh(hairGeometry, mats.hair);
  hair.scale.set(0.1, 0.075, 0.122);
  hair.position.set(0, 0.066, 0);
  hair.castShadow = true;
  H.add(hair);
  const fringe = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mats.hair);
  fringe.scale.set(0.09, 0.03, 0.05);
  fringe.position.set(0.02, 0.075, 0.07);
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
    update: (J, { grip = {} } = {}) => {
      rig.update(J);
      for (const [s] of SIDES) {
        const palm = J[`palm${s}`];
        const barGrip = grip[s] && Math.abs(palm?.z ?? 0) > 0.9;
        // Keep the fingerless palm below the bar while the wrist stays inside the hand shape.
        parts[`hand${s}`].position.set(0, barGrip ? -0.028 : -0.01, barGrip ? 0.018 : palm ? 0.007 : 0);
      }
      for (const [s] of SIDES) {
        const anchor = rig.anchors[`foot${s}`];
        localUp.copy(worldUp).applyQuaternion(inverseFoot.copy(anchor.quaternion).invert());
        let minY = anchor.position.y;
        for (const point of floorPoints[s]) minY = Math.min(minY, anchor.position.y + point.dot(localUp));
        // Keep the rendered shoe above the shared stage floor without changing its joint target.
        if (minY < 0) anchor.position.y -= minY;
      }
    },
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
