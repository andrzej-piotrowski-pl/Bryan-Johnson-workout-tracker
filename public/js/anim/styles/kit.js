// Shared building blocks for the animation styles in this folder.
//
// A style draws the figure its own way from the joints rig.js computes, so it plays
// every clip exactly like the mannequin. createRig() gives it anchors that follow the
// body (pelvis, chest, head, hands, feet, joints) to hang rigid parts on, and
// stretchy segments that span a bone (upper arm, thigh…). buildBody() puts the
// mannequin's shapes on it with a style's own geometry and materials. The rest are
// helpers for the looks: toon ramps, outlines, rim light, glow, canvas textures and
// muscle highlighting.
//
// A style module exports createFigure(), which returns:
//   group                       the figure (added to the scene by the stage)
//   update(J, { t, still })     place it for joints J (t: clip time; still: a one-off frame)
//   setHighlight(groups)        light up muscle groups (GROUPS in mannequin.js)
//   setPulse(v)                 0…1, the highlight's breathing
//   setTheme(dark, colors)      light/dark mode and the theme's { body, hl } colours
//   look | look(dark)           the stage's lights around it: { hemi: [sky, ground, intensity],
//                               key: [colour, intensity], rim: [colour, intensity], tone: "none"
//                               (no tone mapping), exposure, floor: { color, grid, gridOpacity } }
//   dressProp(mesh)             optional: restyle a prop mesh (step, wall…)
//   dispose()

import * as THREE from "three";
import { DIM } from "../rig.js";
import { GROUPS } from "../mannequin.js";

export const SIDES = [["L", 1], ["R", -1]];
const UP = new THREE.Vector3(0, 1, 0);
const tA = new THREE.Vector3();
const tB = new THREE.Vector3();
const tX = new THREE.Vector3();
const tY = new THREE.Vector3();
const tZ = new THREE.Vector3();
const tRef = new THREE.Vector3();
const tAlt = new THREE.Vector3();
const tM = new THREE.Matrix4();

// Stretchy bones: top joint, bottom joint and the frame whose forward axis fixes the twist.
const BONES = {};
for (const [s] of SIDES) {
  BONES["upperArm" + s] = ["shoulder" + s, "elbow" + s, "Rc"];
  BONES["forearm" + s] = ["elbow" + s, "wrist" + s, "Rc"];
  BONES["thigh" + s] = ["hip" + s, "knee" + s, "Rp"];
  BONES["shin" + s] = ["knee" + s, "ankle" + s, "Rp"];
}

// Turns obj so its +Y runs along y and its +Z faces `ref` as far as it can (else `alt`).
function aim(obj, y, ref, alt) {
  tZ.copy(ref).addScaledVector(y, -y.dot(ref));
  if (tZ.lengthSq() < 1e-4) tZ.copy(alt).addScaledVector(y, -y.dot(alt));
  tZ.normalize();
  tX.crossVectors(y, tZ);
  tM.makeBasis(tX, y, tZ);
  obj.quaternion.setFromRotationMatrix(tM);
}

function frame(obj, R, pos) {
  obj.quaternion.setFromRotationMatrix(R);
  obj.position.copy(pos);
}

// Places a unit-height mesh (geometry along +Y from −0.5 to 0.5) between two points,
// top end at a. Keeps the mesh's x/z scale.
export function span(mesh, a, b) {
  tY.subVectors(a, b);
  const len = tY.length();
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.scale.y = Math.max(len, 1e-4);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(UP, tY.divideScalar(len));
}

