import assert from "node:assert/strict";
import test from "node:test";
import { DoubleSide, PerspectiveCamera, Raycaster, Triangle, Vector3 } from "three";
import { ANIM_STYLES, DEFAULT_ANIM_STYLE, animStylePickerHtml } from "../public/js/anim-styles.js";
import { animationIds, getAnimation } from "../public/js/anim/clips/index.js";
import { computeJoints, makePose } from "../public/js/anim/rig.js";
import { prepareClip, sampleClip, Stage } from "../public/js/anim/stage.js";
import { loadFigure } from "../public/js/anim/styles/index.js";
import { createFigure as createBlueprintFigure } from "../public/js/anim/styles/blueprint.js";
import { createFigure as createDoodleFigure } from "../public/js/anim/styles/doodle.js";
import { createFigure as createInkFigure } from "../public/js/anim/styles/ink.js";
import { dumbbellHeads, propFaces } from "../public/js/anim/styles/flat.js";

test("three new styles appear in the correct picker groups without changing the default", () => {
  assert.equal(DEFAULT_ANIM_STYLE, "athlete");
  for (const [id, tech] of [["glass", "3d"], ["linocut", "canvas"], ["orrery", "canvas"]]) {
    assert.equal(ANIM_STYLES.find((s) => s.id === id)?.tech, tech);
    assert.match(animStylePickerHtml(id), new RegExp(`data-anim-style="${id}" aria-pressed="true"`));
  }
  assert.equal(new Set(ANIM_STYLES.map((s) => s.id)).size, ANIM_STYLES.length);
});

test("stained-glass seams follow every clip and its materials and geometry are released", async () => {
  const figure = await loadFigure("glass"), meshes = [], v = new Vector3();
  const resources = new Set();
  figure.group.traverse((o) => { if (o.isMesh || o.isLineSegments) meshes.push(o); });
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const clip = prepareClip(raw);
    for (const phase of [0, 0.13, 0.37, 0.61, 0.83, 0.99]) {
      const t = clip.duration * phase, J = computeJoints(sampleClip(clip, t).pose);
      figure.update(J, { t }); figure.group.updateMatrixWorld(true);
      for (const mesh of meshes) {
        assert.ok(mesh.matrixWorld.elements.every(Number.isFinite), `${id}: invalid transform`);
        const p = mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
          assert.ok(Number.isFinite(v.lengthSq()), `${id}: invalid pane or seam`);
          assert.ok(v.y > -0.015, `${id}: ${mesh.name} crosses the floor`);
        }
      }
      for (const s of ["L", "R"]) for (const name of ["hand", "elbow", "knee", "ankle"]) {
        assert.ok(figure.group.getObjectByName(name + s).getWorldPosition(v).distanceTo(J[name + s]) < 1e-7);
      }
    }
  }
  const J = computeJoints(makePose());
  figure.update(J, { t: 3.15 }); assert.equal(figure.group.getObjectByName("glass-eyeL").scale.y, 0.001);
  figure.update(J, { t: 0 }); assert.equal(figure.group.getObjectByName("glass-eyeL").scale.y, 0.009);
  figure.setHighlight(["quads"]); figure.setPulse(1);
  assert.ok(figure.group.getObjectByName("glass-thighL").material.emissiveIntensity > 0);
  figure.group.traverse((o) => { if (o.geometry) resources.add(o.geometry); if (o.material) resources.add(o.material); });
  figure.setHighlight([]);
  assert.equal(figure.group.getObjectByName("glass-thighL").material.emissive.getHex(), 0);
  let disposed = 0;
  for (const r of resources) r.addEventListener("dispose", () => disposed++);
  figure.dispose(); assert.equal(disposed, resources.size);
});

