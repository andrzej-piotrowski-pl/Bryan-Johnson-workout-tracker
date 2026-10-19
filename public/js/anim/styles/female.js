// A cartoon athlete on the same skinned joints and contact surfaces as Athlete.
import * as THREE from "three";
import { SIDES, createRig, disposeTree, outline, outlineMaterial, propDresser, toonRamp } from "./kit.js";
import { createHand, createLimb, createNeck, createShoe, createTorso } from "./human.js";
import { GROUPS } from "../mannequin.js";

function createHead(mats, ink) {
  const group = new THREE.Group(); group.name = "female-head";
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const add = (geometry, material, scale, position, parent = group, edged = false) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(...scale); mesh.position.set(...position); parent.add(mesh);
    if (edged) outline(mesh, ink);
    mesh.castShadow = true; return mesh;
  };
  const taper = (y) => 1 - 0.27 * THREE.MathUtils.smoothstep(-y / 0.114, 0, 0.95);
  const depth = (x, y) => 0.095 * Math.sqrt(Math.max(0, 1 - (x / (0.088 * taper(y))) ** 2 - (y / 0.114) ** 2));
  const faceGeo = sphere.clone(), p = faceGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) * 0.114;
    p.setXYZ(i, p.getX(i) * 0.088 * taper(y), y, p.getZ(i) * 0.095);
  }
  faceGeo.computeVertexNormals();
  add(faceGeo, mats.skin, [1, 1, 1], [0, 0, 0], group, true).name = "female-face";
  const line = (parent, points, material, radius) => {
    const path = new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(...v)));
    return add(new THREE.TubeGeometry(path, 24, radius, 6, false), material, [1, 1, 1], [0, 0, 0], parent);
  };
  const eyes = [];
  for (const [, s] of SIDES) {
    add(sphere, mats.skin, [0.01, 0.021, 0.012], [0.083 * s, -0.006, 0]);
    const eye = new THREE.Group(); eye.name = "female-eye" + (s === 1 ? "L" : "R");
    const cx = 0.031 * s, cy = 0.016;
    eye.position.set(cx, cy, 0); group.add(eye); eyes.push(eye);
    const positions = [], indices = [];
    for (let ring = 0; ring <= 4; ring++) for (let j = 0; j <= 32; j++) {
      const u = ring / 4, a = j / 32 * Math.PI * 2;
      const x = 0.016 * Math.cos(a) * u, y = 0.008 * Math.sin(a) * u;
      positions.push(x, y, depth(cx + x, cy + y) + 0.001 + 0.0015 * (1 - u * u));
      if (ring && j < 32) { const a = ring * 33 + j, b = a - 33; indices.push(b, a, b + 1, a, a + 1, b + 1); }
    }
    const white = new THREE.BufferGeometry(); white.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    white.setIndex(indices); white.computeVertexNormals();
    add(white, mats.white, [1, 1, 1], [0, 0, 0], eye);
    const z = depth(cx, cy) + 0.003;
    add(sphere, mats.iris, [0.006, 0.007, 0.0012], [0, 0, z], eye);
    add(sphere, mats.ink, [0.0028, 0.0045, 0.001], [0, 0, z + 0.001], eye);
    add(sphere, mats.white, [0.0018, 0.002, 0.0007], [-0.0017, 0.0025, z + 0.002], eye);
    line(eye, Array.from({ length: 9 }, (_, i) => {
      const a = i / 8 * Math.PI, x = 0.016 * Math.cos(a), y = 0.008 * Math.sin(a);
      return [x, y, depth(cx + x, cy + y) + 0.0012];
    }), mats.ink, 0.0011);
    line(group, [[0.015, 0.035], [0.03, 0.038], [0.048, 0.032]]
      .map(([x, y]) => [x * s, y, depth(x * s, y) + 0.001]), mats.hair, 0.0017);
  }
  add(sphere, mats.skin, [0.01, 0.012, 0.012], [0, -0.015, depth(0, -0.015) - 0.003]);
  line(group, [-1, -0.5, 0, 0.5, 1].map((u) => {
    const x = u * 0.019, y = -0.046 + 0.004 * u * u;
    return [x, y, depth(x, y) + 0.001];
  }), mats.lip, 0.0014);

  const cap = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), hp = cap.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const a = Math.atan2(hp.getZ(i), hp.getX(i)), u = Math.acos(THREE.MathUtils.clamp(hp.getY(i), -1, 1)) / (Math.PI / 2);
    const front = Math.max(0, Math.sin(a)), back = Math.max(0, -Math.sin(a));
    const hairline = 0.005 + 0.048 * Math.sqrt(front) - 0.066 * back;
    const theta = u * Math.acos(hairline / 0.123), wave = Math.sin(Math.PI * u) * 0.002 * Math.sin(a * 5 + u * 7);
    hp.setXYZ(i, 0.095 * Math.sin(theta) * Math.cos(a), 0.123 * Math.cos(theta) + 0.005 + wave, 0.105 * Math.sin(theta) * Math.sin(a) - 0.006);
  }
  cap.computeVertexNormals(); add(cap, mats.hair, [1, 1, 1], [0, 0, 0], group, true);
  const bun = add(sphere, mats.hair, [0.034, 0.033, 0.032], [0, 0.083, -0.070], group, true);
  bun.name = "female-bun";
  add(new THREE.TorusGeometry(0.021, 0.004, 8, 24), mats.accent, [1, 1, 1], [0, 0.085, -0.077]);
  return {
    group,
    update(t) {
      const blink = Math.exp(-(((t % 4.7 - 3.1) / 0.075) ** 2));
      for (const eye of eyes) eye.scale.y = 1 - 0.95 * blink;
    },
  };
}

