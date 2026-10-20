import assert from "node:assert/strict";
import test from "node:test";
import { Stage } from "../public/js/anim/stage.js";

test("loading a movement after an empty viewer starts its animation loop", () => {
  let loop;
  const stage = Object.assign(Object.create(Stage.prototype), {
    playing: true, visible: true, clips: [],
    renderer: { setAnimationLoop: (callback) => { loop = callback; } },
    applyClip() {}, syncStyle() {}, render() {},
  });
  stage.updateLoop();
  assert.equal(loop, null);
  assert.equal(stage.load("highknees"), true);
  assert.equal(typeof loop, "function");
  assert.ok(Number.isFinite(stage.lastNow));
  stage.pause();
  stage.load("marching");
  assert.equal(stage.playing, false);
  assert.equal(loop, null);
});
