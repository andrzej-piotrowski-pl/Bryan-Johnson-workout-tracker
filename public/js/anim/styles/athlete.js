// Athlete: connected anatomy, fitted training clothes and soft studio light.
import * as THREE from "three";
import { SIDES, createRig, disposeTree } from "./kit.js";
import { createHand, createHead, createLimb, createNeck, createShoe, createTorso } from "./human.js";
import { GROUPS } from "../mannequin.js";

function fabric() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = 128 + ((x + y) % 2 ? 20 : -20) + Math.round(9 * Math.sin(x * 2.7 + y * 1.9));
    data.set([v, v, v, 255], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 12); texture.needsUpdate = true;
  return texture;
}

export function createFigure() {
  const rig = createRig(), weave = fabric(), regions = [];
  const physical = (color, options = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.75, ...options });
  const mats = {
    skin: physical(0xc89173, { sheen: 0.12, sheenColor: 0xf1b597, sheenRoughness: 0.9 }),
    top: physical(0x235a73, { roughness: 0.95, sheen: 0.25, bumpMap: weave, bumpScale: 0.00035, side: THREE.DoubleSide }),
    bottom: physical(0x252e3b, { roughness: 0.98, bumpMap: weave, bumpScale: 0.0004, side: THREE.DoubleSide }),
    collar: physical(0x19445a, { roughness: 0.95 }),
    shoe: physical(0xe2e8e8, { roughness: 0.85 }),
    midsole: physical(0xf3f4ef, { roughness: 0.9 }),
    sole: physical(0x384b56, { roughness: 0.95 }),
    sock: physical(0xd5dce2, { roughness: 1, bumpMap: weave, bumpScale: 0.00025 }),
    hair: physical(0x332720, { roughness: 0.94, vertexColors: true }),
    dark: physical(0x201a18, { roughness: 0.65 }),
    eye: physical(0xc6c5ba, { roughness: 0.35 }),
    iris: physical(0x514a32, { roughness: 0.4 }),
    lip: physical(0xa47160, { roughness: 0.9 }),
  };
  const region = (base, names) => {
    const material = base.clone(); regions.push({ material, names, lit: false }); return material;
  };
  const shirtRegions = ["abdomen", "chest"];
  const torso = createTorso([
    region(mats.bottom, ["pelvis"]), region(mats.top, shirtRegions),
    region(mats.top, shirtRegions), mats.collar,
  ]);
  const neck = createNeck(region(mats.skin, ["neck"])), head = createHead(mats);
  rig.group.add(torso.mesh, neck.mesh); rig.anchors.head.add(head.group);
  const limbs = [], hands = {};
  for (const [side] of SIDES) {
    const arm = createLimb([
      region(mats.top, ["shoulder" + side, "upperArm" + side]),
      region(mats.skin, ["upperArm" + side]), region(mats.skin, ["forearm" + side]),
    ], "arm", side);
    const leg = createLimb([
      region(mats.bottom, ["pelvis", "thigh" + side]), region(mats.skin, ["thigh" + side]),
      region(mats.skin, ["shin" + side]), mats.sock,
    ], "leg", side);
    limbs.push(arm, leg); rig.group.add(arm.mesh, leg.mesh);
    hands[side] = createHand(region(mats.skin, ["hand" + side]), side);
    rig.anchors["hand" + side].add(hands[side].group);
    const shoe = createShoe([mats.sole, mats.midsole, region(mats.shoe, ["foot" + side])]);
    rig.anchors["foot" + side].add(shoe);
  }
  const localAxis = new THREE.Vector3(), inverseHand = new THREE.Matrix4(), neckOffset = new THREE.Vector3();
  return {
    group: rig.group,
    look: (dark) => ({
      hemi: [0xf5f5f2, dark ? 0x3d4654 : 0x979da3, 1.25],
      key: [0xfff2e5, 2.3], rim: [0xc8ddf4, 1.15], exposure: 1.05,
    }),
    update(J, { t = 0, grip = {}, gripAxis = {}, breath = 0 } = {}) {
      rig.update(J);
      neckOffset.subVectors(J.headJoint, J.neckBase).multiplyScalar(-0.28);
      rig.anchors.head.position.add(neckOffset);
      torso.update(J, breath); neck.update(J); head.update(t);
      for (const limb of limbs) limb.update(J);
      for (const [side] of SIDES) {
        const axis = gripAxis[side] ? localAxis.copy(gripAxis[side]).transformDirection(inverseHand.copy(J["handFrame" + side]).invert()) : null;
        const flat = J["palm" + side] ? THREE.MathUtils.smoothstep(J["palm" + side].y, 0.3, 0.85) : 0;
        hands[side].update(grip[side], flat, axis);
      }
    },
    setHighlight(groups) {
      const lit = new Set(groups.flatMap((g) => GROUPS[g] || []));
      for (const entry of regions) {
        entry.lit = entry.names.some((name) => lit.has(name));
        entry.material.emissiveIntensity = entry.lit ? 0.08 : 0;
      }
    },
    setPulse(v) {
      for (const entry of regions) entry.material.emissiveIntensity = entry.lit ? 0.055 + 0.045 * v : 0;
    },
    setTheme(dark, colors = {}) {
      for (const entry of regions) entry.material.emissive.set(colors.hl || 0x34d6a4);
    },
    dispose() {
      rig.group.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
      disposeTree(rig.group, Object.values(mats));
    },
  };
}
