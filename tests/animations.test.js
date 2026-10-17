import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import { EXERCISES } from "../public/js/data/exercises.js";
import { animationIds, getAnimation } from "../public/js/anim/clips/index.js";
import { computeJoints, DIM, makePose, mirrorPose } from "../public/js/anim/rig.js";
import { prepareClip, sampleClip } from "../public/js/anim/stage.js";

const near = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} differs from ${b}`);

test("every exercise and movement has finite joints, fixed bone lengths and reachable planted feet throughout playback", () => {
  assert.deepEqual(animationIds().sort(), Object.keys(EXERCISES).sort());
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const clip = prepareClip(raw);
    assert.ok(clip.duration > 0, `${id}: empty movement`);
    clip.keys.forEach((key, i) => { if (i) assert.ok(key.t > clip.keys[i - 1].t, `${id}: key order`); });
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      const pose = sampleClip(clip, t).pose;
      const J = computeJoints(pose);
      const label = `${id}: ${clip.title} at ${t.toFixed(3)}`;
      for (const v of Object.values(J)) if (v.isVector3) assert.ok(Number.isFinite(v.lengthSq()), label);
      for (const s of ["L", "R"]) {
        for (const [a, b, length] of [["hip", "knee", DIM.thigh], ["knee", "ankle", DIM.shin], ["shoulder", "elbow", DIM.upperArm], ["elbow", "wrist", DIM.forearm]]) {
          near(J[a + s].distanceTo(J[b + s]), length);
        }
        if (pose["foot" + s]) assert.ok(J["ankle" + s].distanceTo(new Vector3(...pose["foot" + s])) < 0.004, label + ": foot out of reach");
      }
    }
  }
});

test("new spine, wrist and foot orientation controls mirror with the whole skeleton", () => {
  const p = makePose({ root: [0.1, 0.88, 0.03], rot: [12, 22, 5], spine: [18, 7, 25], lumbar: [5, 2, 3], armL: [155, 12, 28, 8], wristL: [15, 8, 55], wristR: [-5, -8, -12], footL: [0.15, 0.1, 0.1], footYawL: 15 });
  const J = computeJoints(p), M = computeJoints(mirrorPose(p));
  for (const [name, v] of Object.entries(J)) if (v.isVector3) {
    const other = name.endsWith("L") ? name.slice(0, -1) + "R" : name.endsWith("R") ? name.slice(0, -1) + "L" : name;
    near(v.x, -M[other].x); near(v.y, M[other].y); near(v.z, M[other].z);
  }
  assert.deepEqual(mirrorPose(mirrorPose(p)), p);
});

test("continuous curves preserve planted coordinates, never overshoot, and join smoothly at the loop", () => {
  const clip = prepareClip({ keys: [0, 1, 0, -1, 0].map((x, t) => ({ t, e: "smooth", p: { root: [x, 0.9, 0], footL: [0.12, 0.075, 0] } })) });
  for (let t = 0; t < 4; t += 0.005) {
    const p = sampleClip(clip, t).pose;
    assert.ok(p.root[0] >= -1 && p.root[0] <= 1);
    assert.deepEqual(p.footL, [0.12, 0.075, 0]);
  }
  const dt = 1e-4;
  const left = (sampleClip(clip, 4 - dt).pose.root[0] - sampleClip(clip, 4 - 2 * dt).pose.root[0]) / dt;
  const right = (sampleClip(clip, 2 * dt).pose.root[0] - sampleClip(clip, dt).pose.root[0]) / dt;
  near(left, right, 0.001);
});

test("push-up hands stay on the floor and bird dog keeps its supporting hand and knee still", () => {
  const push = prepareClip(getAnimation("pushup").clips[0]);
  for (let t = 0; t < push.duration; t += 1 / 60) {
    const p = sampleClip(push, t).pose, J = computeJoints(p);
    for (const s of ["L", "R"]) near(J["wrist" + s].distanceTo(new Vector3(...p["hand" + s])), 0, 0.001);
  }
  const bird = prepareClip(getAnimation("birddog").clips[0]);
  const start = computeJoints(sampleClip(bird, 0).pose);
  for (let t = 0; t < bird.half; t += 1 / 60) {
    const J = computeJoints(sampleClip(bird, t).pose);
    near(J.wristR.distanceTo(start.wristR), 0, 0.001);
    near(J.kneeL.distanceTo(start.kneeL), 0, 0.001);
  }
});

test("shoulder taps keep the toes planted and external rotation keeps the elbow on the knee", () => {
  const tap = prepareClip(getAnimation("shouldertap").clips[0]);
  for (let t = 0; t < tap.duration; t += 1 / 60) {
    const J = computeJoints(sampleClip(tap, t).pose);
    near(J.toeL.y, 0.018, 0.001); near(J.toeR.y, 0.018, 0.001);
  }
  const rotation = prepareClip(getAnimation("extrot").clips[0]);
  for (let t = 0; t < rotation.half; t += 1 / 60) {
    const J = computeJoints(sampleClip(rotation, t).pose);
    assert.ok(J.elbowL.distanceTo(J.kneeL.clone().add({ x: 0, y: 0.065, z: 0 })) < 0.005);
  }
});

test("curl grips turn continuously and cardio keeps hands down with knees clear of the floor", () => {
  const curl = prepareClip(getAnimation("curl").clips[0]);
  let previous = computeJoints(sampleClip(curl, 0).pose).handRefL;
  for (let t = 1 / 60; t < curl.duration; t += 1 / 60) {
    const next = computeJoints(sampleClip(curl, t).pose).handRefL;
    assert.ok(previous.dot(next) > 0.98, "wrist flipped during the curl");
    previous = next;
  }
  for (const ci of [2, 4]) {
    const clip = prepareClip(getAnimation("indoorhiit").clips[ci]);
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      const p = sampleClip(clip, t).pose, J = computeJoints(p);
      assert.ok(Math.min(J.kneeL.y, J.kneeR.y) > 0.05, "knee crossed the floor");
      if (p.handL?.[1] === 0.035) near(J.wristL.distanceTo(new Vector3(...p.handL)), 0, 0.001);
    }
  }
});

test("sampling is repeatable, leaves authored poses unchanged, and supports reverse playback", () => {
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const before = JSON.stringify(raw), clip = prepareClip(raw);
    assert.deepEqual(sampleClip(clip, -0.25), sampleClip(clip, clip.duration - 0.25));
    assert.deepEqual(sampleClip(clip, 0.25), sampleClip(clip, 0.25));
    assert.equal(JSON.stringify(raw), before);
  }
});
