// Run with node checks/cardio.mjs; fixtures stay in memory.
import assert from "node:assert/strict";
import { DAYS } from "../public/js/data/program.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { getAnimation } from "../public/js/anim/clips/index.js";
import { LEVELS } from "../public/js/personalize.js";
import { blockItems, dayLoad, dayMins, rxFor } from "../public/js/plan.js";

const completed = (day, level) => ({
  session: day.key, level: LEVELS[level].id,
  items: Object.fromEntries(day.blocks.flatMap((b) => blockItems(b, level)).map((it) => [it.id, { done: true }])),
});
for (const [level] of LEVELS.entries()) {
  let zone2 = 0, hard = 0;
  for (const day of DAYS) {
    const log = completed(day, level);
    const before = JSON.stringify(log);
    const load = dayLoad(log);
    hard += load.hard;
    assert.equal(JSON.stringify(log), before, "Reading a log must not rewrite it");
    for (const block of day.blocks) {
      const items = blockItems(block, level);
      if (block.name === "Zone 2") {
        const minutes = items.reduce((sum, it) => sum + Number(/^\d+/.exec(rxFor(it, level))[0]), 0);
        assert.equal(minutes, block.mins[level]);
        zone2 += minutes;
      }
      for (const it of items) {
        assert(EXERCISES[it.ex] && getAnimation(it.ex), `Exercise and animation exist: ${it.ex}`);
      }
    }
  }
  assert.equal(zone2, [60, 90, 120, 150][level]);
  assert.equal(hard, [0, 26, 51, 75][level]);
  assert.equal(dayMins(DAYS[6], level), 0, "Sunday stays a rest day");
}
const thu = { session: "thu", level: "trained", items: {
  "thu-warm-up-zone2": { done: true, cardio: { min: 8 } },
  "thu-cool-down-zone2": { done: true },
  "thu-norwegian-4-4-norwegian": { done: true, rounds: 4 },
  "thu-vigorous-cardio": { done: true, cardio: { min: 11 } },
} };
assert.deepEqual(dayLoad(thu), { zone2: 9, hard: 27, extra: 0 });
thu.items["thu-vigorous-cardio"].cardio.min = 0;
assert.equal(dayLoad(thu).hard, 16, "Explicit zero minutes must stay zero");
thu.items["thu-vigorous-cardio"].cardio.min = null;
assert.equal(dayLoad(thu).hard, 34, "Missing minutes on a completed block use its dose");
thu.skip = true;
assert.deepEqual(dayLoad(thu), { zone2: 0, hard: 0, extra: 0 });
const old = { session: "mon", phase: 2, items: { "mon-zone-2-zone2": { done: true } } };
assert.deepEqual(dayLoad(old), { zone2: 10, hard: 0, extra: 0 }, "Old phase logs keep their original dose");
console.log("All four cardio doses, scheduled minutes, actual logs, recovery, explicit zero, old logs and animations passed.");
