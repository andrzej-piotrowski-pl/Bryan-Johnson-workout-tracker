import assert from "node:assert/strict";
import test from "node:test";
import { Quaternion, Vector3 } from "three";
import { EXERCISES } from "../public/js/data/exercises.js";
import { animationIds, getAnimation } from "../public/js/anim/clips/index.js";
import { computeJoints, DIM, makePose, mirrorPose } from "../public/js/anim/rig.js";
import { prepareClip, sampleClip } from "../public/js/anim/stage.js";
import { createFigure } from "../public/js/anim/styles/athlete.js";
import { createHand } from "../public/js/anim/styles/human.js";
import { MeshStandardMaterial } from "three";

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

test("supported palms lie flat and mirror without moving the wrists", () => {
  for (const id of ["pushup", "shouldertap", "plank", "birddog", "catcow", "cobra", "thread"]) {
    const clip = prepareClip(getAnimation(id).clips[0]);
    for (let t = 0; t < clip.duration; t += 1 / 30) {
      const pose = sampleClip(clip, t).pose, J = computeJoints(pose);
      for (const side of ["L", "R"]) if (pose["palm" + side]) {
        near(J["handDir" + side].dot(J["palm" + side]), 0);
        near(J["handRef" + side].dot(J["palm" + side]), 1);
        if (pose["hand" + side]?.[1] < 0.15) assert.ok(J["wrist" + side].distanceTo(new Vector3(...pose["hand" + side])) < 0.004, `${id}: palm out of reach`);
      }
      const mirrored = computeJoints(mirrorPose(pose));
      if (J.palmL) near(J.handL.y, mirrored.handR.y);
    }
  }
});

test("Athlete's connected skin stays finite and follows every joint through every movement", () => {
  const figure = createFigure();
  const torso = figure.group.getObjectByName("human-torso");
  assert.ok(torso.isSkinnedMesh);
  const skins = [], meshes = [];
  figure.group.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); if (o.isMesh) meshes.push(o); });
  assert.equal(skins.length, 8);
  for (const skin of skins) {
    const weights = skin.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++) near(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i), 1, 1e-6);
  }
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const clip = prepareClip(raw);
    for (const phase of [0.1, 0.5, 0.9]) {
      const J = computeJoints(sampleClip(clip, clip.duration * phase).pose);
      figure.update(J, { t: clip.duration * phase, breath: phase });
      figure.group.updateMatrixWorld(true);
      for (const mesh of meshes) {
        if (mesh.isSkinnedMesh) {
          mesh.skeleton.update();
          assert.ok([...mesh.skeleton.boneMatrices].every(Number.isFinite), id + ": skin transform");
        }
        for (let i = 0; i < mesh.geometry.attributes.position.count; i += 8) {
          const v = mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld);
          assert.ok(Number.isFinite(v.lengthSq()), id + ": skin vertex");
          assert.ok(v.y >= -0.015, id + ": " + mesh.name + " penetrates the floor");
        }
      }
      for (const s of ["L", "R"]) for (const kind of ["arm", "leg"]) {
        const bones = figure.group.getObjectByName("human-" + kind + s).skeleton.bones;
        near(bones[1].getWorldPosition(new Vector3()).distanceTo(J[(kind === "arm" ? "elbow" : "knee") + s]), 0);
        near(bones[3].getWorldPosition(new Vector3()).distanceTo(J[(kind === "arm" ? "wrist" : "ankle") + s]), 0);
      }
    }
  }
  const neutral = computeJoints(makePose());
  figure.update(neutral, { breath: 0 });
  const before = torso.geometry.attributes.position.array.slice();
  figure.update(neutral, { breath: 1 });
  assert.ok(torso.geometry.attributes.position.array.some((v, i) => v !== before[i]));
  near(figure.group.getObjectByName("handL").position.distanceTo(neutral.handL), 0);
  figure.update(neutral, { t: 3.1 });
  assert.ok(figure.group.getObjectByName("human-eyeL").scale.y < 0.1);
  figure.update(neutral, { t: 0 });
  near(figure.group.getObjectByName("human-eyeL").scale.y, 1);
  figure.group.updateMatrixWorld(true);
  const head = figure.group.getObjectByName("head").position;
  const headJoint = head.clone().sub(new Vector3(0, DIM.headUp, DIM.headFwd).applyMatrix4(neutral.Rh));
  near(headJoint.distanceTo(neutral.neckBase), DIM.neck * 0.72);
  near(figure.group.getObjectByName("human-neck").skeleton.bones[1].getWorldPosition(new Vector3()).distanceTo(headJoint), 0);
  figure.dispose();
});