test("corrected 3D heads and shoes clear their worst audited floor contacts", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => canvasStub() };
  const cases = [
    ["mannequin", "farmer", 0.833], ["athlete", "farmer", 0.833], ["female", "farmer", 0.833],
    ["anime", "farmer", 0.833], ["cartoon", "farmer", 0.833], ["voxel", "butterfly", 3],
    ["robot", "farmer", 0.833], ["glass", "farmer", 0.833],
    ["robot", "thread", 2.3, "head"], ["cartoon", "thread", 2.3, "head"],
    ["glass", "thread", 2.3, "head"], ["female", "floorpress", 0, "head"],
  ];
  const v = new Vector3(), point = new Vector3();
  try { for (const [style, id, t, part = "foot"] of cases) {
    const clip = prepareClip(getAnimation(id).clips[0]), J = computeJoints(sampleClip(clip, t).pose);
    const figure = await loadFigure(style);
    figure.update(J, { t, still: true }); figure.group.updateMatrixWorld(true);
    const meshes = [];
    if (style === "mannequin") {
      if (part === "foot") meshes.push(figure.parts.footL, figure.parts.footR);
      else meshes.push(figure.parts.head, figure.parts.visor);
    } else {
      const anchor = figure.group.getObjectByName(part === "foot" ? "footL" : "head");
      if (part === "foot") {
        const right = figure.group.getObjectByName("footR");
        for (const root of [anchor, right]) root.traverse((o) => { if (o.isMesh) meshes.push(o); });
      } else anchor.traverse((o) => { if (o.isMesh) meshes.push(o); });
    }
    let lowest = Infinity, nearestAnkle = Infinity;
    const ankles = part === "foot" && style !== "voxel" && style !== "lowpoly"
      ? style === "mannequin" ? [figure.parts.ankleL, figure.parts.ankleR].map((a) => a.getWorldPosition(new Vector3()))
        : ["L", "R"].map((s) => figure.group.getObjectByName("ankle" + s).getWorldPosition(new Vector3()))
      : [];
    for (const mesh of meshes) {
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
        lowest = Math.min(lowest, v.y);
        for (const ankle of ankles) nearestAnkle = Math.min(nearestAnkle, v.distanceTo(ankle));
      }
    }
    assert.ok(lowest >= -1e-5, `${style} ${id} ${part} crossed the floor at ${t}s (${lowest})`);
    if (part === "foot" && style !== "lowpoly") {
      for (const s of ["L", "R"]) {
        const ankle = style === "mannequin" ? figure.parts["ankle" + s] : figure.group.getObjectByName("ankle" + s);
        assert.ok(ankle.getWorldPosition(point).distanceTo(J["ankle" + s]) < 1e-7, `${style}: ${s} ankle anchor moved`);
      }
      if (ankles.length) assert.ok(nearestAnkle < 0.035, `${style}: shoe separated from its ankle joint`);
    }
    figure.dispose?.();
  } } finally { globalThis.document = previousDocument; }
});

test("corrected Anime head rests on the side-lying external-rotation cushion", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => canvasStub() };
  try {
    const clip = prepareClip(getAnimation("extrot").clips[1]), t = 4.6;
    const support = clip.props[1], top = (support.pos?.[1] || 0) + support.h;
    const J = computeJoints(sampleClip(clip, t).pose), figure = await loadFigure("anime");
    figure.update(J, { t, still: true }); figure.group.updateMatrixWorld(true);
    const head = figure.group.getObjectByName("head"), point = new Vector3();
    let lowest = Infinity;
    head.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        if (Math.abs(point.x - support.pos[0]) <= support.w / 2 && Math.abs(point.z - support.pos[2]) <= support.d / 2) {
          lowest = Math.min(lowest, point.y);
        }
      }
    });
    assert.ok(Number.isFinite(lowest), "Anime head has no vertices over the cushion");
    assert.ok(lowest >= top - 0.005, `Anime head sinks ${(top - lowest) * 1000} mm into the cushion`);
    assert.ok(lowest <= top + 0.005, `Anime head floats ${(lowest - top) * 1000} mm above the cushion`);
    figure.dispose?.();
  } finally { globalThis.document = previousDocument; }
});

