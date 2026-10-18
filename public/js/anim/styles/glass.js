// Jewel panes and brass leading, without a refraction pass or external textures.
import * as THREE from "three";
import { SIDES, buildBody, createHighlighter, createRig, createTwins, disposeTree, hash, propDresser } from "./kit.js";

const PALETTE = [0x139eac, 0x2376b7, 0x4450b4, 0xa03b85, 0xe05b65, 0xf0b544];

function panes(source) {
  const geo = source.index ? source.toNonIndexed() : source.clone();
  source.dispose();
  const colors = [], color = new THREE.Color();
  for (let i = 0; i < geo.attributes.position.count; i += 3) {
    color.setHex(PALETTE[Math.floor(hash(i, 17) * PALETTE.length)]);
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

function shoeGeometry() {
  // The Athlete's contact profile, with eight facets around each section.
  const profile = [
    [-0.075, 0.001, 0.001, 0.052], [-0.075, 0.044, 0.085, 0.052], [-0.071, 0.049, 0.099, 0.052],
    [-0.059, 0.051, 0.115, 0.058], [-0.043, 0.05, 0.128, 0.062], [-0.032, 0.047, 0.111, 0.055],
    [-0.014, 0.039, 0.078, 0.028], [0, 0.032, 0.045, -0.002], [0.014, 0.029, 0.033, -0.007],
  ];
  const vertices = [], indices = [];
  for (const [i, [y, w, d, z]] of profile.entries()) for (let j = 0; j < 8; j++) {
    const a = j * Math.PI / 4;
    vertices.push(Math.cos(a) * w, y, z + Math.sin(a) * d);
    if (i) {
      const b = i * 8 + j, c = i * 8 + (j + 1) % 8;
      indices.push(b - 8, b, c - 8, b, c, c - 8);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices);
  geo.computeVertexNormals();
  return panes(geo);
}

export function createFigure() {
  const rig = createRig();
  const glass = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.24, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.15, flatShading: true });
  const brass = new THREE.MeshStandardMaterial({ color: 0xe6bf76, roughness: 0.3, metalness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x172b38, roughness: 0.4, metalness: 0.5 });
  const light = new THREE.MeshBasicMaterial({ color: 0xffedb4 });
  const seam = new THREE.LineBasicMaterial({ color: 0xb99559 });
  const twins = createTwins((base) => {
    const m = base.clone(); m.emissive.set(0xffa943); m.emissiveIntensity = 0.35;
    return m;
  });
  const hl = createHighlighter((mesh, on) => twins.swap(mesh, on));
  const sphere = panes(new THREE.IcosahedronGeometry(1, 1)), shoe = shoeGeometry();
  const parts = buildBody(rig, {
    geo: { sphere, radial: 10, seg: (rt, rb) => panes(new THREE.CylinderGeometry(rt, rb, 1, 8, 3)) },
    mat: (role) => role === "sole" || role === "sock" ? dark : glass,
    torso: "smooth", sleeve: 0, shorts: 0, sole: false, girth: 0.96,
    part(mesh, region, role) {
      mesh.name = "glass-" + region;
      if (role === "shoe") { mesh.geometry = shoe; mesh.scale.setScalar(1); mesh.position.set(0, 0, 0); }
      if (!mesh.geometry.hasAttribute("color")) mesh.geometry = panes(mesh.geometry);
      if (mesh.material === glass) {
        const lines = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry), seam);
        mesh.add(lines); hl.tag(mesh, region);
      }
    },
  });
  const add = (parent, geo, mat, pos, scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos); mesh.scale.set(...scale);
    parent.add(mesh); return mesh;
  };
  const ball = new THREE.SphereGeometry(1, 12, 8);
  const ring = new THREE.TorusGeometry(1, 0.06, 6, 32);
  for (const [s, side] of SIDES) {
    parts["hand" + s].position.y = -0.014;
    for (const name of ["elbow", "knee", "wrist"]) {
      add(rig.anchors[name + s], ring, brass, [0, 0, 0.02], [0.036, 0.036, 0.036]);
    }
    const eye = add(rig.anchors.head, ball, light, [side * 0.034, 0.018, 0.096], [0.019, 0.009, 0.008]);
    eye.name = "glass-eye" + s;
    add(rig.anchors.head, ring, brass, [side * 0.034, 0.018, 0.099], [0.022, 0.013, 0.012]);
  }
  add(rig.anchors.head, new THREE.ConeGeometry(0.012, 0.05, 4), brass, [0, -0.007, 0.105]);
  add(rig.anchors.head, new THREE.BoxGeometry(0.035, 0.004, 0.005), brass, [0, -0.046, 0.092]);
  add(rig.anchors.head, ring, brass, [0, 0.012, -0.054], [0.103, 0.103, 0.06]);

  const rose = new THREE.Group();
  rose.name = "glass-rose"; rose.position.set(0, 0.135, 0.119);
  rig.anchors.chest.add(rose);
  add(rose, ring, brass, [0, 0, 0], [0.067, 0.067, 0.035]);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const petal = add(rose, sphere, glass, [Math.cos(a) * 0.037, Math.sin(a) * 0.037, 0], [0.024, 0.012, 0.008]);
    petal.rotation.z = a;
    add(rose, ring, brass, [Math.cos(a) * 0.037, Math.sin(a) * 0.037, 0.007], [0.023, 0.012, 0.01]).rotation.z = a;
  }
  const core = add(rose, ball, light, [0, 0, 0.01], [0.014, 0.014, 0.009]);
  const eyes = SIDES.map(([s]) => rig.group.getObjectByName("glass-eye" + s));
  return {
    group: rig.group,
    look: { hemi: [0xcfe9ff, 0x182537, 1.5], key: [0xffe5b8, 3], rim: [0x98dfff, 1.5], exposure: 1.15,
      floor: { color: "#101c2b", grid: "#826c47", gridOpacity: 0.12 } },
    update(J, { t = 0 } = {}) {
      rig.update(J);
      for (const [s] of SIDES) parts["hand" + s].scale.z = J["palm" + s] ? 0.014 : 0.024;
      rose.rotation.z = Math.sin(t * 0.7) * 0.08;
      const blink = t % 4.7;
      for (const eye of eyes) eye.scale.y = blink > 3.1 && blink < 3.24 ? 0.001 : 0.009;
    },
    setHighlight: (groups) => hl.set(groups),
    setPulse(v) {
      for (const m of twins.all()) m.emissiveIntensity = 0.18 + v * 0.24;
      const k = 0.85 + v * 0.15; core.scale.set(0.014 * k, 0.014 * k, 0.009 * k);
    },
    setTheme() {},
    dressProp: propDresser((src) => new THREE.MeshStandardMaterial({ color: src.color.clone().lerp(new THREE.Color(0x9d8355), 0.45), metalness: 0.45, roughness: 0.5 })),
    dispose: () => disposeTree(rig.group, [glass, brass, dark, light, seam, ...twins.all()]),
  };
}
