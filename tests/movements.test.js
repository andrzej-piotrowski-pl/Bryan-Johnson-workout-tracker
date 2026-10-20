import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES } from "../public/js/data/exercises.js";
import { MOVEMENTS } from "../public/js/data/movements.js";
import { DAYS } from "../public/js/data/program.js";
import { ADDONS } from "../public/js/data/addons/index.js";
import { intervalPhases } from "../public/js/data/routines.js";
import { getAnimation } from "../public/js/anim/clips/index.js";
import { filterExercises } from "../public/js/components/exercise-filters.js";
import { orderedSteps } from "../public/js/components/workout-steps.js";
import { performanceHistory } from "../public/js/components/logger.js";
import { blockItems, dayLoad, itemLog, liftHistory, progressOf, sessionItems, timerPresets } from "../public/js/plan.js";
import { state } from "../public/js/store.js";

import { routineHtml, routineSteps } from "../public/js/components/routine.js";

const day = (key) => DAYS.find((d) => d.key === key);

test("the library lists each movement with only its own animation and videos", () => {
  const entries = filterExercises();
  for (const [id] of entries) {
    assert.ok(!EXERCISES[id].hidden);
    assert.equal(getAnimation(id).clips.length, 1, id);
  }
  for (const id of Object.keys(MOVEMENTS)) {
    assert.ok(entries.some(([key]) => key === id), id);
    assert.ok(EXERCISES[id].videos.length > 0, id);
    assert.ok(EXERCISES[id].how.length > 0, id);
  }
  assert.ok(!entries.some(([id]) => ["dynamic", "calf", "chinup", "norwegian"].includes(id)));
  assert.ok(filterExercises({ query: "dynamic arm" }).some(([id]) => id === "armcircles"));
});

test("warm-ups contain only the day's individual movements, once through", () => {
  const movements = (key) => day(key).blocks.flatMap((b) => b.items).filter((it) => it.legacyEx === "dynamic").map((it) => it.ex);
  assert.deepEqual(movements("mon"), ["armcircles", "legswingfront", "legswingside", "highknees", "laterallunge", "hipcars", "lungetwist"]);
  assert.deepEqual(movements("wed"), ["armcircles", "hipcars"]);
  assert.deepEqual(movements("thu"), ["legswingfront", "legswingside", "hipcars"]);
  assert.deepEqual(movements("sat"), ["marching", "legswingfront", "legswingside", "hipcars"]);
  for (const d of DAYS) {
    const ids = d.blocks.flatMap((b) => b.items).map((it) => it.id);
    assert.equal(new Set(ids).size, ids.length, d.key);
    for (let level = 0; level < 4; level++) for (const item of sessionItems(d, level)) assert.ok(!EXERCISES[item.ex].hidden || EXERCISES[item.ex].log === "intervals", item.ex);
  }
});

test("alternatives select the prescribed movement without adding sets", () => {
  const exercises = (key, level) => sessionItems(day(key), level).map((it) => it.ex);
  assert.ok(exercises("mon", 1).includes("snapdown"));
  assert.ok(!exercises("mon", 1).includes("squatjump"));
  assert.ok(exercises("mon", 2).includes("squatjump"));
  assert.ok(exercises("mon", 3).includes("cmjump"));
  assert.ok(exercises("mon", 0).includes("calfseated"));
  assert.ok(exercises("fri", 0).includes("calfsingle"));
  assert.ok(exercises("wed", 1).includes("pullup"));
  assert.ok(exercises("fri", 1).includes("chinuppalms"));
  assert.ok(!exercises("fri", 0).includes("chinuppalms"));
  assert.ok(exercises("fri", 0).includes("hangpassive"));
  const hang = sessionItems(day("wed"), 0).find((it) => it.ex === "hangpassive");
  assert.ok(!hang.rx[0].includes("or"));
  assert.equal(hang.alternative.ex, "pullup");
  assert.equal(hang.alternative.rx[0], "2 × 3 band-assisted");
});

test("paired work alternates actual set rows and preserves uneven set counts", () => {
  const strength = day("fri").blocks.find((b) => b.name === "Strength");
  const steps = orderedSteps(blockItems(strength, 3), 3);
  assert.deepEqual(steps.slice(0, 6).map((step) => [step.item.ex, step.setIndex]), [["rdl", 0], ["cmjump", 0], ["rdl", 1], ["cmjump", 1], ["rdl", 2], ["cmjump", 2]]);
  assert.ok(!orderedSteps(blockItems(strength, 2), 2).some((step) => step.item.ex === "cmjump"));
  const mon = day("mon").blocks.find((b) => b.name === "Strength");
  assert.deepEqual(orderedSteps(blockItems(mon, 1), 1).filter((step) => step.item.pair).map((step) => step.item.ex), ["pushup", "row", "pushup", "row", "pushup"]);
  const hang = ADDONS.find((a) => a.id === "hang").variants.daily.items;
  assert.deepEqual(orderedSteps(hang.filter((it) => it.pair), 3).map((step) => step.item.ex), ["hangpassive", "hangactive", "hangpassive"]);
});

