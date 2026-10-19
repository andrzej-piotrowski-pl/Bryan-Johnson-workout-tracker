// The 3D mannequin: tapered limbs, ellipsoid torso blocks and a head with a visor.
// Every frame, update(joints) places the meshes on the positions computed by rig.js.

import * as THREE from "three";
import { DIM } from "./rig.js";

const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const footPoint = new THREE.Vector3();
const tmpM = new THREE.Matrix4();

// Muscle groups → mesh names, for highlighting what an exercise trains.
export const GROUPS = {
  quads: ["thighL", "thighR"],
  hamstrings: ["thighL", "thighR"],
  adductors: ["thighL", "thighR"],
  glutes: ["pelvis"],
  hips: ["pelvis", "thighL", "thighR"],
  calves: ["shinL", "shinR"],
  shins: ["shinL", "shinR"],
  ankles: ["footL", "footR", "shinL", "shinR"],
  feet: ["footL", "footR"],
  core: ["abdomen"],
  obliques: ["abdomen"],
  lowerBack: ["abdomen", "pelvis"],
  back: ["chest", "abdomen"],
  upperBack: ["chest"],
  chest: ["chest"],
  shoulders: ["shoulderL", "shoulderR", "upperArmL", "upperArmR"],
  rotatorCuff: ["shoulderL", "shoulderR"],
  biceps: ["upperArmL", "upperArmR"],
  triceps: ["upperArmL", "upperArmR"],
  arms: ["upperArmL", "upperArmR", "forearmL", "forearmR"],
  grip: ["forearmL", "forearmR", "handL", "handR"],
  neck: ["neck"],
  heart: ["chest"],
};