export function createRig() {
  const group = new THREE.Group();
  group.name = "figure";
  const anchors = {};
  const add = (name) => {
    const o = new THREE.Group();
    o.name = name;
    group.add(o);
    anchors[name] = o;
  };
  ["pelvis", "abdomen", "chest", "neckBase", "head"].forEach(add);
  for (const [s] of SIDES) for (const n of ["shoulder", "elbow", "wrist", "hand", "hip", "knee", "ankle", "foot"]) add(n + s);
  const ends = { neck: [new THREE.Vector3(), new THREE.Vector3(), null] };
  for (const b of Object.keys(BONES)) ends[b] = [new THREE.Vector3(), new THREE.Vector3(), null];
  const segs = [];
  const floorUp = new THREE.Vector3(0, 1, 0), localUp = new THREE.Vector3();
  const footPoints = {};

  function keepFootGeometryAboveFloor(anchor) {
    const oldOffset = anchor.userData.floorOffset;
    if (oldOffset) for (const child of anchor.children) child.position.sub(oldOffset);
    anchor.userData.floorOffset = null;
    anchor.updateWorldMatrix(true, true);

    let points = footPoints[anchor.name];
    if (!points) {
      points = [];
      const inverse = anchor.matrixWorld.clone().invert(), relative = new THREE.Matrix4(), p = new THREE.Vector3();
      anchor.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry?.attributes.position) return;
        relative.multiplyMatrices(inverse, obj.matrixWorld);
        const positions = obj.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          points.push(p.fromBufferAttribute(positions, i).applyMatrix4(relative).clone());
        }
      });
      footPoints[anchor.name] = points;
    }
    if (!points.length) return;

    localUp.copy(floorUp).applyQuaternion(anchor.quaternion.clone().invert());
    let lowest = anchor.position.y;
    for (const point of points) lowest = Math.min(lowest, anchor.position.y + point.dot(localUp));
    if (lowest < 0) {
      const offset = localUp.multiplyScalar(-lowest + 1e-6);
      for (const child of anchor.children) child.position.add(offset);
      anchor.userData.floorOffset = offset.clone();
    }
  }

  // A mesh spanning part of a bone (from/to: 0 = top joint … 1 = bottom joint), its
  // geometry along +Y from −0.5 to 0.5, stretched to the bone. twist: true keeps its
  // local +Z facing the body's front, for shapes that aren't round (boxes).
  function seg(mesh, bone, { from = 0, to = 1, twist = false } = {}) {
    group.add(mesh);
    segs.push({ mesh, bone, from, to, twist });
    return mesh;
  }

  function update(J) {
    frame(anchors.pelvis, J.Rp, J.pelvis);
    frame(anchors.abdomen, J.R1, tA.copy(J.lumbar).lerp(J.thoracic, 0.5));
    frame(anchors.chest, J.Rc, J.thoracic);
    frame(anchors.neckBase, J.Rc, J.neckBase);
    frame(anchors.head, J.Rh, J.head);
    for (const [s] of SIDES) {
      for (const n of ["shoulder", "elbow", "wrist"]) frame(anchors[n + s], J.Rc, J[n + s]);
      for (const n of ["hip", "knee", "ankle"]) frame(anchors[n + s], J.Rp, J[n + s]);
      // Hand: +Y toward the fingertips, +Z toward the chest's front (the thumb side).
      const hand = anchors["hand" + s];
      hand.quaternion.setFromRotationMatrix(J["handFrame" + s]);
      hand.position.copy(J["hand" + s]);
      // Foot: +X to the side, +Y the top of the foot, +Z toward the toes; origin at the ankle.
      const f = J["footF" + s], u = J["footU" + s];
      tX.crossVectors(u, f).normalize();
      tM.makeBasis(tX, u, f);
      anchors["foot" + s].quaternion.setFromRotationMatrix(tM);
      anchors["foot" + s].position.copy(J["ankle" + s]);
    }
    ends.neck[0].copy(J.headJoint).lerp(J.head, 0.25);
    ends.neck[1].copy(J.neckBase).lerp(J.thoracic, 0.1);
    ends.neck[2] = J.Rc;
    for (const [b, [top, bottom, R]] of Object.entries(BONES)) {
      ends[b][0].copy(J[top]);
      ends[b][1].copy(J[bottom]);
      ends[b][2] = J[R];
    }
    for (const { mesh, bone, from, to, twist } of segs) {
      const [top, bottom, R] = ends[bone];
      tA.copy(top).lerp(bottom, from);
      tB.copy(top).lerp(bottom, to);
      span(mesh, tA, tB);
      if (twist) {
        tY.subVectors(tA, tB).normalize();
        aim(mesh, tY, tRef.setFromMatrixColumn(R, 2), tAlt.setFromMatrixColumn(R, 1));
      }
    }
  }

  function keepFeetAboveFloor() {
    for (const [s] of SIDES) keepFootGeometryAboveFloor(anchors["foot" + s]);
  }

  return { group, anchors, ends, seg, update, keepFeetAboveFloor };
}

