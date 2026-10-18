import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import { ANIM_STYLES, DEFAULT_ANIM_STYLE, animStyleById, animStylePickerHtml } from "../public/js/anim-styles.js";
import { loadFigure } from "../public/js/anim/styles/index.js";
import { animationIds, getAnimation } from "../public/js/anim/clips/index.js";
import { computeJoints, makePose } from "../public/js/anim/rig.js";
import { prepareClip, sampleClip } from "../public/js/anim/stage.js";

test("Female athlete loads from the style picker and follows all exercises without broken joints or floor clipping", async () => {
  assert.equal(animStyleById("female").tech, "3d");
  assert.equal(DEFAULT_ANIM_STYLE, "athlete");
  assert.equal(new Set(ANIM_STYLES.map((s) => s.id)).size, ANIM_STYLES.length);
  assert.match(animStylePickerHtml("female"), /data-anim-style="female" aria-pressed="true"/);
  const figure = await loadFigure("female"), meshes = [], skins = [], v = new Vector3();
  assert.ok(figure.group.getObjectByName("female-face"));
  assert.ok(figure.group.getObjectByName("female-bun"));
  figure.group.traverse((o) => { if (o.isMesh) meshes.push(o); if (o.isSkinnedMesh) skins.push(o); });
  assert.equal(skins.length, 8);
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const clip = prepareClip(raw);
    for (const phase of [0, 0.13, 0.37, 0.61, 0.83, 0.99]) {
      const t = clip.duration * phase, sample = sampleClip(clip, t), J = computeJoints(sample.pose);
      const hold = raw.hold || {}, bar = raw.props?.some((p) => p.bar || p.type === "bar");
      const grip = Object.fromEntries(["L", "R"].map((s) => {
        const side = sample.mirrored ? (s === "L" ? "R" : "L") : s;
        return [s, !!(bar || hold.goblet || hold[side] || raw.bands?.some((b) => [b.a, b.b].includes("hand" + side)))];
      }));
      figure.update(J, { t, breath: 0.5, grip }); figure.group.updateMatrixWorld(true);
      for (const mesh of meshes) {
        assert.ok(mesh.matrixWorld.elements.every(Number.isFinite), `${id}: invalid transform`);
        if (mesh.isSkinnedMesh) {
          mesh.skeleton.update(); assert.ok([...mesh.skeleton.boneMatrices].every(Number.isFinite), `${id}: invalid skin`);
        }
        for (let i = 0; i < mesh.geometry.attributes.position.count; i += 8) {
          mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
          assert.ok(Number.isFinite(v.lengthSq()), `${id}: invalid vertex`);
          assert.ok(v.y > -0.015, `${id}: ${mesh.name || mesh.parent.name} crosses the floor`);
        }
      }
      for (const s of ["L", "R"]) for (const kind of ["arm", "leg"]) {
        const bones = figure.group.getObjectByName("human-" + kind + s).skeleton.bones;
        assert.ok(bones[1].getWorldPosition(v).distanceTo(J[(kind === "arm" ? "elbow" : "knee") + s]) < 1e-6);
        assert.ok(bones[3].getWorldPosition(v).distanceTo(J[(kind === "arm" ? "wrist" : "ankle") + s]) < 1e-6);
      }
    }
  }
  const J = computeJoints(makePose());
  figure.update(J, { t: 3.1 }); assert.ok(figure.group.getObjectByName("female-eyeL").scale.y < 0.1);
  figure.update(J, { t: 0 }); assert.equal(figure.group.getObjectByName("female-eyeL").scale.y, 1);
  figure.setTheme(true, { hl: "#ff8844" }); figure.setHighlight(["quads"]); figure.setPulse(1);
  const thigh = figure.group.getObjectByName("human-legL").material[0];
  assert.ok(thigh.emissiveIntensity > 0); assert.equal(thigh.emissive.getHex(), 0xff8844);
  figure.setHighlight([]); assert.equal(thigh.emissiveIntensity, 0);
  let disposed = 0;
  for (const skin of skins) {
    skin.skeleton.computeBoneTexture();
    skin.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
  }
  figure.dispose(); assert.equal(disposed, skins.length);
});