export function createMannequin() {
  const group = new THREE.Group();
  group.name = "mannequin";
  const mats = {
    body: new THREE.MeshStandardMaterial({ color: 0xe3e9f0, roughness: 0.52, metalness: 0.04 }),
    joint: new THREE.MeshStandardMaterial({ color: 0xc9d2de, roughness: 0.48, metalness: 0.04 }),
    hl: new THREE.MeshStandardMaterial({ color: 0x34d6a4, roughness: 0.42, metalness: 0.04, emissive: 0x0d6b4c, emissiveIntensity: 0.35 }),
    hlJoint: new THREE.MeshStandardMaterial({ color: 0x27b88b, roughness: 0.42, metalness: 0.04, emissive: 0x0d6b4c, emissiveIntensity: 0.3 }),
    visor: new THREE.MeshStandardMaterial({ color: 0x18212c, roughness: 0.2, metalness: 0.45 }),
  };
  const parts = {};
  const baseMat = {};

  const sphereGeo = new THREE.SphereGeometry(1, 32, 22);
  const footPoints = Array.from({ length: sphereGeo.attributes.position.count }, (_, i) =>
    new THREE.Vector3().fromBufferAttribute(sphereGeo.attributes.position, i));
  function add(name, mesh, mat) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    parts[name] = mesh;
    baseMat[name] = mat;
    return mesh;
  }
  function seg(name, rTop, rBottom) {
    return add(name, new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, 1, 22, 1), mats.body), "body");
  }
  function ball(name, r) {
    const m = add(name, new THREE.Mesh(sphereGeo, mats.joint), "joint");
    m.scale.setScalar(r);
    return m;
  }
  function ellipsoid(name, rx, ry, rz, mat = "body") {
    const m = add(name, new THREE.Mesh(sphereGeo, mats[mat]), mat);
    m.userData.size = [rx, ry, rz];
    m.scale.set(rx, ry, rz);
    return m;
  }

  ellipsoid("pelvis", 0.155, 0.105, 0.112);
  ellipsoid("abdomen", 0.132, 0.145, 0.098);
  ellipsoid("chest", 0.165, 0.168, 0.113);
  seg("neck", 0.046, 0.05);
  ellipsoid("head", 0.094, 0.113, 0.104);
  ellipsoid("visor", 0.072, 0.021, 0.034, "visor");
  for (const s of ["L", "R"]) {
    ball("shoulder" + s, 0.058);
    seg("upperArm" + s, 0.047, 0.036);
    ball("elbow" + s, 0.037);
    seg("forearm" + s, 0.035, 0.027);
    ellipsoid("hand" + s, 0.031, 0.05, 0.021);
    ball("hip" + s, 0.07);
    seg("thigh" + s, 0.078, 0.052);
    ball("knee" + s, 0.051);
    seg("shin" + s, 0.049, 0.034);
    ball("ankle" + s, 0.035);
    ellipsoid("foot" + s, 0.047, 0.038, (DIM.toe + DIM.heel) / 2);
  }

  function place(mesh, a, b) {
    // Cylinder from b (bottom) to a (top).
    tmpV.subVectors(a, b);
    const len = tmpV.length();
    mesh.position.addVectors(a, b).multiplyScalar(0.5);
    mesh.scale.set(1, Math.max(len, 1e-4), 1);
    if (len > 1e-6) mesh.quaternion.setFromUnitVectors(UP, tmpV.divideScalar(len));
  }
  function orient(mesh, R, center) {
    mesh.quaternion.setFromRotationMatrix(R);
    mesh.position.copy(center);
  }
  // Point at local offset (x, y, z) in rotation frame R around origin.
  const off = (R, origin, x, y, z) => origin.clone().add(new THREE.Vector3(x, y, z).applyMatrix4(R));

  function update(J) {
    orient(parts.pelvis, J.Rp, off(J.Rp, J.pelvis, 0, 0.022, -0.006));
    orient(parts.abdomen, J.R1, J.lumbar.clone().lerp(J.thoracic, 0.5));
    orient(parts.chest, J.Rc, off(J.Rc, J.thoracic, 0, 0.13, 0.008));
    place(parts.neck, J.headJoint.clone().lerp(J.head, 0.25), J.neckBase.clone().lerp(J.thoracic, 0.1));
    orient(parts.head, J.Rh, J.head);
    orient(parts.visor, J.Rh, off(J.Rh, J.head, 0, 0.018, 0.084));
    for (const s of ["L", "R"]) {
      parts["shoulder" + s].position.copy(J["shoulder" + s]);
      place(parts["upperArm" + s], J["shoulder" + s], J["elbow" + s]);
      parts["elbow" + s].position.copy(J["elbow" + s]);
      place(parts["forearm" + s], J["elbow" + s], J["wrist" + s]);
      const hand = parts["hand" + s];
      hand.position.copy(J["hand" + s]);
      hand.quaternion.setFromRotationMatrix(J["handFrame" + s]);
      parts["hip" + s].position.copy(J["hip" + s]);
      place(parts["thigh" + s], J["hip" + s], J["knee" + s]);
      parts["knee" + s].position.copy(J["knee" + s]);
      place(parts["shin" + s], J["knee" + s], J["ankle" + s]);
      parts["ankle" + s].position.copy(J["ankle" + s]);
      // Foot: basis x = lateral, y = top of foot, z = toward the toes.
      const f = J["footF" + s];
      const u = J["footU" + s];
      const l = new THREE.Vector3().crossVectors(u, f).normalize();
      tmpM.makeBasis(l, u, f);
      const foot = parts["foot" + s];
      foot.quaternion.setFromRotationMatrix(tmpM);
      foot.position.copy(J["ankle" + s]).addScaledVector(f, (DIM.toe - DIM.heel) / 2).addScaledVector(u, -DIM.ankleH * 0.62);
      let lowest = foot.position.y;
      for (const point of footPoints) {
        footPoint.set(point.x * foot.scale.x, point.y * foot.scale.y, point.z * foot.scale.z).applyQuaternion(foot.quaternion);
        lowest = Math.min(lowest, foot.position.y + footPoint.y);
      }
      if (lowest < 0) foot.position.y += -lowest + 1e-6;
    }
  }

  function setHighlight(groups = []) {
    const on = new Set();
    for (const g of groups) for (const name of GROUPS[g] || []) on.add(name);
    for (const [name, mesh] of Object.entries(parts)) {
      if (name === "visor") continue;
      const isJoint = baseMat[name] === "joint";
      mesh.material = on.has(name) ? (isJoint ? mats.hlJoint : mats.hl) : isJoint ? mats.joint : mats.body;
    }
  }

  function setPulse(v) {
    mats.hl.emissiveIntensity = 0.25 + 0.35 * v;
  }

  // colors: optional { body, hl } hex strings from the theme.
  function setTheme(dark, colors = {}) {
    mats.body.color.set(colors.body || (dark ? 0xdfe6ef : 0xf4f6f9));
    mats.joint.color.set(colors.body || (dark ? 0xc2ccd9 : 0xd5dce6));
    if (colors.body) mats.joint.color.multiplyScalar(0.88);
    if (colors.hl) {
      const hl = new THREE.Color(colors.hl);
      mats.hl.color.copy(hl);
      mats.hlJoint.color.copy(hl).multiplyScalar(0.85);
      mats.hl.emissive.copy(hl).multiplyScalar(0.35);
      mats.hlJoint.emissive.copy(hl).multiplyScalar(0.35);
    } else {
      mats.hl.color.set(0x34d6a4);
      mats.hlJoint.color.set(0x27b88b);
      mats.hl.emissive.set(0x0d6b4c);
      mats.hlJoint.emissive.set(0x0d6b4c);
    }
  }

  function dispose() {
    group.traverse((o) => o.geometry && o.geometry.dispose());
    Object.values(mats).forEach((m) => m.dispose());
  }

  return { group, parts, update, setHighlight, setPulse, setTheme, dispose };
}
