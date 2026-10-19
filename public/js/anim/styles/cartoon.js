// Cartoon: classic cel shading, built from three.js's toon material and a gradient
// map with two hard bands, plus thick black ink outlines on the figure and the props.
// Bold primary colours, a black quiff and a big grin. The worked muscles get a coloured
// outline instead of a black one, so the clothes keep their colours.

import * as THREE from "three";
import { SIDES, buildBody, createHighlighter, createRig, disposeTree, outline, outlineMaterial, propDresser, toonRamp } from "./kit.js";

const hipAxis = new THREE.Vector3();

function clearHipPalms(rig, J) {
  if (!J.palmL || !J.palmR || J.palmL.x > -0.9 || J.palmR.x < 0.9) return;
  if (Math.abs(J.handL.x - J.pelvis.x) > 0.24 || Math.abs(J.handR.x - J.pelvis.x) > 0.24
    || Math.abs(J.handL.y - J.pelvis.y) > 0.14 || Math.abs(J.handR.y - J.pelvis.y) > 0.14) return;
  hipAxis.setFromMatrixColumn(J.Rp, 0);
  rig.anchors.handL.position.addScaledVector(hipAxis, 0.011);
  rig.anchors.handR.position.addScaledVector(hipAxis, -0.011);
}

export function createFigure() {
  const rig = createRig();
  const ramp = toonRamp([0.45, 1]);
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: ramp });
  const mats = {
    skin: toon(0xffc58f),
    top: toon(0xe63946),
    bottom: toon(0x1f4fd6),
    shoe: toon(0xffffff),
    sole: toon(0x222222),
    sock: toon(0xffffff),
    hair: toon(0x1b1b1f),
    white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    black: new THREE.MeshBasicMaterial({ color: 0x111111 }),
  };
  const ink = outlineMaterial(0x111111, 0.012);
  const inkHl = outlineMaterial(0xffd23f, 0.018);
  const hl = createHighlighter((mesh, on) => (mesh.userData.ink.material = on ? inkHl : ink));

  const geo = { sphere: new THREE.SphereGeometry(1, 32, 22), seg: (rt, rb) => new THREE.CylinderGeometry(rt, rb, 1, 24, 1) };
  const parts = buildBody(rig, {
    geo,
    mat: (role) => mats[role],
    torso: "smooth",
    head: 1.15,
    girth: 1.1,
    sleeve: 0.45,
    shorts: 0.5,
    part(m, region) {
      m.userData.ink = outline(m, ink);
      hl.tag(m, region);
    },
  });
  for (const s of ["L", "R"]) parts["hand" + s].scale.y = 0.055;

  // Face and hair, on the head.
  const H = rig.anchors.head;
  H.scale.setScalar(0.8);
  const S = new THREE.SphereGeometry(1, 24, 16);
  const add = (geom, mat, scale, pos, rot = [0, 0, 0], inked = true) => {
    const m = new THREE.Mesh(geom, mat);
    m.scale.set(...scale);
    m.position.set(...pos);
    m.rotation.set(...rot);
    H.add(m);
    if (inked) outline(m, ink);
    return m;
  };
  add(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.44), mats.hair, [0.112, 0.134, 0.124], [0, 0, 0]);
  add(S, mats.hair, [0.05, 0.025, 0.055], [0.02, 0.09, 0.04], [0.5, 0, -0.3]); // quiff
  for (const [, s] of SIDES) {
    add(S, mats.white, [0.022, 0.034, 0.012], [0.03 * s, 0.022, 0.104], [0, 0.3 * s, 0]);
    add(S, mats.black, [0.011, 0.02, 0.008], [0.028 * s, 0.018, 0.114], [0, 0.3 * s, 0], false);
    add(new THREE.BoxGeometry(1, 1, 1), mats.black, [0.032, 0.007, 0.008], [0.032 * s, 0.065, 0.1], [0, 0.3 * s, -0.15 * s], false);
  }
  add(S, mats.skin, [0.018, 0.016, 0.02], [0, -0.012, 0.118]); // nose
  add(new THREE.TorusGeometry(0.032, 0.0045, 6, 18, Math.PI), mats.black, [1, 1, 1], [0, -0.035, 0.11], [0.35, 0, Math.PI], false); // grin

  return {
    group: rig.group,
    look: (dark) => ({ tone: "none", hemi: [0xffffff, dark ? 0x4a5468 : 0xb3b9c6, 0.6], key: [0xffffff, 2.9], rim: [0xffffff, 0] }),
    update(J) { rig.update(J); clearHipPalms(rig, J); rig.keepFeetAboveFloor(); },
    setHighlight: (groups) => hl.set(groups),
    setPulse: (v) => (inkHl.uniforms.thickness.value = 0.013 + 0.01 * v),
    setTheme(dark, colors = {}) {
      inkHl.uniforms.color.value.set(colors.hl || 0xffd23f);
    },
    dressProp: propDresser((src) => toon(src.color), ink),
    dispose: () => disposeTree(rig.group, [...Object.values(mats), ink, inkHl]),
  };
}