export function createFigure() {
  const rig = createRig(), ramp = toonRamp([0.55, 0.78, 1]), regions = [];
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: ramp });
  const mats = {
    skin: toon(0xf2bf9d), top: toon(0x20bdae), bottom: toon(0x7654c8),
    band: toon(0x50388c), shoe: toon(0xfbfaff), sole: toon(0xd4cfeb), sock: toon(0xffffff),
    hair: toon(0x422b38), accent: toon(0xff876f), iris: toon(0x528d88),
    ink: new THREE.MeshBasicMaterial({ color: 0x30243c }),
    white: new THREE.MeshBasicMaterial({ color: 0xfffdf8 }),
    lip: new THREE.MeshBasicMaterial({ color: 0x9c4f54 }),
  };
  const ink = outlineMaterial(0x30243c, 0.0015);
  const region = (base, names) => {
    const material = base.clone(); regions.push({ material, names, lit: false }); return material;
  };
  const torso = createTorso([
    region(mats.bottom, ["pelvis"]), region(mats.top, ["abdomen"]),
    region(mats.top, ["chest"]), mats.top, mats.band,
  ], [
    [-0.12, 0.065, 0.06], [-0.1, 0.12, 0.086], [-0.07, 0.155, 0.109],
    [-0.03, 0.169, 0.116], [0.02, 0.17, 0.115], [0.045, 0.166, 0.112], [0.065, 0.158, 0.106],
    [0.11, 0.14, 0.094], [0.16, 0.126, 0.086], [0.21, 0.126, 0.088],
    [0.26, 0.14, 0.098], [0.31, 0.153, 0.108], [0.36, 0.163, 0.114],
    [0.41, 0.168, 0.117], [0.455, 0.17, 0.113], [0.49, 0.163, 0.103],
    [0.515, 0.15, 0.089], [0.535, 0.126, 0.077], [0.55, 0.096, 0.063],
    [0.56, 0.063, 0.049], [0.565, 0.052, 0.047], [0.57, 0.052, 0.047],
  ]);
  const neck = createNeck(region(mats.skin, ["neck"])), head = createHead(mats, ink);
  rig.group.add(torso.mesh, neck.mesh); rig.anchors.head.add(head.group);
  const limbs = [], hands = {};
  for (const [side] of SIDES) {
    const arm = createLimb([
      region(mats.skin, ["shoulder" + side, "upperArm" + side]), region(mats.skin, ["upperArm" + side]),
      region(mats.skin, ["forearm" + side]), mats.skin,
    ], "arm", side);
    const leg = createLimb([
      region(mats.bottom, ["pelvis", "thigh" + side]), region(mats.bottom, ["thigh" + side]),
      region(mats.bottom, ["shin" + side]), mats.sock, mats.bottom,
    ], "leg", side);
    for (const limb of [arm, leg]) {
      const p = limb.mesh.geometry.attributes.position;
      const girth = limb === arm ? 0.86 : 0.97;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * girth, p.getY(i), p.getZ(i) * girth);
      limb.mesh.geometry.computeVertexNormals();
      limbs.push(limb); rig.group.add(limb.mesh);
    }
    hands[side] = createHand(region(mats.skin, ["hand" + side]), side);
    hands[side].group.scale.x = 0.92;
    rig.anchors["hand" + side].add(hands[side].group);
    rig.anchors["foot" + side].add(createShoe([mats.sole, mats.shoe, region(mats.shoe, ["foot" + side]), mats.accent]));
  }
  const localAxis = new THREE.Vector3(), inverseHand = new THREE.Matrix4(), neckOffset = new THREE.Vector3();
  return {
    group: rig.group,
    look: (dark) => ({ tone: "none", hemi: [0xffffff, dark ? 0x554668 : 0xbeb5d4, 0.7], key: [0xffffff, 2.5], rim: [0xe0fff5, 0.55] }),
    update(J, { t = 0, grip = {}, gripAxis = {}, breath = 0 } = {}) {
      rig.update(J);
      rig.keepFeetAboveFloor();
      neckOffset.subVectors(J.headJoint, J.neckBase).multiplyScalar(-0.28); rig.anchors.head.position.add(neckOffset);
      torso.update(J, breath); neck.update(J); head.update(t);
      for (const limb of limbs) limb.update(J);
      for (const [side] of SIDES) {
        const axis = gripAxis[side] ? localAxis.copy(gripAxis[side]).transformDirection(inverseHand.copy(J["handFrame" + side]).invert()) : null;
        hands[side].update(grip[side], J["palm" + side] && !grip[side] ? 1 : 0, axis);
      }
    },
    setHighlight(groups) {
      const lit = new Set(groups.flatMap((g) => GROUPS[g] || []));
      for (const entry of regions) {
        entry.lit = entry.names.some((name) => lit.has(name));
        entry.material.emissiveIntensity = entry.lit ? 0.16 : 0;
      }
    },
    setPulse(v) {
      for (const entry of regions) entry.material.emissiveIntensity = entry.lit ? 0.1 + 0.12 * v : 0;
    },
    setTheme(dark, colors = {}) {
      for (const entry of regions) entry.material.emissive.set(colors.hl || 0xffa76c);
    },
    dressProp: propDresser((src) => toon(src.color)),
    dispose() {
      rig.group.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
      disposeTree(rig.group, [...Object.values(mats), ink]);
    },
  };
}
