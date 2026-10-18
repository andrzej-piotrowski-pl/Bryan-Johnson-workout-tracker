// Athlete's skin and clothing deform around the shared exercise skeleton.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DIM } from "../rig.js";

// Elliptical cross-sections: height, half-width, half-depth, forward and lateral offsets.
function surface(profile, skin, material = () => 0, radial = 32) {
  const positions = [], uv = [], indices = [], skinIndices = [], weights = [];
  for (const [i, [y, width, depth, z = 0, x = 0]] of profile.entries()) {
    const [a, b, blend] = skin(y);
    for (let j = 0; j <= radial; j++) {
      const angle = j / radial * Math.PI * 2;
      positions.push(x + width * Math.cos(angle), y, z + depth * Math.sin(angle));
      uv.push(j / radial, i / (profile.length - 1));
      skinIndices.push(a, b, 0, 0); weights.push(1 - blend, blend, 0, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (let i = 0; i < profile.length - 1; i++) {
    const start = indices.length;
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const mat = material(profile[i][0]), previous = geometry.groups.at(-1);
    if (previous?.materialIndex === mat) previous.count += indices.length - start;
    else geometry.addGroup(start, indices.length - start, mat);
  }
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal, n = new THREE.Vector3(), other = new THREE.Vector3();
  for (let i = 0; i < profile.length; i++) {
    const a = i * (radial + 1), b = a + radial;
    n.fromBufferAttribute(normals, a).add(other.fromBufferAttribute(normals, b)).normalize();
    normals.setXYZ(a, n.x, n.y, n.z); normals.setXYZ(b, n.x, n.y, n.z);
  }
  return geometry;
}

function skinned(geometry, materials, bones, name) {
  const mesh = new THREE.SkinnedMesh(geometry, materials);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.add(bones[0]);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  return mesh;
}

export function createTorso(materials) {
  const profile = [
    [-0.12, 0.065, 0.06], [-0.1, 0.114, 0.085], [-0.07, 0.145, 0.105],
    [-0.03, 0.163, 0.114], [0.02, 0.162, 0.112], [0.065, 0.153, 0.106],
    [0.11, 0.144, 0.1], [0.16, 0.141, 0.098], [0.21, 0.146, 0.103],
    [0.26, 0.156, 0.11], [0.31, 0.169, 0.117], [0.36, 0.181, 0.122],
    [0.41, 0.19, 0.124], [0.455, 0.196, 0.12], [0.49, 0.196, 0.108],
    [0.515, 0.183, 0.097], [0.535, 0.151, 0.084], [0.55, 0.112, 0.071],
    [0.56, 0.071, 0.055], [0.565, 0.054, 0.05], [0.57, 0.053, 0.049],
  ];
  const sections = profile.map(([y, width, depth]) => {
    const forward = 0.008 * THREE.MathUtils.smoothstep(y, 0.12, 0.3) * (1 - THREE.MathUtils.smoothstep(y, 0.48, 0.56));
    return [y, width, depth - forward, forward];
  });
  const geometry = surface(sections, (y) => {
    const upper = y >= 0.22;
    return [upper ? 1 : 0, upper ? 2 : 1, THREE.MathUtils.smoothstep(y, upper ? 0.22 : 0.04, upper ? 0.42 : 0.22)];
  }, (y) => y < 0.065 ? 0 : y < 0.26 ? 1 : y < 0.565 ? 2 : 3, 48);
  const positions = geometry.attributes.position.array.slice();
  const bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
  bones[0].add(bones[1]); bones[1].add(bones[2]);
  bones[1].position.y = DIM.lumbar; bones[2].position.y = DIM.thoracic;
  const mesh = skinned(geometry, materials, bones, "human-torso");
  const lower = new THREE.Quaternion(), chest = new THREE.Quaternion();
  return {
    mesh,
    update(J, breath = 0) {
      bones[0].position.copy(J.pelvis);
      bones[0].quaternion.setFromRotationMatrix(J.Rp);
      lower.setFromRotationMatrix(J.R1); chest.setFromRotationMatrix(J.Rc);
      bones[1].quaternion.copy(bones[0].quaternion).invert().multiply(lower);
      bones[2].quaternion.copy(lower).invert().multiply(chest);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = positions[i * 3 + 1];
        const rib = Math.exp(-(((y - 0.4) / 0.12) ** 2)) * breath;
        const z = positions[i * 3 + 2];
        p.setXYZ(i, positions[i * 3] * (1 + 0.009 * rib), y, z > 0 ? z * (1 + 0.023 * rib) : z);
      }
      p.needsUpdate = true;
    },
  };
}

export function createNeck(material) {
  const bones = [new THREE.Bone(), new THREE.Bone()];
  bones[0].add(bones[1]); bones[1].position.y = 0.065;
  const geometry = surface([
    [-0.025, 0.059, 0.053], [0, 0.052, 0.048], [0.025, 0.047, 0.045],
    [0.05, 0.044, 0.043], [0.075, 0.046, 0.046], [0.1, 0.05, 0.05],
  ], (y) => [0, 1, THREE.MathUtils.smoothstep(y, 0, 0.08)]);
  const mesh = skinned(geometry, material, bones, "human-neck");
  const chest = new THREE.Quaternion(), head = new THREE.Quaternion(), inverse = new THREE.Matrix4();
  const joint = new THREE.Vector3();
  return {
    mesh,
    update(J) {
      chest.setFromRotationMatrix(J.Rc); head.setFromRotationMatrix(J.Rh);
      bones[0].position.copy(J.neckBase); bones[0].quaternion.copy(chest);
      // Shorten only Athlete's visible neck; authored head angles and contacts stay intact.
      joint.subVectors(J.headJoint, J.neckBase).multiplyScalar(0.72);
      bones[1].position.copy(joint).applyMatrix4(inverse.copy(J.Rc).invert());
      bones[1].quaternion.copy(chest).invert().multiply(head);
    },
  };
}

// A single surface through each elbow/knee, with a bisector bone to retain joint volume.
export function createLimb(materials, kind, side) {
  const arm = kind === "arm", a = arm ? DIM.upperArm : DIM.thigh, b = arm ? DIM.forearm : DIM.shin;
  const profile = arm ? [
    [-0.025, 0.004, 0.004], [-0.017, 0.035, 0.038], [-0.008, 0.055, 0.054],
    [0, 0.062, 0.058], [0.035, 0.064, 0.059], [0.075, 0.063, 0.056],
    [0.115, 0.059, 0.052], [0.14, 0.057, 0.05], [0.145, 0.056, 0.049],
    [0.149, 0.05, 0.044], [0.18, 0.049, 0.045], [0.22, 0.042, 0.04],
    [0.26, 0.035, 0.034], [0.29, 0.033, 0.032], [0.315, 0.035, 0.034],
    [0.35, 0.04, 0.038], [0.39, 0.039, 0.035], [0.43, 0.034, 0.03],
    [0.48, 0.028, 0.024], [0.52, 0.024, 0.02], [0.55, 0.023, 0.019], [0.562, 0.022, 0.018],
  ] : [
    [-0.065, 0.015, 0.02], [-0.04, 0.064, 0.075], [0, 0.088, 0.094],
    [0.055, 0.096, 0.099], [0.11, 0.095, 0.098], [0.17, 0.091, 0.091],
    [0.215, 0.087, 0.085], [0.22, 0.086, 0.084], [0.225, 0.077, 0.075],
    [0.27, 0.073, 0.071], [0.33, 0.063, 0.063], [0.38, 0.054, 0.057],
    [0.42, 0.05, 0.053], [0.44, 0.05, 0.051], [0.47, 0.047, 0.048],
    [0.51, 0.049, 0.053], [0.56, 0.055, 0.061, -0.005], [0.61, 0.056, 0.064, -0.008],
    [0.67, 0.05, 0.057, -0.006], [0.73, 0.041, 0.045, -0.003],
    [0.79, 0.032, 0.034], [0.8, 0.033, 0.035], [0.84, 0.03, 0.031], [0.88, 0.029, 0.03],
  ];
  const sign = side === "L" ? 1 : -1;
  const geometry = surface(profile.map(([s, w, d, z]) => [-s, w, d, z, arm ? -0.05 * sign * THREE.MathUtils.smoothstep(-s, 0, 0.025) : 0]).reverse(), (y) => {
    const s = -y, r = arm ? 0.035 : 0.045;
    if (s < 0.065) return [4, 0, THREE.MathUtils.smoothstep(s, -0.005, 0.065)];
    if (s < a) return [0, 1, THREE.MathUtils.smoothstep(s, a - r, a)];
    if (s < a + r) return [1, 2, THREE.MathUtils.smoothstep(s, a, a + r)];
    return [2, 3, THREE.MathUtils.smoothstep(s, a + b - 0.035, a + b + 0.025)];
  }, (y) => arm ? -y < 0.145 ? 0 : -y < a ? 1 : 2 : -y < 0.22 ? 0 : -y < a ? 1 : -y < 0.79 ? 2 : 3);
  const bones = Array.from({ length: 5 }, () => new THREE.Bone());
  bones[0].add(bones[1]); bones[1].add(bones[2]); bones[2].add(bones[3]);
  bones[0].add(bones[4]);
  bones[1].position.y = -a; bones[3].position.y = -b;
  const mesh = skinned(geometry, materials, bones, "human-" + kind + side);
  const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), qm = new THREE.Quaternion(), qe = new THREE.Quaternion(), body = new THREE.Quaternion();
  const y = new THREE.Vector3(), z = new THREE.Vector3(), x = new THREE.Vector3(), frame = new THREE.Matrix4();
  const plane = new THREE.Vector3(), first = new THREE.Vector3(), second = new THREE.Vector3();
  const rotation = (top, bottom, R, q) => {
    y.subVectors(top, bottom).normalize(); x.copy(plane);
    if (x.lengthSq() < 1e-10) x.setFromMatrixColumn(R, 0).addScaledVector(y, -y.dot(x));
    x.normalize(); z.crossVectors(x, y).normalize();
    return q.setFromRotationMatrix(frame.makeBasis(x, y, z));
  };
  return {
    mesh,
    update(J) {
      const top = J[(arm ? "shoulder" : "hip") + side], mid = J[(arm ? "elbow" : "knee") + side], end = J[(arm ? "wrist" : "ankle") + side];
      plane.crossVectors(first.subVectors(mid, top), second.subVectors(end, mid));
      if (arm) plane.negate();
      const upper = J[(arm ? "upperArmFrame" : "thighFrame") + side], lower = J[(arm ? "forearmFrame" : "shinFrame") + side];
      if (upper) q0.setFromRotationMatrix(upper); else rotation(top, mid, arm ? J.Rc : J.Rp, q0);
      if (lower) q1.setFromRotationMatrix(lower); else rotation(mid, end, arm ? J.Rc : J.Rp, q1);
      qm.copy(q0).slerp(q1, 0.5);
      if (arm) {
        y.copy(J["handDir" + side]).negate(); z.copy(J["handRef" + side]);
        x.crossVectors(y, z).normalize(); qe.setFromRotationMatrix(frame.makeBasis(x, y, z));
      } else {
        y.copy(J["footU" + side]); z.copy(J["footF" + side]);
        x.crossVectors(y, z).normalize(); qe.setFromRotationMatrix(frame.makeBasis(x, y, z));
      }
      bones[0].position.copy(top); bones[0].quaternion.copy(q0);
      bones[4].quaternion.copy(q0).invert().multiply(body.setFromRotationMatrix(arm ? J.Rc : J.Rp));
      bones[1].quaternion.copy(q0).invert().multiply(qm);
      bones[2].quaternion.copy(qm).invert().multiply(q1);
      bones[3].quaternion.copy(q1).invert().multiply(qe);
    },
  };
}

export function createHand(material, side) {
  const group = new THREE.Group(); group.name = "human-hand" + side;
  const s = side === "L" ? 1 : -1;
  const bones = [new THREE.Bone()], pieces = [];
  pieces.push(surface([
    [-0.061, 0.02, 0.017], [-0.047, 0.024, 0.02], [-0.029, 0.032, 0.019],
    [-0.008, 0.037, 0.016], [0.014, 0.037, 0.014], [0.032, 0.033, 0.012], [0.04, 0.026, 0.009], [0.043, 0.002, 0.002],
  ], () => [0, 0, 0], undefined, 24));
  const fingers = [];
  for (const [i, length] of [0.071, 0.079, 0.074, 0.06].entries()) {
    const indices = [], joints = [];
    let parent = bones[0];
    for (let j = 0; j < 3; j++) {
      const joint = new THREE.Bone();
      joint.name = "human-finger" + side + "-" + i + "-" + j;
      joint.position.set(j === 0 ? (1.5 - i) * 0.0175 * s : 0, j === 0 ? 0.031 : length * [0.45, 0.32][j - 1], 0);
      parent.add(joint); indices.push(bones.length); bones.push(joint); joints.push(joint); parent = joint;
    }
    const radius = [0.008, 0.0085, 0.008, 0.007][i];
    const profile = [-0.006, 0, 0.14, 0.34, 0.45, 0.56, 0.68, 0.77, 0.87, 0.96, 1].map((u) => [
      u * length, radius * (u > 0.96 ? 0.2 : 1 - 0.37 * Math.max(0, u)), radius * (u > 0.96 ? 0.2 : 0.92 - 0.31 * Math.max(0, u)),
    ]);
    const geometry = surface(profile, (y) => y < length * 0.56
      ? [indices[0], indices[1], THREE.MathUtils.smoothstep(y, length * 0.34, length * 0.56)]
      : [indices[1], indices[2], THREE.MathUtils.smoothstep(y, length * 0.68, length * 0.87)], undefined, 12);
    geometry.translate((1.5 - i) * 0.0175 * s, 0.031, 0);
    pieces.push(geometry); fingers.push(joints);
  }
  const thumb = new THREE.Bone(), thumbTip = new THREE.Bone();
  thumb.name = "human-thumb" + side;
  thumb.position.set(0.031 * s, -0.025, 0); thumb.rotation.z = -0.85 * s;
  thumbTip.position.y = 0.032; thumb.add(thumbTip); bones[0].add(thumb);
  const thumbIndex = bones.length; bones.push(thumb, thumbTip);
  bones[0].updateMatrixWorld(true);
  const thumbGeo = surface([
    [-0.009, 0.014, 0.013], [0, 0.015, 0.014], [0.018, 0.012, 0.011],
    [0.032, 0.01, 0.009], [0.047, 0.009, 0.008], [0.059, 0.007, 0.007], [0.064, 0.002, 0.002],
  ], (y) => [thumbIndex, thumbIndex + 1, THREE.MathUtils.smoothstep(y, 0.025, 0.04)], undefined, 12);
  thumbGeo.applyMatrix4(thumb.matrixWorld); pieces.push(thumbGeo);
  const geometry = mergeGeometries(pieces); pieces.forEach((g) => g.dispose());
  const mesh = skinned(geometry, material, bones, "human-hand-skin" + side);
  group.add(mesh);
  return {
    group,
    update(grip = false, flat = false, axis = null) {
      mesh.position.set(0, grip ? -0.01 : 0, grip ? 0.014 : 0);
      group.rotation.y = axis && Math.hypot(axis.x, axis.z) > 1e-4 ? Math.atan2(-axis.z, axis.x) : 0;
      if (group.rotation.y > Math.PI / 2) group.rotation.y -= Math.PI;
      if (group.rotation.y < -Math.PI / 2) group.rotation.y += Math.PI;
      for (const [i, joints] of fingers.entries()) for (const [j, joint] of joints.entries()) {
        joint.rotation.x = -(grip ? [1.5, 1.45, 0.9][j] : ([0.12, 0.22, 0.16][j] + i * 0.025) * (1 - flat) + 0.004 * flat);
        if (j === 0) {
          joint.rotation.z = (i - 1.5) * (0.012 + 0.033 * flat) * s;
          joint.position.z = -0.008 * flat;
        }
      }
      thumb.rotation.x = grip ? -0.85 : -0.18 * (1 - flat);
      thumb.rotation.y = (grip ? 0.45 : 0) * s;
      thumb.rotation.z = (grip ? -0.52 : -0.85) * s;
      thumbTip.rotation.x = grip ? -1.15 : -0.12 * (1 - flat);
    },
  };
}

export function createHead(materials) {
  const group = new THREE.Group(); group.name = "human-head";
  const curve = new THREE.CatmullRomCurve3([
    [-0.12, 0.002, 0.003], [-0.111, 0.036, 0.044], [-0.095, 0.06, 0.064],
    [-0.07, 0.077, 0.077], [-0.04, 0.088, 0.09], [0, 0.095, 0.099],
    [0.04, 0.096, 0.099], [0.08, 0.086, 0.091], [0.11, 0.06, 0.067], [0.127, 0.002, 0.003],
  ].map(([y, w, d]) => new THREE.Vector3(w, y, d)));
  const geometry = surface(curve.getPoints(48).map((v) => [v.y, Math.max(0.002, v.x), Math.max(0.003, v.z), -0.004]), () => [0, 0, 0], undefined, 64);
  const p = geometry.attributes.position;
  const bump = (x, y, cx, cy, w, h) => Math.exp(-(((x - cx) / w) ** 2) - (((y - cy) / h) ** 2));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (z < 0) continue;
    const front = Math.min(1, z / 0.055) ** 3;
    const nose = 0.017 * bump(x, y, 0, -0.003, 0.012, 0.033) + 0.022 * bump(x, y, 0, -0.024, 0.016, 0.011);
    const cheeks = 0.006 * (bump(x, y, 0.052, -0.026, 0.025, 0.021) + bump(x, y, -0.052, -0.026, 0.025, 0.021));
    const sockets = 0.006 * (bump(x, y, 0.033, 0.014, 0.019, 0.012) + bump(x, y, -0.033, 0.014, 0.019, 0.012));
    p.setZ(i, z + front * (nose + cheeks - sockets + 0.012 * bump(x, y, 0, -0.063, 0.034, 0.016)));
  }
  geometry.computeVertexNormals();
  const face = new THREE.Mesh(geometry, materials.skin); face.name = "human-face"; group.add(face);
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const add = (parent, material, scale, position) => {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.set(...scale); mesh.position.set(...position); parent.add(mesh); return mesh;
  };
  add(group, materials.lip, [0.019, 0.0024, 0.003], [0, -0.061, 0.092]);
  add(group, materials.lip, [0.018, 0.003, 0.003], [0, -0.066, 0.091]);
  add(group, materials.dark, [0.019, 0.0007, 0.0015], [0, -0.0635, 0.094]);
  const eyes = [];
  for (const s of [1, -1]) {
    add(group, materials.skin, [0.014, 0.025, 0.017], [0.095 * s, -0.009, -0.002]);
    add(group, materials.lip, [0.004, 0.013, 0.008], [0.107 * s, -0.009, 0.002]);
    const eye = new THREE.Group(); eye.name = "human-eye" + (s === 1 ? "L" : "R");
    eye.position.set(0.033 * s, 0.014, 0.089); group.add(eye);
    add(eye, materials.eye, [0.013, 0.005, 0.005], [0, 0, 0]);
    add(eye, materials.iris, [0.004, 0.004, 0.002], [0, 0, 0.004]);
    add(eye, materials.dark, [0.002, 0.0025, 0.001], [0, 0, 0.0055]);
    add(eye, materials.skin, [0.015, 0.0035, 0.005], [0, 0.005, -0.001]);
    add(eye, materials.skin, [0.014, 0.002, 0.004], [0, -0.005, -0.001]);
    eyes.push(eye);
    const brow = add(group, materials.hair, [0.02, 0.0025, 0.004], [0.033 * s, 0.031, 0.091]);
    brow.rotation.z = 0.03 * s;
  }
  const hairGeo = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const hp = hairGeo.attributes.position, colors = [];
  for (let i = 0; i < hp.count; i++) {
    const a = Math.atan2(hp.getZ(i), hp.getX(i)), u = Math.acos(THREE.MathUtils.clamp(hp.getY(i), -1, 1)) / (Math.PI / 2);
    const front = Math.max(0, Math.sin(a)), back = Math.max(0, -Math.sin(a));
    const line = 0.018 + 0.052 * front ** 2 - 0.055 * back ** 2;
    const theta = u * Math.acos(line / 0.14), strand = Math.sin(a * 53 + u * 18);
    const r = 1 + strand * 0.005 * Math.sin(Math.PI * u);
    hp.setXYZ(i, Math.cos(a) * Math.sin(theta) * 0.104 * r, Math.cos(theta) * 0.14 + 0.004, Math.sin(a) * Math.sin(theta) * 0.114 * r - 0.004);
    const shade = 0.86 + 0.1 * strand; colors.push(shade, shade, shade);
  }
  hairGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); hairGeo.computeVertexNormals();
  const hair = new THREE.Mesh(hairGeo, materials.hair); group.add(hair);
  group.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return {
    group,
    update(t) {
      const blink = Math.exp(-(((t % 4.7 - 3.1) / 0.075) ** 2));
      for (const eye of eyes) eye.scale.y = 1 - 0.95 * blink;
    },
  };
}

