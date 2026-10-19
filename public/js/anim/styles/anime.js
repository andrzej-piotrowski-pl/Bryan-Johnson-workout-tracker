// Anime: cel shading in the manner of VRM avatars and their MToon shader. Three soft
// bands with violet-tinted shadows, a rim light, thin coloured outlines, a larger head
// with big painted eyes and spiky pink hair. The worked muscles get a glowing outline.

import * as THREE from "three";
import { SIDES, addRim, buildBody, canvasTexture, createHighlighter, createRig, disposeTree, outline, outlineMaterial, toonRamp } from "./kit.js";

const hipAxis = new THREE.Vector3();

function clearHipPalms(rig, J) {
  if (!J.palmL || !J.palmR || J.palmL.x > -0.9 || J.palmR.x < 0.9) return;
  if (Math.abs(J.handL.x - J.pelvis.x) > 0.24 || Math.abs(J.handR.x - J.pelvis.x) > 0.24
    || Math.abs(J.handL.y - J.pelvis.y) > 0.14 || Math.abs(J.handR.y - J.pelvis.y) > 0.14) return;
  hipAxis.setFromMatrixColumn(J.Rp, 0);
  rig.anchors.handL.position.addScaledVector(hipAxis, 0.004);
  rig.anchors.handR.position.addScaledVector(hipAxis, -0.004);
}

const HEAD = 1.22;
const RIM = 0xcfe6ff;

function eyeTexture(iris) {
  return canvasTexture(64, 72, (x) => {
    const ring = (cx, cy, rx, ry) => {
      x.beginPath();
      x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    };
    x.fillStyle = "#ffffff";
    ring(32, 40, 24, 28);
    x.fill();
    const g = x.createLinearGradient(0, 20, 0, 66);
    g.addColorStop(0, "#26164f");
    g.addColorStop(1, iris);
    x.fillStyle = g;
    ring(32, 44, 17, 22);
    x.fill();
    x.fillStyle = "#170c2e";
    ring(32, 45, 8, 11);
    x.fill();
    x.fillStyle = "#ffffff";
    ring(24, 35, 6, 7);
    x.fill();
    ring(40, 56, 3, 3);
    x.fill();
    x.strokeStyle = "#2b1838";
    x.lineWidth = 7;
    x.lineCap = "round";
    x.beginPath();
    x.ellipse(32, 42, 26, 30, 0, Math.PI * 1.07, Math.PI * 1.93);
    x.stroke();
  });
}

const mouthTexture = () =>
  canvasTexture(64, 32, (x) => {
    x.strokeStyle = "#7a3048";
    x.lineWidth = 4;
    x.lineCap = "round";
    x.beginPath();
    x.arc(32, 4, 14, Math.PI * 0.25, Math.PI * 0.75);
    x.stroke();
  });