test("human hands open flat and close each finger around a grip deterministically", () => {
  const material = new MeshStandardMaterial(), hand = createHand(material, "L");
  const rotations = () => {
    const values = [];
    hand.group.traverse((o) => { if (o.isGroup || o.isBone) values.push(o.rotation.x, o.rotation.y, o.rotation.z); });
    return values;
  };
  hand.update(false, true);
  const flat = rotations();
  hand.update(true, false, new Vector3(-1, 0, 0));
  assert.ok(rotations().some((v, i) => Math.abs(v - flat[i]) > 0.5));
  near(hand.group.rotation.y, 0);
  hand.update(false, true);
  assert.deepEqual(rotations(), flat);
  const right = createHand(material, "R");
  right.update(false, true);
  const centers = (group) => {
    group.updateMatrixWorld(true);
    const points = [];
    group.traverse((o) => { if (o.isBone) points.push(o.getWorldPosition(new Vector3())); });
    return points;
  };
  const leftPoints = centers(hand.group), rightPoints = centers(right.group);
  for (let i = 0; i < leftPoints.length; i++) {
    near(leftPoints[i].x, -rightPoints[i].x); near(leftPoints[i].y, rightPoints[i].y); near(leftPoints[i].z, rightPoints[i].z);
  }
  for (const h of [hand, right]) h.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isSkinnedMesh) o.skeleton.dispose(); });
  material.dispose();
});

test("high knees lift off and land without a foot-position jump", () => {
  for (const [id, ci, phase] of [["shortint", 0, 0.4], ["shortint", 1, 0.6], ["dynamic", 2, 0.5]]) {
    const clip = prepareClip(getAnimation(id).clips[ci]);
    for (const t of [clip.duration * phase, clip.duration]) {
      const a = computeJoints(sampleClip(clip, t - 0.002).pose);
      const b = computeJoints(sampleClip(clip, t + 0.002).pose);
      assert.ok(a.ankleL.distanceTo(b.ankleL) < 0.01, `${id}: foot jumped across the contact boundary`);
    }
  }
});

test("free arms follow the body without delaying a planted hand or an authored endpoint", () => {
  const clip = prepareClip({ keys: [
    { t: 0, p: { armL: [0, 8, 10, 0], handR: [-0.2, 0.035, 0.3] } },
    { t: 1, e: "lin", p: { armL: [90, 8, 10, 0], handR: [-0.2, 0.035, 0.3] } },
  ] });
  const mid = sampleClip(clip, 0.5).pose;
  assert.ok(mid.armL[0] > 40 && mid.armL[0] < 45);
  assert.deepEqual(mid.handR, [-0.2, 0.035, 0.3]);
  near(sampleClip(clip, 1).pose.armL[0], 90);
  near(sampleClip(clip, 0).pose.armL[0], 0);
});

test("hands cover the wrist and plant their surfaces on the floor in kneeling and plank movements", () => {
  const figure = createFigure(), v = new Vector3();
  for (const id of ["pushup", "sideplank", "nordic", "shin", "bigtoe", "birddog"]) {
    const clip = prepareClip(getAnimation(id).clips[0]);
    for (let t = 0; t < clip.duration; t += 0.1) {
      const pose = sampleClip(clip, t).pose, J = computeJoints(pose);
      figure.update(J); figure.group.updateMatrixWorld(true);
      for (const s of ["L", "R"]) {
        const skin = figure.group.getObjectByName("human-hand-skin" + s);
        let proximal = Infinity, low = Infinity;
        for (let i = 0; i < skin.geometry.attributes.position.count; i++) {
          skin.getVertexPosition(i, v).applyMatrix4(skin.matrixWorld);
          low = Math.min(low, v.y);
          proximal = Math.min(proximal, v.sub(J["wrist" + s]).dot(J["handDir" + s]));
        }
        assert.ok(proximal < -0.005, id + ": palm begins beyond the wrist");
        if (pose["hand" + s]?.[1] <= 0.05 && J["palm" + s]?.y > 0.99) {
          const plane = pose["hand" + s][1] - 0.035;
          near(J["wrist" + s].distanceTo(new Vector3(...pose["hand" + s])), 0, 0.001);
          assert.ok(low >= plane - 0.007 && low <= plane + 0.005, id + ": hand surface misses the floor");
        }
      }
    }
  }
  figure.dispose();
});

