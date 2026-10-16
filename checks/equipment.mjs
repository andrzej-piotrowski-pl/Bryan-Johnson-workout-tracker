// Run with node checks/equipment.mjs. No server or personal data is used.
import assert from "node:assert/strict";
import { equipmentUrl, RECOMMENDED_EQUIPMENT } from "../public/js/data/equipment.js";
import { getAnimation } from "../public/js/anim/clips/index.js";
import { joints } from "../public/js/anim/poses.js";
import { ANIM_STYLES, animStyleById } from "../public/js/anim-styles.js";
import { defaultProfile, migrateProfile } from "../public/js/personalize.js";

const old = { level: "new", settings: { animStyle: "chrome", sound: false }, addons: { posture: true } };
assert.equal(migrateProfile(old), true);
assert.deepEqual(old, { level: "new", settings: { animStyle: "athlete", sound: false }, addons: { posture: true } });
assert.equal(migrateProfile(old), false);
assert.equal(animStyleById("chrome").id, "athlete");
assert.equal(ANIM_STYLES.some((s) => s.id === "chrome"), false);
assert.equal(getAnimation("pushup").clips.length, 1);
assert.deepEqual(defaultProfile().equipment, []);
assert.equal(getAnimation("stepup").clips[0].props[0].type, "step");
assert.equal(getAnimation("poliquin").clips[0].props.length, 1);
assert.equal(RECOMMENDED_EQUIPMENT.filter((g) => g.category === "Massage").length, 2);

const step = getAnimation("stepup").clips[0];
const onTop = joints(step.keys.find((k) => k.t === 2.4).p);
for (const point of ["heelL", "ballL", "heelR", "ballR"]) {
  assert(Math.abs(onTop[point].y - step.props[0].h) < 0.001, `${point} must rest on the low step`);
}
const landing = joints(step.keys.find((k) => k.t === 4.5).p);
assert(Math.abs(landing.ballR.y) < 0.001, "The descending foot must land on the floor");
const poliquin = getAnimation("poliquin").clips[0];
assert(Math.abs(joints(poliquin.keys.find((k) => k.t === 3.1).p).heelR.y) < 0.001, "Poliquin heel tap must meet the floor");

assert.equal(equipmentUrl("https://example.com/equipment?q=1"), "https://example.com/equipment?q=1");
for (const value of ["javascript:alert(1)", "data:text/html,hi", "file:///tmp/private", "//example.com", "https://user:secret@example.com", "broken", ""]) {
  assert.equal(equipmentUrl(value), "", value);
}
console.log("Optional equipment, profile compatibility, chrome migration, safe links and step foot contact passed.");
