// Home equipment for the 3D scenes: walls, steps, chairs, mats, slant boards,
// door frames with a pull-up bar, plus dumbbells and resistance bands that
// follow the mannequin's hands.

import * as THREE from "three";

const D2R = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

const COLORS = {
  light: { prop: 0xb9c3cf, propDark: 0x8994a3, wood: 0xcdb48f, metal: 0x3a4250, mat: 0x4fb7a0, wall: 0xc9d1db, band: 0xff7a2f },
  dark: { prop: 0x5d6b7e, propDark: 0x46515f, wood: 0x8a7457, metal: 0x2a313b, mat: 0x2f8f7c, wall: 0x6f7d90, band: 0xff8a3d },
};

export function createMaterials(dark) {
  const c = dark ? COLORS.dark : COLORS.light;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...extra });
  return {
    prop: std(c.prop),
    propDark: std(c.propDark),
    wood: std(c.wood, { roughness: 0.8 }),
    metal: std(c.metal, { roughness: 0.35, metalness: 0.6 }),
    mat: std(c.mat, { roughness: 0.9 }),
    wall: std(c.wall, { transparent: true, opacity: 0.38, depthWrite: false }),
    band: std(c.band, { roughness: 0.5 }),
    bandAlt: std(0x5b8cff, { roughness: 0.5 }),
  };
}