test("interval movement phases preserve every preset's work, recovery and completed-round counts", () => {
  for (const key of ["tue", "thu"]) for (let level = 0; level < 4; level++) {
    const item = sessionItems(day(key), level).find((it) => it.timer);
    for (const preset of timerPresets(item, level)) {
      const phases = intervalPhases(item.ex, preset);
      const work = phases.filter((p) => p.kind === "work");
      const rounds = preset.rounds * (preset.blocks || 1);
      assert.equal(work.reduce((n, p) => n + p.sec, 0), rounds * preset.work);
      assert.equal(work.filter((p) => p.roundEnd).length, rounds);
      assert.equal(phases.filter((p) => p.kind === "rest").reduce((n, p) => n + p.sec, 0), (preset.rounds - 1) * (preset.blocks || 1) * preset.rest + ((preset.blocks || 1) - 1) * (preset.blockRest || 180));
      if (item.ex === "norwegian") assert.deepEqual(work.filter((p) => p.round === 1).map((p) => p.ex), ["faststep", "highknees", "jacks", "climbers"].slice(0, preset.work / 60));
    }
  }
  assert.equal(intervalPhases("shortint", { rounds: 1, work: 20, rest: 40 }, "invalid")[1].ex, "highknees");
  const phases = intervalPhases("shortint", { rounds: 4, work: 20, rest: 40 }, ["faststep", "jacks"]);
  assert.deepEqual(phases.filter((p) => p.kind === "work").map((p) => p.ex), ["faststep", "jacks", "faststep", "jacks"]);
});

test("old completed sessions and individual weights remain readable without mutating saved data", () => {
  for (let level = 0; level < 4; level++) for (const d of DAYS.filter((d) => d.blocks.length)) {
    const log = { date: "2026-10-19", session: d.key, level: ["new", "returning", "active", "trained"][level], items: {} };
    for (const it of sessionItems(d, level)) log.items[it.legacyId || it.id] = { ex: it.legacyEx || it.ex, done: true };
    const before = JSON.stringify(log);
    const progress = progressOf(log);
    assert.equal(progress.done, progress.total, `${d.key}, level ${level}`);
    assert.equal(JSON.stringify(log), before);
  }
  const calf = day("mon").blocks.flatMap((b) => b.items).find((it) => it.ex === "calfseated");
  const log = { date: "2026-10-19", session: "mon", level: "returning", items: { [calf.legacyId]: { ex: "calf", done: true, sets: [{ kg: 12, reps: 15 }], note: "Old note" } } };
  assert.deepEqual(itemLog(log, "main", calf.id).sets, [{ kg: 12, reps: 15 }]);
  log.items[calf.id] = { ex: calf.ex, done: false };
  assert.equal(itemLog(log, "main", calf.id).done, false);
  delete log.items[calf.id];
  state.days = { [log.date]: log };
  assert.equal(performanceHistory("calfseated", "2026-10-20")[0].log.note, "Old note");
  assert.equal(performanceHistory("calfsingle", "2026-10-20").length, 0);
  assert.equal(liftHistory("calfseated")[0].kg, 12);
  log.items[calf.id] = { ex: calf.ex, done: true, sets: [{ kg: 14, reps: 15 }] };
  assert.equal(performanceHistory("calfseated", "2026-10-20").length, 1);
  assert.equal(liftHistory("calfseated")[0].kg, 14);
  state.days = {};
});

test("movement steps do not multiply credited cardio minutes", () => {
  const item = sessionItems(day("thu"), 3).find((it) => it.ex === "norwegian");
  const log = { date: "2026-10-22", session: "thu", level: "trained", items: { [item.id]: { ex: item.ex, rounds: 4, done: true } } };
  assert.deepEqual(dayLoad(log), { zone2: 9, hard: 16, extra: 0 });
});

test("new deadlift logs do not complete the separate jumps automatically", () => {
  const log = { items: { "fri-strength-rdl": { ex: "rdl", done: true, splitMovements: true } } };
  assert.equal(itemLog(log, "main", "fri-strength-rdl-jumps"), null);
  delete log.items["fri-strength-rdl"].splitMovements;
  assert.equal(itemLog(log, "main", "fri-strength-rdl-jumps").done, true);
});

test("compact interval rounds preserve every movement and duration in order", () => {
  for (const ex of ["shortint", "norwegian"]) {
    const item = day(ex === "shortint" ? "tue" : "thu").blocks.flatMap((b) => b.items).find((it) => it.ex === ex);
    for (let level = 0; level < 4; level++) {
      for (let preset = 0; preset < timerPresets(item, level).length; preset++) {
        const log = { preset, moves: ["highknees", "jacks"] };
        const steps = routineSteps(item, level, log);
        const html = routineHtml(item, level, log, { compact: true });
        assert.deepEqual([...html.matchAll(/data-movement="([^"]+)"/g)].map((m) => m[1]), steps.map((step) => step.ex));
        assert.deepEqual([...html.matchAll(/<span>(\d+) s<\/span>/g)].map((m) => Number(m[1])), steps.map((step) => step.sec));
        const count = timerPresets(item, level)[preset].rounds * (timerPresets(item, level)[preset].blocks || 1);
        assert.deepEqual([...html.matchAll(/<b>Round (\d+)<\/b>/g)].map((m) => Number(m[1])), Array.from({ length: count }, (_, i) => i + 1));
        assert.equal((routineHtml(item, level, log).match(/<li>/g) || []).length, steps.length);
      }
    }
  }
});