const blushTexture = () =>
  canvasTexture(64, 32, (x) => {
    const g = x.createRadialGradient(32, 16, 2, 32, 16, 30);
    g.addColorStop(0, "rgba(255,120,150,0.55)");
    g.addColorStop(1, "rgba(255,120,150,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 32);
  });

export function createFigure() {
  const rig = createRig();
  const ramp = toonRamp([0.52, 0.76, 1]);
  const toon = (color) => addRim(new THREE.MeshToonMaterial({ color, gradientMap: ramp, emissive: 0x3b2a63, emissiveIntensity: 0.32 }), RIM, 3.2, 0.42);
  const mats = {
    skin: toon(0xffe0cf),
    top: toon(0xf6f6fb),
    bottom: toon(0x2f47a8),
    shoe: toon(0xff5d76),
    sole: toon(0xffffff),
    sock: toon(0xffffff),
    hair: toon(0xff8cc6),
  };
  const ink = outlineMaterial(0x3a2848, 0.007);
  const inkHl = outlineMaterial(0xff7ab8, 0.01);
  const hl = createHighlighter((mesh, on) => (mesh.userData.ink.material = on ? inkHl : ink));

  const geo = { sphere: new THREE.SphereGeometry(1, 32, 22), seg: (rt, rb) => new THREE.CylinderGeometry(rt, rb, 1, 24, 1) };
  const body = buildBody(rig, {
    geo,
    mat: (role) => mats[role],
    head: HEAD,
    torso: "smooth",
    girth: 0.9,
    sleeve: 0.4,
    shorts: 0.45,
    part(m, region) {
      m.userData.ink = outline(m, ink);
      hl.tag(m, region);
    },
  });

  // Hair: a cap and spikes (cones with their base at the origin, tip up).
  const H = rig.anchors.head;
  // Keep the Anime head slightly oversized while clearing the floor in deep side rolls.
  H.scale.setScalar(0.84);
  const cone = new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
  const capGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const cap = new THREE.Mesh(capGeo, mats.hair);
  cap.scale.copy(body.head.scale).multiplyScalar(1.016);
  cap.position.copy(body.head.position);
  H.add(cap);
  outline(cap, ink);
  const spike = (pos, dir, len, r) => {
    const m = new THREE.Mesh(cone, mats.hair);
    m.position.set(...pos);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize());
    m.scale.set(r * 0.95, len, r * 0.95);
    m.castShadow = true;
    H.add(m);
    outline(m, ink);
    return m;
  };
  for (const x of [-0.07, -0.035, 0, 0.035, 0.07]) {
    const bang = spike([x, 0.1, 0.085], [x * 3, -1, 0.5], 0.075, 0.026);
    bang.position.y -= 0.01;
    bang.scale.x *= 0.85;
    bang.scale.z *= 0.85;
  }
  for (const [, s] of SIDES) {
    spike([0.06 * s, 0.03, 0.03], [0.25 * s, -1, 0.15], 0.045, 0.026);
    spike([0.04 * s, 0.04, -0.04], [0.45 * s, -1, -0.2], 0.045, 0.03);
    spike([0.07 * s, 0.07, -0.1], [0.4 * s, -0.7, 0], 0.025, 0.034);
  }
  spike([0, 0.06, -0.1], [0, -1, 0], 0.13, 0.02);
  spike([0, 0.12, 0.0], [0.25, 1, 0], 0.04, 0.012); // the one strand that won't lie flat

  // The face, painted on small planes that sit on the head.
  const plane = new THREE.PlaneGeometry(1, 1);
  const decal = (tex, size, pos, yaw, pitch = 0) => {
    const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.scale.set(size[0], size[1], 1);
    m.position.set(...pos);
    m.rotation.set(pitch, yaw, 0, "YXZ");
    H.add(m);
  };
  const eye = eyeTexture("#7b5cff");
  const blush = blushTexture();
  for (const [, s] of SIDES) {
    decal(eye, [0.046, 0.052], [0.043 * s, -0.008, 0.121], 0.4 * s);
    decal(blush, [0.05, 0.025], [0.066 * s, -0.045, 0.104], 0.6 * s, 0.25);
  }
  decal(mouthTexture(), [0.03, 0.015], [0, -0.072, 0.113], 0, 0.5);

  return {
    group: rig.group,
    look: (dark) => ({
      tone: "none",
      hemi: [0xffffff, dark ? 0x5a4c78 : 0xc9bde6, 0.55],
      key: [0xffffff, 2.9],
      rim: [0xffe0f2, 0.5],
    }),
    update(J) { rig.update(J); clearHipPalms(rig, J); rig.keepFeetAboveFloor(); },
    setHighlight: (groups) => hl.set(groups),
    setPulse: (v) => (inkHl.uniforms.thickness.value = 0.007 + 0.007 * v),
    setTheme(dark, colors = {}) {
      inkHl.uniforms.color.value.set(colors.hl || 0xff7ab8);
    },
    dispose: () => disposeTree(rig.group, [...Object.values(mats), ink, inkHl]),
  };
}