test("skin frames keep their twist through overhead reaches", () => {
  const figure = createFigure();
  for (const id of ["chinup", "doorway"]) {
    const clip = prepareClip(getAnimation(id).clips[0]);
    let previous;
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      figure.update(computeJoints(sampleClip(clip, t).pose)); figure.group.updateMatrixWorld(true);
      const current = ["L", "R"].flatMap((s) => [0, 2].map((i) => figure.group.getObjectByName("human-arm" + s).skeleton.bones[i].getWorldQuaternion(new Quaternion())));
      if (previous) current.forEach((q, i) => assert.ok(q.angleTo(previous[i]) < 0.35, id + ": skin flipped around the bone"));
      previous = current;
    }
  }
  figure.dispose();
});

test("side planks and burpees turn their wrists continuously, and thread-the-needle opens the reaching hand", () => {
  for (const [id, ci] of [["sideplank", 0], ["indoorhiit", 4]]) {
    const clip = prepareClip(getAnimation(id).clips[ci]);
    let previous;
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      const J = computeJoints(sampleClip(clip, t).pose);
      if (previous) for (const s of ["L", "R"]) {
        if (J["wrist" + s].distanceTo(previous["wrist" + s]) < 0.05) assert.ok(J["handRef" + s].dot(previous["handRef" + s]) > 0.95, id + ": palm flipped");
      }
      previous = J;
    }
  }
  const thread = prepareClip(getAnimation("thread").clips[0]);
  const J = computeJoints(sampleClip(thread, 5.3).pose);
  assert.ok(J.handDirR.dot(J.foreDirR) > 0.95, "raised hand is bent back at the wrist");
});

test("pull-ups clear the bar and jumping jacks travel through the airborne part of each hop", () => {
  const figure = createFigure();
  for (const raw of getAnimation("chinup").clips) {
    const J = computeJoints(sampleClip(prepareClip(raw), 2).pose);
    figure.update(J); figure.group.updateMatrixWorld(true);
    const chin = new Vector3(0, -0.113, 0.03).applyMatrix4(figure.group.getObjectByName("head").matrixWorld);
    assert.ok(chin.y > raw.props[0].barH + 0.005, "chin does not clear the bar");
  }
  figure.dispose();
  const clip = prepareClip(getAnimation("indoorhiit").clips[3]);
  const dt = 0.001, t = clip.duration / 4;
  const a = computeJoints(sampleClip(clip, t - dt).pose), b = computeJoints(sampleClip(clip, t + dt).pose);
  assert.ok(Math.abs(b.ankleL.x - a.ankleL.x) / (2 * dt) > 0.5, "jump pauses in midair");
  assert.ok(a.toeL.y > 0.02, "airborne foot touches the floor");
});

test("forehead resistance keeps the palm and fingers aligned with the tilting head", () => {
  const clip = prepareClip(getAnimation("neck").clips[1]);
  for (let t = 1.2; t <= 8; t += 0.05) {
    const pose = sampleClip(clip, t).pose, J = computeJoints(pose);
    const up = new Vector3(0, 1, 0).transformDirection(J.Rh), forward = new Vector3(0, 0, 1).transformDirection(J.Rh);
    assert.ok(J.handDirL.dot(up) > 0.999 && J.handRefL.dot(forward) > 0.999);
    const target = new Vector3(0, 0.025, 0.114).applyMatrix4(J.Rh).add(J.head);
    assert.ok(J.handL.distanceTo(target) < 0.004, "palm left the forehead");
    const M = computeJoints(mirrorPose(pose));
    near(J.handDirL.x, -M.handDirR.x); near(J.handDirL.y, M.handDirR.y); near(J.handRefL.z, M.handRefR.z);
  }
});
