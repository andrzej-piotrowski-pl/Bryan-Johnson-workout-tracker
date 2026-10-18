import assert from "node:assert/strict";
import test from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { ANIM_STYLES, DEFAULT_ANIM_STYLE, animStylePickerHtml } from "../public/js/anim-styles.js";
import { animationIds, getAnimation } from "../public/js/anim/clips/index.js";
import { computeJoints, makePose } from "../public/js/anim/rig.js";
import { prepareClip, sampleClip, Stage } from "../public/js/anim/stage.js";
import { loadFigure } from "../public/js/anim/styles/index.js";

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

// Record canvas commands to catch invalid projections and unbalanced clipping without a browser dependency.
function canvasStub() {
  let calls = [], saves = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(_, name) {
      if (name === "createPattern") return () => "paper-grain";
      if (name === "createRadialGradient") return (...args) => {
        assert.ok(args.every(Number.isFinite)); assert.ok(args[2] >= 0 && args[5] >= 0); return gradient;
      };
      return (...args) => {
        for (const n of args) if (typeof n === "number") assert.ok(Number.isFinite(n), `invalid ${name}`);
        if (name === "arc") assert.ok(args[2] >= 0);
        if (name === "ellipse") assert.ok(args[2] >= 0 && args[3] >= 0);
        if (name === "save") saves++;
        if (name === "restore") assert.ok(saves-- > 0, "unbalanced restore");
        calls.push([name, ...args]);
      };
    },
    set(_, name, value) {
      if (name === "lineWidth") assert.ok(value > 0 && Number.isFinite(value));
      calls.push([name, value]); return true;
    },
  });
  return { width: 0, height: 0, style: {}, setAttribute() {}, getContext: () => ctx, remove() {},
    reset() { calls = []; assert.equal(saves, 0); },
    commands() { assert.equal(saves, 0); return calls; },
  };
}

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