// ---------- the standard body ----------

// The smooth torso: [part, anchor, [height in the anchor's frame, half-width]…, depth / width].
const TORSO = [
  ["pelvis", "pelvis", [[-0.125, 0], [-0.115, 0.07], [-0.09, 0.13], [-0.05, 0.158], [0, 0.166], [0.05, 0.158], [0.1, 0.143], [0.125, 0.138]], 0.74],
  ["abdomen", "abdomen", [[-0.135, 0.139], [-0.07, 0.135], [0, 0.137], [0.07, 0.143], [0.135, 0.15]], 0.7],
  ["chest", "chest", [[-0.04, 0.148], [0.03, 0.156], [0.1, 0.166], [0.16, 0.17], [0.2, 0.162], [0.228, 0.135], [0.248, 0.09], [0.258, 0.05], [0.262, 0]], 0.66],
];

// The mannequin's shapes on a rig, in a style's geometry and materials.
//   geo.seg(rTop, rBottom, name)  a limb segment, unit height along +Y ("thigh", "sleeve"…)
//   geo.sphere              a unit sphere (ellipsoids are scaled spheres)
//   mat(role)               material for "skin" | "top" | "bottom" | "shoe" | "sole" | "sock"
//   sleeve, shorts          share of the upper arm / thigh the shirt / shorts cover (0: none)
//   girth, head             scale of the limbs' thickness and of the head
//   torso                   "blobs" (the mannequin's three ellipsoids) or "smooth" (one
//                           continuous shape: hips, waist, ribcage and shoulders)
//   part(mesh, region, role) called for every part: region is the mannequin's part name
//                           (for highlighting), role its material role
// Returns the parts by name; sleeves and shorts legs are "sleeveL", "shortsL"…
export function buildBody(rig, { geo, mat, sleeve = 0.42, shorts = 0.5, girth = 1, head = 1, sole = true, torso = "blobs", part = () => {} }) {
  const parts = {};
  const put = (name, mesh, region, role) => {
    parts[name] = mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    part(mesh, region, role);
    return mesh;
  };
  const blob = (name, anchor, size, pos, role, region = name) => {
    const m = new THREE.Mesh(geo.sphere, mat(role));
    m.scale.set(...size);
    m.position.set(...pos);
    rig.anchors[anchor].add(m);
    return put(name, m, region, role);
  };
  const limb = (name, bone, rTop, rBottom, role, region, range) => {
    const m = new THREE.Mesh(geo.seg(rTop * girth, rBottom * girth, name.replace(/[LR]$/, "")), mat(role));
    rig.seg(m, bone, range);
    return put(name, m, region, role);
  };
  const ball = (name, anchor, r, role, region = name) => blob(name, anchor, [r * girth, r * girth, r * girth], [0, 0, 0], role, region);

  if (torso === "smooth") {
    // Three round shells, one per spine frame, that meet at the same width: with the spine
    // straight they read as one torso, and they still bend with it.
    for (const [name, anchor, profile, depth] of TORSO) {
      const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([y, r]) => new THREE.Vector2(r, y)), geo.radial || 32), mat(name === "pelvis" ? "bottom" : "top"));
      m.scale.z = depth;
      rig.anchors[anchor].add(m);
      put(name, m, name, name === "pelvis" ? "bottom" : "top");
    }
  } else {
    blob("pelvis", "pelvis", [0.155, 0.105, 0.112], [0, 0.022, -0.006], "bottom");
    blob("abdomen", "abdomen", [0.132, 0.145, 0.098], [0, 0, 0], "top");
    blob("chest", "chest", [0.165, 0.168, 0.113], [0, 0.13, 0.008], "top");
  }
  limb("neck", "neck", 0.046, 0.05, "skin", "neck");
  blob("head", "head", [0.094 * head, 0.113 * head, 0.104 * head], [0, 0.012 * (head - 1), 0], "skin");
  const footLen = (DIM.toe + DIM.heel) / 2;
  for (const [s] of SIDES) {
    ball("shoulder" + s, "shoulder" + s, 0.058, sleeve ? "top" : "skin");
    limb("upperArm" + s, "upperArm" + s, 0.047, 0.036, "skin", "upperArm" + s);
    if (sleeve) limb("sleeve" + s, "upperArm" + s, 0.057, 0.051, "top", "upperArm" + s, { to: sleeve });
    ball("elbow" + s, "elbow" + s, 0.037, "skin", "forearm" + s);
    limb("forearm" + s, "forearm" + s, 0.035, 0.027, "skin", "forearm" + s);
    blob("hand" + s, "hand" + s, [0.022 * girth, 0.05, 0.034 * girth], [0, 0, 0], "skin");
    ball("hip" + s, "hip" + s, 0.07, shorts ? "bottom" : "skin", "pelvis");
    limb("thigh" + s, "thigh" + s, 0.078, 0.052, "skin", "thigh" + s);
    if (shorts) limb("shorts" + s, "thigh" + s, 0.089, 0.073 + 0.01 * shorts, "bottom", "thigh" + s, { to: shorts });
    ball("knee" + s, "knee" + s, 0.051, "skin", "thigh" + s);
    limb("shin" + s, "shin" + s, 0.049, 0.034, "skin", "shin" + s);
    ball("ankle" + s, "ankle" + s, 0.037, "sock", "shin" + s);
    blob("foot" + s, "foot" + s, [0.047 * girth, 0.038, footLen], [0, -DIM.ankleH * 0.62, (DIM.toe - DIM.heel) / 2], "shoe");
    if (sole) blob("sole" + s, "foot" + s, [0.052 * girth, 0.013, footLen + 0.006], [0, -DIM.ankleH + 0.008, (DIM.toe - DIM.heel) / 2], "sole", "foot" + s);
  }
  return parts;
}

