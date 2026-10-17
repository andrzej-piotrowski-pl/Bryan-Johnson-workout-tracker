// Athlete's flexible torso and articulated hands; the exercise skeleton stays shared.
import * as THREE from "three";
import { DIM } from "../rig.js";

export function createTorso(materials) {
  const profile = [
    [-0.12, 0.07, 0.065], [-0.09, 0.132, 0.095], [-0.03, 0.157, 0.112],
    [0.04, 0.15, 0.104], [0.1, 0.137, 0.095], [0.18, 0.134, 0.092],
    [0.26, 0.146, 0.101], [0.34, 0.16, 0.112], [0.42, 0.17, 0.114],
    [0.47, 0.174, 0.105], [0.5, 0.15, 0.087], [0.535, 0.08, 0.061], [0.55, 0.047, 0.046],
  ];
  const radial = 32, positions = [], indices = [], skinIndices = [], weights = [];
  for (const [y, width, depth] of profile) {
    const upper = y >= 0.22;
    const blend = THREE.MathUtils.smoothstep(y, upper ? 0.22 : 0.04, upper ? 0.42 : 0.22);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2;
      positions.push(width * Math.cos(a), y, depth * Math.sin(a));
      skinIndices.push(upper ? 1 : 0, upper ? 2 : 1, 0, 0);
      weights.push(1 - blend, blend, 0, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (let i = 0; i < profile.length - 1; i++) {
    const start = indices.length;
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    geometry.addGroup(start, indices.length - start, profile[i][0] < 0.04 ? 0 : profile[i][0] < 0.26 ? 1 : 2);
  }
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  for (let i = 0; i < profile.length; i++) {
    const a = i * (radial + 1), b = a + radial;
    const n = new THREE.Vector3().fromBufferAttribute(normals, a).add(new THREE.Vector3().fromBufferAttribute(normals, b)).normalize();
    normals.setXYZ(a, n.x, n.y, n.z); normals.setXYZ(b, n.x, n.y, n.z);
  }
  const mesh = new THREE.SkinnedMesh(geometry, materials);
  mesh.name = "human-torso";
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
  bones[0].add(bones[1]); bones[1].add(bones[2]);
  bones[1].position.y = DIM.lumbar;
  bones[2].position.y = DIM.thoracic;
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  const lower = new THREE.Quaternion(), chest = new THREE.Quaternion();
  return {
    mesh,
    update(J, breath = 0) {
      bones[0].position.copy(J.pelvis);
      bones[0].quaternion.setFromRotationMatrix(J.Rp);
      lower.setFromRotationMatrix(J.R1);
      chest.setFromRotationMatrix(J.Rc);
      bones[1].quaternion.copy(bones[0].quaternion).invert().multiply(lower);
      bones[2].quaternion.copy(lower).invert().multiply(chest);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = positions[i * 3 + 1];
        const rib = Math.exp(-(((y - 0.4) / 0.12) ** 2)) * breath;
        p.setXYZ(i, positions[i * 3] * (1 + 0.012 * rib), y, positions[i * 3 + 2] * (1 + 0.028 * rib));
      }
      p.needsUpdate = true;
    },
  };
}

export function createHand(material, side) {
  const group = new THREE.Group();
  group.name = "human-hand" + side;
  const s = side === "L" ? 1 : -1;
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const palm = new THREE.Mesh(sphere, material);
  palm.scale.set(0.029, 0.033, 0.012);
  palm.position.y = -0.006;
  group.add(palm);
  const fingers = [];
  for (const [i, length] of [0.047, 0.054, 0.05, 0.039].entries()) {
    const joints = [];
    let parent = group;
    for (const [j, share] of [0.45, 0.32, 0.23].entries()) {
      const joint = new THREE.Group();
      joint.position.set(j === 0 ? (1.5 - i) * 0.014 * s : 0, j === 0 ? 0.02 : length * [0.45, 0.32][j - 1], 0);
      parent.add(joint);
      const segment = new THREE.Mesh(new THREE.CapsuleGeometry(0.006 - j * 0.0007, length * share - 0.008, 3, 6), material);
      segment.position.y = length * share / 2;
      joint.add(segment);
      joints.push(joint); parent = joint;
    }
    fingers.push(joints);
  }
  const thumb = new THREE.Group();
  thumb.position.set(0.027 * s, -0.013, 0);
  thumb.rotation.z = -0.75 * s;
  group.add(thumb);
  const thumbTip = new THREE.Group();
  thumbTip.position.y = 0.025;
  thumb.add(thumbTip);
  for (const [parent, length] of [[thumb, 0.025], [thumbTip, 0.022]]) {
    const segment = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, length - 0.012, 3, 6), material);
    segment.position.y = length / 2;
    parent.add(segment);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return {
    group,
    update(grip = false, flat = false, axis = null) {
      group.rotation.y = axis && Math.hypot(axis.x, axis.z) > 1e-4 ? Math.atan2(-axis.z, axis.x) : 0;
      if (group.rotation.y > Math.PI / 2) group.rotation.y -= Math.PI;
      if (group.rotation.y < -Math.PI / 2) group.rotation.y += Math.PI;
      for (const [i, joints] of fingers.entries()) for (const [j, joint] of joints.entries()) {
        const angle = grip ? [1.1, 1.35, 0.75][j] : flat ? 0.035 : [0.15, 0.25, 0.18][j] + i * 0.025;
        joint.rotation.x = -angle;
        if (j === 0) joint.rotation.z = flat ? (i - 1.5) * 0.05 * s : 0;
      }
      thumb.rotation.x = grip ? -0.75 : flat ? -0.03 : -0.25;
      thumb.rotation.z = (grip ? -0.45 : -0.85) * s;
      thumbTip.rotation.x = grip ? -1.1 : -0.15;
    },
  };
}