test("Pogo, heel-drop, and stomp palms stay near the torso and attached to the wrists in every 3D style", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => canvasStub() };
  const styles = ["mannequin", "athlete", "female", "anime", "lowpoly", "cartoon", "voxel", "robot", "glass"];
  const clips = ["pogo", "heeldrop"].flatMap((id) => getAnimation(id).clips);
  const vertex = new Vector3(), palm = new Vector3(), handCenter = new Vector3(), rayOrigin = new Vector3();
  const rayDirection = new Vector3(), wrist = new Vector3(), closest = new Vector3();
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), triangle = new Triangle();
  try {
    for (const style of styles) {
      const figure = await loadFigure(style), body = new Set(), hands = {};
      if (figure.parts) {
        for (const name of ["pelvis", "abdomen", "chest"]) body.add(figure.parts[name]);
        for (const side of ["L", "R"]) hands[side] = [figure.parts[`hand${side}`]];
      } else {
        for (const name of ["pelvis", "abdomen", "chest"]) figure.group.getObjectByName(name)?.traverse((o) => {
          if (o.isMesh && !o.userData.outline) body.add(o);
        });
        const torso = figure.group.getObjectByName("human-torso");
        if (torso?.isMesh) body.add(torso);
        for (const side of ["L", "R"]) {
          hands[side] = [];
          figure.group.getObjectByName(`hand${side}`)?.traverse((o) => {
            if (o.isMesh && !o.userData.outline) hands[side].push(o);
          });
        }
      }
      const bodyMeshes = [...body];
      assert.ok(bodyMeshes.length, `${style}: no torso meshes found`);
      for (const mesh of bodyMeshes) for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) {
        if (material) material.side = DoubleSide;
      }
      const bodyRay = new Raycaster(); bodyRay.near = 0; bodyRay.far = 1.2;
      for (const raw of clips) {
        const clip = prepareClip(raw);
        const times = [...new Set([...clip.keys.map((key) => key.t), ...clip.keys.slice(1).map((key, i) => (clip.keys[i].t + key.t) / 2)])];
        for (const t of times) {
          const J = computeJoints(sampleClip(clip, t).pose);
          figure.update(J, { t, still: true }); figure.group.updateMatrixWorld(true);
          for (const side of ["L", "R"]) {
          const sign = side === "L" ? 1 : -1;
          palm.copy(J[`handRef${side}`]).normalize();
          assert.ok(palm.x * -sign > 0.9, `${style} ${raw.title}: ${side} palm is turned away from the hip at ${t}s`);
          const handAnchor = figure.parts ? null : figure.group.getObjectByName(`hand${side}`);
          if (handAnchor) handAnchor.getWorldPosition(handCenter);
          else handCenter.copy(J[`hand${side}`]);
          const samples = [];
          let maxPalmProjection = -Infinity;
          for (const mesh of hands[side]) {
            const positions = mesh.geometry?.attributes?.position;
            if (!positions) continue;
            const stride = Math.max(1, Math.floor(positions.count / 100));
            for (let i = 0; i < positions.count; i += stride) {
              mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
              const projection = vertex.clone().sub(handCenter).dot(palm);
              samples.push({ point: vertex.clone(), projection });
              maxPalmProjection = Math.max(maxPalmProjection, projection);
            }
          }
          const palmPoints = samples.filter((sample) => sample.projection >= maxPalmProjection - 0.002);
          let clearance = Infinity;
          for (const sample of palmPoints) {
            rayOrigin.set(sign * 0.6, sample.point.y, sample.point.z);
            rayDirection.set(-sign, 0, 0);
            bodyRay.set(rayOrigin, rayDirection);
            const surface = bodyRay.intersectObjects(bodyMeshes, false)[0];
            if (surface) clearance = Math.min(clearance, (sample.point.x - surface.point.x) * sign);
          }
          assert.ok(Number.isFinite(clearance), `${style} ${raw.title}: ${side} palm missed the torso at ${t}s`);
          assert.ok(clearance >= -0.001, `${style} ${raw.title}: ${side} palm enters the torso by ${(-clearance * 1000).toFixed(1)} mm at ${t}s`);
          assert.ok(clearance <= 0.04, `${style} ${raw.title}: ${side} palm floats ${(clearance * 1000).toFixed(1)} mm from the torso at ${t}s`);

          wrist.copy(J[`wrist${side}`]);
          let wristGap = Infinity;
          for (const mesh of hands[side]) {
            const positions = mesh.geometry?.attributes?.position, indices = mesh.geometry?.index;
            if (!positions) continue;
            const triangleCount = indices ? indices.count : positions.count;
            for (let i = 0; i + 2 < triangleCount; i += 3) {
              const ia = indices ? indices.getX(i) : i, ib = indices ? indices.getX(i + 1) : i + 1, ic = indices ? indices.getX(i + 2) : i + 2;
              mesh.getVertexPosition(ia, a).applyMatrix4(mesh.matrixWorld);
              mesh.getVertexPosition(ib, b).applyMatrix4(mesh.matrixWorld);
              mesh.getVertexPosition(ic, c).applyMatrix4(mesh.matrixWorld);
              triangle.set(a, b, c).closestPointToPoint(wrist, closest);
              wristGap = Math.min(wristGap, wrist.distanceTo(closest));
            }
          }
          assert.ok(wristGap < 0.012, `${style} ${raw.title}: ${side} hand mesh is ${(wristGap * 1000).toFixed(1)} mm from the wrist at ${t}s`);
          }
        }
      }
      figure.dispose?.();
    }
  } finally { globalThis.document = previousDocument; }
});