// ---------- highlighting ----------

// Tracks which meshes belong to which body region (the mannequin's part names, so
// GROUPS applies) and switches them with apply(mesh, on).
export function createHighlighter(apply) {
  const tagged = [];
  return {
    tag(mesh, region) {
      tagged.push([mesh, region]);
      apply(mesh, false);
      return mesh;
    },
    set(groups = []) {
      const lit = new Set();
      for (const g of groups) for (const n of GROUPS[g] || []) lit.add(n);
      for (const [mesh, region] of tagged) apply(mesh, lit.has(region));
    },
  };
}

// Highlighted twins of materials, made on demand by make(base) and kept for reuse.
export function createTwins(make) {
  const twins = new Map();
  const of = (base) => {
    if (!twins.has(base)) twins.set(base, make(base));
    return twins.get(base);
  };
  return {
    of,
    all: () => [...twins.values()],
    // Swaps a mesh between its base material and the twin.
    swap(mesh, on) {
      if (!mesh.userData.base) mesh.userData.base = mesh.material;
      mesh.material = on ? of(mesh.userData.base) : mesh.userData.base;
    },
  };
}

// ---------- looks ----------

// A gradient map for MeshToonMaterial: one flat band per level (0…1, dark to light).
export function toonRamp(levels) {
  const data = new Uint8Array(levels.length * 4);
  levels.forEach((v, i) => data.set([v * 255, v * 255, v * 255, 255], i * 4));
  const tex = new THREE.DataTexture(data, levels.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Inverted-hull outline: the back faces, pushed out along the normals by `thickness`
// metres, in one colour. Add it to a mesh with outline(mesh, material).
export function outlineMaterial(color = 0x111111, thickness = 0.01) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, thickness: { value: thickness } },
    vertexShader: `
      uniform float thickness;
      void main() {
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.xyz += n * thickness;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
  });
}

export function outline(mesh, material) {
  const o = new THREE.Mesh(mesh.geometry, material);
  o.userData.outline = true;
  mesh.add(o);
  return o;
}

// Adds a rim light (a glow on the edges facing away from the camera) to a lit material.
export function addRim(material, color, power = 3, strength = 0.5) {
  const rim = { color: new THREE.Color(color), power, strength };
  material.userData.rim = rim;
  material.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: rim.color };
    sh.uniforms.rimPower = { value: rim.power };
    sh.uniforms.rimStrength = { value: rim.strength };
    sh.fragmentShader = sh.fragmentShader
      .replace("void main() {", "uniform vec3 rimColor;\nuniform float rimPower;\nuniform float rimStrength;\nvoid main() {")
      .replace(
        "#include <opaque_fragment>",
        "outgoingLight += rimColor * rimStrength * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), rimPower);\n#include <opaque_fragment>"
      );
  };
  material.customProgramCacheKey = () => "rim";
  return material;
}

// An unlit, additive glow that is brightest at the silhouette, on a shell pushed
// `inflate` metres out from the surface.
export function glowMaterial({ color = 0x66ccff, power = 2, strength = 1, base = 0.05, inflate = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
      power: { value: power },
      strength: { value: strength },
      base: { value: base },
      inflate: { value: inflate },
    },
    vertexShader: `
      uniform float inflate;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.xyz += vN * inflate;
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      uniform float power;
      uniform float strength;
      uniform float base;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float a = base + pow(1.0 - abs(dot(normalize(vN), normalize(vV))), power) * strength;
        gl_FragColor = vec4(color * a, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// A texture drawn on a canvas by draw(ctx, w, h). nearest: crisp pixels (pixel art).
export function canvasTexture(w, h, draw, { nearest = false, srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (nearest) {
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  return tex;
}

// A small repeatable pseudo-random number from integers (deterministic noise).
export function hash(...n) {
  let h = 2166136261;
  for (const x of n) h = Math.imul(h ^ (x | 0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Replaces a prop mesh's material with make(original), one per original, and
// optionally outlines it. See-through materials (the wall) stay see-through and get no
// outline; make may return the original to leave a material alone.
export function propDresser(make, outlineMat = null) {
  const cache = new Map();
  return (mesh) => {
    if (mesh.userData.outline) return;
    const src = mesh.material;
    if (!cache.has(src)) {
      const m = make(src);
      if (m !== src && src.transparent) Object.assign(m, { transparent: true, opacity: src.opacity, depthWrite: src.depthWrite });
      cache.set(src, m);
    }
    mesh.material = cache.get(src);
    if (outlineMat && !src.transparent && !mesh.children.some((c) => c.userData.outline)) outline(mesh, outlineMat);
  };
}

// Disposes everything under root plus any extra materials (highlight twins…).
export function disposeTree(root, extra = []) {
  const geos = new Set(), mats = new Set(extra), texs = new Set();
  root.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    const m = o.material;
    (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => mats.add(x));
  });
  for (const m of mats) {
    for (const k of ["map", "gradientMap", "bumpMap", "alphaMap", "emissiveMap"]) if (m[k]) texs.add(m[k]);
    m.dispose();
  }
  geos.forEach((g) => g.dispose());
  texs.forEach((t) => t.dispose());
}
