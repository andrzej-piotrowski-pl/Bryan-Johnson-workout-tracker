// Athlete: a semi-realistic person (after Mixamo-style characters). Skin with a soft
// sheen, muscle-shaped limbs, a T-shirt, shorts and trainers, hair and a face, under
// warm studio light. The worked muscles glow through the skin.

import * as THREE from "three";
import { SIDES, buildBody, createHighlighter, createRig, disposeTree, glowMaterial } from "./kit.js";
import { createHand, createTorso } from "./human.js";
import { GROUPS } from "../mannequin.js";

// Limb outlines along their length: [share of the length from the bottom, extra radius].
const MUSCLE = {
  upperArm: [0.55, 0.007],
  forearm: [0.78, 0.006],
  thigh: [0.62, 0.013],
  shin: [0.72, 0.012],
};

// A round limb, unit height, bulging where its muscle sits.
function limbGeo(rTop, rBottom, name) {
  const [at, bulge] = MUSCLE[name] || [0.5, 0];
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const r = rBottom + (rTop - rBottom) * u + bulge * Math.exp(-(((u - at) / 0.26) ** 2));
    pts.push(new THREE.Vector2(r, u - 0.5));
  }
  return new THREE.LatheGeometry(pts, 28);
}

export function createFigure() {
  const rig = createRig();
  const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...o });
  const mats = {
    skin: phys(0xc68d6a, { roughness: 0.5, sheen: 0.5, sheenColor: 0xff9f80, sheenRoughness: 0.55 }),
    top: phys(0x2e6a86, { roughness: 0.85, sheen: 1, sheenColor: 0x9fd2ea, sheenRoughness: 0.75, side: THREE.DoubleSide }),
    bottom: phys(0x262a33, { roughness: 0.8, sheen: 0.8, sheenColor: 0x707a8c, sheenRoughness: 0.7, side: THREE.DoubleSide }),
    shoe: phys(0xf3f3f1, { roughness: 0.45 }),
    sole: phys(0xff6d3a, { roughness: 0.55 }),
    sock: phys(0xf6f6f6, { roughness: 0.9 }),
    hair: phys(0x2a1c14, { roughness: 0.55, sheen: 0.6, sheenColor: 0x6b4a33 }),
    dark: phys(0x1d1512, { roughness: 0.4 }),
    eye: phys(0xd9d2c5, { roughness: 0.4 }),
    lip: phys(0x925c4e, { roughness: 0.75 }),
  };

  // The worked muscles: a glow just outside the skin, breathing with the movement.
  const glow = glowMaterial({ color: 0x34d6a4, power: 2.6, strength: 0.5, base: 0, inflate: 0.003 });
  const hl = createHighlighter((mesh, on) => {
    let g = mesh.userData.glow;
    if (!g && on) {
      g = mesh.userData.glow = new THREE.Mesh(mesh.geometry, glow);
      g.renderOrder = 2;
      mesh.add(g);
    }
    if (g) g.visible = on;
  });

  const geo = { sphere: new THREE.SphereGeometry(1, 32, 22), seg: limbGeo };
  const parts = buildBody(rig, { geo, mat: (role) => mats[role], torso: "smooth", girth: 1.08, sleeve: 0.45, shorts: 0.52, part: (m, region) => hl.tag(m, region) });
  for (const name of ["pelvis", "abdomen", "chest", "handL", "handR"]) parts[name].removeFromParent();
  const torsoMats = [mats.bottom.clone(), mats.top.clone(), mats.top.clone()];
  const torso = createTorso(torsoMats);
  rig.group.add(torso.mesh);
  const hands = {};
  for (const [side] of SIDES) {
    hands[side] = createHand(mats.skin, side);
    rig.anchors["hand" + side].add(hands[side].group);
  }
  const headGeo = geo.sphere.clone(), vertices = headGeo.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getY(i);
    vertices.setX(i, vertices.getX(i) * (y < 0 ? 0.93 + 0.2 * y : 1));
    if (vertices.getZ(i) > 0) vertices.setZ(i, vertices.getZ(i) * (y < -0.2 ? 0.88 : 0.96));
  }
  headGeo.computeVertexNormals();
  parts.head.geometry = headGeo;

  // Face and hair on top of the standard shapes.
  const add = (anchor, geom, mat, scale, pos, rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geom, mat);
    m.scale.set(...scale);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true;
    rig.anchors[anchor].add(m);
    return m;
  };
  const S = geo.sphere;
  add("head", new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), mats.hair, [0.1, 0.105, 0.112], [0, 0.022, -0.006], [-0.38, 0, 0]);
  add("head", S, mats.skin, [0.009, 0.022, 0.012], [0, 0, 0.096], [0.2, 0, 0]);
  add("head", S, mats.skin, [0.013, 0.01, 0.016], [0, -0.014, 0.105]);
  add("head", S, mats.lip, [0.021, 0.0025, 0.004], [0, -0.042, 0.087]);
  const eyes = [];
  for (const [side, x] of SIDES) {
    add("head", S, mats.skin, [0.012, 0.025, 0.017], [0.092 * x, -0.002, -0.004]); // ears
    const eye = new THREE.Group();
    eye.name = "human-eye" + side;
    eye.position.set(0.033 * x, 0.014, 0.091);
    rig.anchors.head.add(eye);
    const white = new THREE.Mesh(S, mats.eye); white.scale.set(0.012, 0.0055, 0.003); eye.add(white);
    const iris = new THREE.Mesh(S, mats.dark); iris.scale.set(0.004, 0.0045, 0.002); iris.position.z = 0.003; eye.add(iris);
    eyes.push(eye);
    add("head", S, mats.hair, [0.018, 0.0035, 0.006], [0.034 * x, 0.03, 0.093], [0, 0, -0.12 * x]); // brows
  }

  const localAxis = new THREE.Vector3(), inverseHand = new THREE.Matrix4();

  return {
    group: rig.group,
    look: (dark) => ({
      hemi: [0xffffff, dark ? 0x3a4352 : 0x9a8f86, 0.95],
      key: [0xfff0e0, 2.6],
      rim: [0xbcd6ff, 1.1],
      exposure: 1.0,
    }),
    update(J, { t = 0, grip = {}, gripAxis = {}, breath = 0 } = {}) {
      rig.update(J);
      torso.update(J, breath);
      const blink = Math.exp(-(((t % 4.7 - 3.1) / 0.075) ** 2));
      for (const eye of eyes) eye.scale.y = 1 - 0.95 * blink;
      for (const [side] of SIDES) {
        const axis = gripAxis[side] ? localAxis.copy(gripAxis[side]).transformDirection(inverseHand.copy(J["handFrame" + side]).invert()) : null;
        hands[side].update(grip[side], !!J["palm" + side] && J["wrist" + side].y < 0.15, axis);
      }
    },
    setHighlight(groups) {
      hl.set(groups);
      const lit = new Set(groups.flatMap((g) => GROUPS[g] || []));
      for (const [i, name] of ["pelvis", "abdomen", "chest"].entries()) {
        torsoMats[i].userData.lit = i === 0 ? lit.has(name) : lit.has("abdomen") || lit.has("chest");
        torsoMats[i].emissiveIntensity = torsoMats[i].userData.lit ? 0.025 : 0;
      }
    },
    setPulse(v) {
      glow.uniforms.strength.value = 0.08 + 0.2 * v;
      for (const mat of torsoMats) mat.emissiveIntensity = mat.userData.lit ? 0.02 + 0.025 * v : 0;
    },
    setTheme(dark, colors = {}) {
      glow.uniforms.color.value.set(colors.hl || 0x34d6a4);
      for (const mat of torsoMats) mat.emissive.set(colors.hl || 0x34d6a4);
    },
    dispose() {
      torso.mesh.skeleton.dispose();
      for (const name of ["pelvis", "abdomen", "chest"]) parts[name].geometry.dispose();
      disposeTree(rig.group, [glow, ...Object.values(mats), ...torsoMats]);
    },
  };
}