// Record canvas commands to catch invalid projections and unbalanced clipping without a browser dependency.
function canvasStub() {
  let calls = [], saves = 0, path = [], fills = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(_, name) {
      if (name === "createPattern") return () => "paper-grain";
      if (name === "createLinearGradient" || name === "createRadialGradient") return (...args) => {
        assert.ok(args.every(Number.isFinite));
        if (name === "createRadialGradient") assert.ok(args[2] >= 0 && args[5] >= 0);
        return gradient;
      };
      if (name === "pathFills") return () => fills;
      return (...args) => {
        for (const n of args) if (typeof n === "number") assert.ok(Number.isFinite(n), `invalid ${name}`);
        if (name === "arc") assert.ok(args[2] >= 0);
        if (name === "ellipse") assert.ok(args[2] >= 0 && args[3] >= 0);
        if (name === "save") saves++;
        if (name === "restore") assert.ok(saves-- > 0, "unbalanced restore");
        if (name === "beginPath") path = [];
        if (name === "moveTo" || name === "lineTo") path.push(args.slice(0, 2));
        if (name === "fill") fills.push(path);
        calls.push([name, ...args]);
      };
    },
    set(_, name, value) {
      if (name === "lineWidth") assert.ok(value > 0 && Number.isFinite(value));
      calls.push([name, value]); return true;
    },
  });
  return { width: 0, height: 0, style: {}, setAttribute() {}, appendChild() {}, toDataURL: () => "data:image/png;base64,", getContext: () => ctx, pathFills: () => fills, remove() {},
    reset() { calls = []; assert.equal(saves, 0); },
    commands() { assert.equal(saves, 0); return calls; },
  };
}