// Recolours existing materials when the theme changes.
export function applyPalette(M, dark) {
  const c = dark ? COLORS.dark : COLORS.light;
  for (const k of ["prop", "propDark", "wood", "metal", "mat", "wall", "band"]) M[k].color.set(c[k]);
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(r, len, mat, seg = 18) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Static props. `spec.pos` is the centre of the prop's footprint on the floor.
export function createProp(spec, M) {
  const g = new THREE.Group();
  const [x = 0, y = 0, z = 0] = spec.pos || [];
  g.position.set(x, y, z);
  g.rotation.y = (spec.rotY || 0) * D2R;

  switch (spec.type) {
    case "wall": {
      const w = spec.w ?? 2.2, h = spec.h ?? 2.3;
      const m = box(w, h, 0.05, M.wall);
      m.position.y = h / 2;
      m.castShadow = false;
      g.add(m);
      break;
    }
    case "step":
    case "box": {
      const w = spec.w ?? (spec.type === "step" ? 0.62 : 0.45);
      const d = spec.d ?? (spec.type === "step" ? 0.34 : 0.42);
      const h = spec.h ?? (spec.type === "step" ? 0.18 : 0.45);
      const m = box(w, h, d, spec.type === "step" ? M.prop : M.wood);
      m.position.y = h / 2;
      g.add(m);
      break;
    }
    case "bench": {
      const w = spec.w ?? 0.42, d = spec.d ?? 1.15, h = spec.h ?? 0.46;
      const top = box(w, 0.08, d, M.prop);
      top.position.y = h - 0.04;
      g.add(top);
      for (const dz of [-d / 2 + 0.08, d / 2 - 0.08]) {
        const leg = box(w * 0.8, h - 0.08, 0.06, M.propDark);
        leg.position.set(0, (h - 0.08) / 2, dz);
        g.add(leg);
      }
      break;
    }
    case "chair": {
      const s = 0.44, h = spec.h ?? 0.45;
      const seat = box(s, 0.05, s, M.wood);
      seat.position.y = h;
      g.add(seat);
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const leg = box(0.035, h, 0.035, M.propDark);
        leg.position.set(lx * (s / 2 - 0.03), h / 2, lz * (s / 2 - 0.03));
        g.add(leg);
      }
      if (spec.back !== false) {
        const back = box(s, 0.42, 0.04, M.wood);
        back.position.set(0, h + 0.24, -s / 2 + 0.02);
        g.add(back);
      }
      break;
    }
    case "sofa": {
      const w = spec.w ?? 1.7, d = 0.85;
      const base = box(w, 0.42, d, M.prop);
      base.position.y = 0.21;
      const back = box(w, 0.42, 0.2, M.propDark);
      back.position.set(0, 0.58, -d / 2 + 0.1);
      g.add(base, back);
      break;
    }
    case "slant": {
      // Wedge, high at the back (−Z) so heels sit higher than toes.
      const w = spec.w ?? 0.46, d = spec.d ?? 0.38, ang = (spec.angle ?? 14) * D2R;
      const h = d * Math.tan(ang);
      const shape = new THREE.Shape();
      shape.moveTo(-d / 2, 0);
      shape.lineTo(d / 2, 0);
      shape.lineTo(-d / 2, h);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
      geo.translate(0, 0, -w / 2);
      geo.rotateY(-Math.PI / 2); // shape X → world Z, so the tall edge ends up at the back
      g.userData.height = h;
      const m = new THREE.Mesh(geo, M.wood);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      break;
    }
    case "mat": {
      const w = spec.w ?? 0.62, d = spec.d ?? 1.85;
      const m = box(w, 0.012, d, M.mat);
      m.position.y = 0.006;
      m.castShadow = false;
      g.add(m);
      break;
    }
    case "doorframe": {
      const w = spec.w ?? 0.9, h = spec.h ?? 2.05;
      for (const sx of [-1, 1]) {
        const post = box(0.07, h, 0.14, M.prop);
        post.position.set(sx * (w / 2 + 0.035), h / 2, 0);
        g.add(post);
      }
      const head = box(w + 0.14, 0.08, 0.14, M.prop);
      head.position.y = h + 0.04;
      g.add(head);
      if (spec.bar) {
        const bar = cyl(0.016, w + 0.12, M.metal);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, spec.barH ?? 2.0, spec.barZ ?? 0.08);
        g.add(bar);
        for (const sx of [-1, 1]) {
          const bracket = box(0.035, 0.035, spec.barZ ?? 0.08, M.metal);
          bracket.position.set(sx * (w / 2 + 0.035), spec.barH ?? 2.0, (spec.barZ ?? 0.08) / 2);
          g.add(bracket);
        }
      }
      break;
    }
    case "door": {
      // Closed door; a band anchor sits on the hinge side at anchorH.
      const w = spec.w ?? 0.86, h = 2.02;
      const panel = box(w, h, 0.04, M.prop);
      panel.position.y = h / 2;
      g.add(panel);
      for (const sx of [-1, 1]) {
        const post = box(0.06, h + 0.06, 0.1, M.propDark);
        post.position.set(sx * (w / 2 + 0.03), (h + 0.06) / 2, 0);
        g.add(post);
      }
      if (spec.anchorH != null) {
        const knob = cyl(0.022, 0.06, M.band, 12);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(spec.anchorX ?? 0, spec.anchorH, 0.04);
        g.add(knob);
      }
      break;
    }
    case "bar": {
      // Free-standing pull-up bar (door-frame bar seen without the frame).
      const w = spec.w ?? 1.0;
      const bar = cyl(0.016, w, M.metal);
      bar.rotation.z = Math.PI / 2;
      bar.position.y = spec.h ?? 2.0;
      g.add(bar);
      break;
    }
    default:
      console.warn("Unknown prop", spec.type);
  }
  return g;
}

// A hex dumbbell; its handle runs along the local X axis.
export function createDumbbell(M, size = 1) {
  const g = new THREE.Group();
  const handle = cyl(0.016, 0.14, M.metal, 12);
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  for (const sx of [-1, 1]) {
    const head = cyl(0.056 * size, 0.07 * size, M.metal, 6);
    head.rotation.z = Math.PI / 2;
    head.position.x = sx * (0.07 + 0.035 * size);
    g.add(head);
  }
  return g;
}

// A resistance band drawn as a thin tube between two points.
export function createBand(M, alt = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1, 10), alt ? M.bandAlt : M.band);
  m.castShadow = true;
  return {
    mesh: m,
    set(a, b) {
      const d = new THREE.Vector3().subVectors(a, b);
      const len = Math.max(d.length(), 1e-4);
      m.position.addVectors(a, b).multiplyScalar(0.5);
      m.scale.set(1, len, 1);
      m.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
    },
  };
}