export function createShoe(materials) {
  const group = new THREE.Group();
  const geometry = surface([
    [-0.075, 0.001, 0.001, 0.052], [-0.075, 0.044, 0.085, 0.052], [-0.071, 0.049, 0.099, 0.052],
    [-0.059, 0.051, 0.115, 0.058], [-0.043, 0.05, 0.128, 0.062],
    [-0.032, 0.047, 0.111, 0.055], [-0.014, 0.039, 0.078, 0.028],
    [0, 0.032, 0.045, -0.002], [0.014, 0.029, 0.033, -0.007],
  ], () => [0, 0, 0], (y) => y < -0.071 ? 0 : y < -0.053 ? 1 : 2);
  const shoe = new THREE.Mesh(geometry, materials); shoe.castShadow = shoe.receiveShadow = true; group.add(shoe);
  const points = [];
  for (let i = 0; i < 4; i++) {
    const z = 0.035 + i * 0.015, y = 0.003 - i * 0.0035;
    points.push(new THREE.Vector3(-0.022, y, z), new THREE.Vector3(0.022, y, z + 0.007));
    points.push(new THREE.Vector3(0.022, y, z), new THREE.Vector3(-0.022, y, z + 0.007));
  }
  const laces = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xd6dce2 }));
  group.add(laces);
  return group;
}