test("Ink and Doodle connect both shoulders to the torso before drawing the arms", () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const canvases = [];
  globalThis.document = {
    createElement: () => { const el = canvasStub(); canvases.push(el); return el; },
    createElementNS: () => ({ style: {}, setAttribute() {}, remove() {}, innerHTML: "" }),
  };
  globalThis.window = { devicePixelRatio: 1 };
  try {
    const camera = new PerspectiveCamera(38, 390 / 420, 0.1, 100);
    camera.position.set(0, 1.2, 4); camera.lookAt(0, 0.9, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const stage = { container: { clientWidth: 390, clientHeight: 420 }, camera, opts: { interactive: false },
      clip: { props: [] }, mirrored: false, attachments: () => ({ dumbbells: [], bands: [], string: null }) };
    const J = computeJoints(makePose()), view = Stage.prototype.flatView.call(stage);
    const P = (name) => view.project(J[name]), left = P("shoulderL"), right = P("shoulderR"), neck = P("neckBase");
    const spansShoulders = (points) => {
      const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
      return Math.min(...xs) <= Math.min(left.x, right.x) + 3 && Math.max(...xs) >= Math.max(left.x, right.x) - 3
        && Math.min(...ys) <= neck.y + 3 && Math.max(...ys) >= neck.y - 3;
    };

    const ink = createInkFigure();
    ink.update(J, { still: true }); ink.draw(view);
    assert.ok(canvases.at(-1).pathFills().some(spansShoulders), "Ink has no painted stroke joining both shoulders through the neck");
    ink.dispose();

    const doodle = createDoodleFigure();
    doodle.update(J, { still: true }); doodle.draw(view);
    const paths = [...doodle.dom.innerHTML.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    const endpoints = (d) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const bridge = paths.findIndex((d) => {
      const ps = endpoints(d), a = ps[0], b = ps.at(-1);
      return a && b && Math.hypot(a[0] - left.x, a[1] - left.y) < 2 && Math.hypot(b[0] - right.x, b[1] - right.y) < 2;
    });
    const arm = paths.findIndex((d) => {
      const ps = endpoints(d), a = ps[0], b = ps.at(-1);
      return a && b && [[left, P("handL")], [right, P("handR")]].some(([s, h]) =>
        Math.hypot(a[0] - s.x, a[1] - s.y) < 2 && Math.hypot(b[0] - h.x, b[1] - h.y) < 2);
    });
    assert.ok(bridge >= 0 && arm > bridge, "Doodle's shoulder bridge must be drawn behind its arms");
    doodle.dispose();
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("the print and orrery draw all movements, cameras and equipment with repeatable paused frames", async () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  globalThis.document = { createElement: () => canvasStub() };
  globalThis.window = { devicePixelRatio: 1.5 };
  try {
    for (const style of ["linocut", "orrery"]) {
      const figure = await loadFigure(style), camera = new PerspectiveCamera(38, 1, 0.1, 100);
      const stage = { container: { clientWidth: 390, clientHeight: 420 }, camera, opts: { interactive: true } };
      const render = (J, t = 0) => {
        stage.attachments = () => ({ dumbbells: [{ c: J.handL, axis: new Vector3(1, 0, 0), size: 1.15 }],
          bands: [[J.handR, new Vector3(0, 1.7, 0)]], string: [J.head, new Vector3(0, 2.4, 0)] });
        figure.dom.reset(); figure.update(J, { t, still: true }); figure.draw(Stage.prototype.flatView.call(stage));
        return figure.dom.commands();
      };
      for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
        const clip = prepareClip(raw); stage.clip = clip; figure.setHighlight(clip.highlight);
        for (const phase of [0, 0.31, 0.56, 0.92]) {
          const t = clip.duration * phase, sample = sampleClip(clip, t); stage.mirrored = sample.mirrored;
          const J = computeJoints(sample.pose);
          for (const pos of [[0, 1.2, 4], [4, 1.2, 0], [2.8, 2, 3]]) {
            camera.position.set(...pos); camera.lookAt(0, 0.9, 0); camera.updateMatrixWorld();
            assert.ok(render(J, t).length > 300, `${style}: empty figure for ${id}`);
          }
        }
      }
      const J = computeJoints(makePose()), first = render(J, 1.2);
      render(J, 2.4); assert.deepEqual(render(J, 1.2), first, `${style}: a paused frame changes`);
      const moved = computeJoints(sampleClip(prepareClip(getAnimation("pushup").clips[0]), 1).pose);
      assert.notDeepEqual(render(moved, 1.2), first, `${style}: the figure does not follow the pose`);
      figure.dispose();
    }
  } finally {
    globalThis.document = previousDocument; globalThis.window = previousWindow;
  }
});

test("Blueprint's title strip stays clear of the figure, ground and equipment across every clip", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElementNS: () => ({ style: {}, setAttribute() {}, remove() {}, innerHTML: "" }) };
  try {
    const figure = createBlueprintFigure(), camera = new PerspectiveCamera(38, 1, 0.1, 100);
    let visibleStrips = 0;
    const overlaps = (rect, points, pad = 0) => {
      const left = Math.min(...points.map((p) => p.x)) - pad, right = Math.max(...points.map((p) => p.x)) + pad;
      const top = Math.min(...points.map((p) => p.y)) - pad, bottom = Math.max(...points.map((p) => p.y)) + pad;
      return rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
    };
    for (const width of [220, 390]) {
      let currentJ, currentClip;
      const stage = { container: { clientWidth: width, clientHeight: width }, camera, opts: { interactive: false },
        attachments: () => ({
          dumbbells: currentClip?.hold ? [{ c: currentJ.handL, axis: new Vector3(1, 0, 0), size: 1 }] : [],
          bands: currentClip?.props.some((p) => p.anchorH != null) ? [[currentJ.handL, new Vector3(0, 1.5, 0)]] : [],
          string: null,
        }) };
      for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
        const clip = prepareClip(raw); stage.clip = clip; figure.setHighlight(clip.highlight);
        currentClip = clip;
        for (const phase of [0, 0.31, 0.56, 0.92]) {
          const sample = sampleClip(clip, clip.duration * phase); stage.mirrored = sample.mirrored;
          const J = currentJ = computeJoints(sample.pose);
          for (const pos of [[0, 1.2, 4], [4, 1.2, 0], [2.8, 2, 3]]) {
            camera.position.set(...pos); camera.lookAt(0, 0.9, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
            const view = Stage.prototype.flatView.call(stage);
            figure.update(J, { title: id, id }); figure.draw(view);
            const panel = figure.dom.innerHTML.match(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="31"/);
            if (!panel) continue;
            visibleStrips++;
            const rect = { left: Number(panel[1]), top: Number(panel[2]), right: Number(panel[1]) + Number(panel[3]), bottom: Number(panel[2]) + 31 };
            const u = view.scaleAt(J.pelvis), P = (key) => view.project(J[key]);
            assert.ok(!overlaps(rect, [P("head")], u * 0.105 + 2), `${id}: title strip overlaps the head`);
            assert.ok(!overlaps(rect, ["shoulderL", "shoulderR", "hipL", "hipR"].map(P), u * 0.06 + 2), `${id}: title strip overlaps the torso`);
            const eye = view.camera.world, horizontal = Math.hypot(eye[0], eye[2]) || 1;
            const ground = [-0.95, 0.95].map((k) => view.project({ x: J.pelvis.x + (eye[0] / horizontal) * k, y: 0, z: J.pelvis.z + (eye[2] / horizontal) * k }));
            assert.ok(!overlaps(rect, ground, 10), `${id}: title strip overlaps the ground line`);
            for (const s of ["L", "R"]) for (const keys of [
              ["shoulder" + s, "elbow" + s], ["elbow" + s, "wrist" + s, "hand" + s],
              ["hip" + s, "knee" + s], ["knee" + s, "ankle" + s], ["heel" + s, "ball" + s, "toe" + s],
            ]) assert.ok(!overlaps(rect, keys.map(P), u * 0.08 + 2), `${id} at ${phase} with ${width}px view from ${pos}: title strip overlaps ${keys.at(-1)}; ${JSON.stringify(rect)}`);
            for (const spec of view.props) for (const face of propFaces(spec, view)) {
              assert.ok(!overlaps(rect, face.pts, 3), `${id}: title strip overlaps ${spec.type}`);
            }
            for (const [a, b] of view.attachments.bands) {
              assert.ok(!overlaps(rect, [view.project(a), view.project(b)], 3), `${id}: title strip overlaps a band`);
            }
            for (const db of view.attachments.dumbbells) {
              const { a, b, r } = dumbbellHeads(db), radius = u * r + 3;
              assert.ok(!overlaps(rect, [view.project(a)], radius) && !overlaps(rect, [view.project(b)], radius), `${id}: title strip overlaps a dumbbell`);
            }
          }
        }
      }
    }
    assert.ok(visibleStrips > 0, "Blueprint title strip never finds a clear area");
    figure.dispose();
  } finally {
    globalThis.document = previousDocument;
  }
});
