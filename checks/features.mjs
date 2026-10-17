// Run with node checks/features.mjs. All logs below are temporary in-memory fixtures.
import assert from "node:assert/strict";
import { EXERCISES } from "../public/js/data/exercises.js";
import { ADDONS } from "../public/js/data/addons/index.js";
import { defaultProfile } from "../public/js/personalize.js";
import { state } from "../public/js/store.js";
import { addonsForDate, currentReadiness } from "../public/js/plan.js";
import { nextTimeRecommendation } from "../public/js/components/logger.js";
import { levelCheckHtml } from "../public/js/components/level-check.js";
import { weekTargets } from "../public/js/week-targets.js";
import { deskState, deskStreak, pauseDesk, resumeDesk, snoozeDesk, startDesk, stopDesk } from "../public/js/components/desk.js";

const baseProfile = () => ({ ...defaultProfile(), level: "returning", weightKg: 75, sex: "male", age: 38, units: "metric", maxDumbbellKg: 24 });

const item = (id, ex, rx) => ({ id, ex, rx });

// ---------- next-time progression ----------
state.profile = baseProfile();
const goblet = item("mon-strength-gobletsquat", "gobletsquat", ["2 × 8 @ {kg:7-10}", "2 × 10 @ {kg:10-14}", "3 × 8–10 @ {kg:16-24}", "3 × 6–8, heaviest dumbbell, 3 s down"]);
const top = (reps, kg, n = 2) => Array.from({ length: n }, () => ({ reps, kg }));
state.days = {
  "2026-10-08": { date: "2026-10-08", level: "returning", status: "done", items: { "mon-strength-gobletsquat": { ex: "gobletsquat", done: true, sets: top(10, 12) } }, addons: {} },
  "2026-10-10": { date: "2026-10-10", level: "returning", status: "done", items: { "mon-strength-gobletsquat": { ex: "gobletsquat", done: true, sets: top(10, 12) } }, addons: {} },
};
const add = nextTimeRecommendation({ item: goblet, ex: EXERCISES.gobletsquat, level: 1, date: "2026-10-17" });
assert.equal(add.kind, "add");
assert.equal(add.kg, 14, "Legs add about 2 kg per dumbbell");

state.days["2026-10-10"].items["mon-strength-gobletsquat"].sets = top(8, 12);
const repeat = nextTimeRecommendation({ item: goblet, ex: EXERCISES.gobletsquat, level: 1, date: "2026-10-17" });
assert.equal(repeat.kind, "repeat");
assert.equal(repeat.kg, 12);
assert.match(repeat.text, /0 of 2 sessions at the top/, "The rule shows progress toward the two-session rule");
state.days["2026-10-10"].items["mon-strength-gobletsquat"].sets = top(10, 12);
state.days["2026-10-08"].items["mon-strength-gobletsquat"].sets = top(8, 12);
const oneOfTwo = nextTimeRecommendation({ item: goblet, ex: EXERCISES.gobletsquat, level: 1, date: "2026-10-17" });
assert.equal(oneOfTwo.kind, "repeat");
assert.match(oneOfTwo.text, /1 of 2 sessions at the top/, "One session at the top is shown as 1 of 2");
state.days["2026-10-08"].items["mon-strength-gobletsquat"].sets = top(10, 12);

state.days["2026-10-10"].items["mon-strength-gobletsquat"].sets = top(10, 12);
state.days["2026-10-10"].items["mon-strength-gobletsquat"].holdProgress = true;
const paused = nextTimeRecommendation({ item: goblet, ex: EXERCISES.gobletsquat, level: 1, date: "2026-10-17" });
assert.equal(paused.kind, "repeat");
assert.match(paused.text, /paused/i);
delete state.days["2026-10-10"].items["mon-strength-gobletsquat"].holdProgress;

// Bodyweight reps and holds follow the same two-session rule.
const pushup = item("mon-strength-pushup", "pushup", ["2 × 6–8, hands on a table or a wall", "3 × 8–10, hands raised if needed", "3 × 10–12", "3 × 12–15, 3 s down, or feet raised"]);
state.days["2026-10-08"].items["mon-strength-pushup"] = { ex: "pushup", done: true, sets: top(10, 0, 3) };
state.days["2026-10-10"].items["mon-strength-pushup"] = { ex: "pushup", done: true, sets: top(10, 0, 3) };
assert.equal(nextTimeRecommendation({ item: pushup, ex: EXERCISES.pushup, level: 1, date: "2026-10-17" }).reps, 11);

const plank = item("mon-core-knees-plank", "plank", ["2 × 15–20 s, knees down is fine", "2 × 20–30 s", "3 × 30 s", "3 × 45 s"]);
state.days["2026-10-08"].items["mon-core-knees-plank"] = { ex: "plank", done: true, sets: [{ sec: 30 }, { sec: 30 }] };
state.days["2026-10-10"].items["mon-core-knees-plank"] = { ex: "plank", done: true, sets: [{ sec: 30 }, { sec: 30 }] };
assert.equal(nextTimeRecommendation({ item: plank, ex: EXERCISES.plank, level: 1, date: "2026-10-17" }).seconds, 35);

// The heaviest dumbbell caps the jump and asks for a rep instead.
state.profile.maxDumbbellKg = 13;
const capped = nextTimeRecommendation({ item: goblet, ex: EXERCISES.gobletsquat, level: 1, date: "2026-10-17" });
assert.equal(capped.kg, 13);
assert.match(capped.text, /heaviest/);
state.profile.maxDumbbellKg = 24;

// Sessions logged at another level do not count toward the new level's rule.
state.days["2026-10-12"] = { date: "2026-10-12", level: "active", status: "done", items: { "mon-strength-gobletsquat": { ex: "gobletsquat", done: true, sets: top(8, 20) } }, addons: {} };
const levelReset = nextTimeRecommendation({ item: goblet, ex: EXERCISES.gobletsquat, level: 1, date: "2026-10-17" });
assert.equal(levelReset.kind, "add", "A newer session at another level is ignored for the Returning rule");
assert.equal(levelReset.kg, 14);
delete state.days["2026-10-12"];

// Cardio and check exercises get no progression line.
assert.equal(nextTimeRecommendation({ item: item("x", "zone2", ["5 min @ {hr:60-70}", "10 min", "15 min", "25 min"]), ex: EXERCISES.zone2, level: 1, date: "2026-10-17" }), null);
assert.equal(nextTimeRecommendation({ item: item("y", "dynamic", ["4 min", "4 min", "4 min", "4 min"]), ex: EXERCISES.dynamic, level: 1, date: "2026-10-17" }), null);

// ---------- week targets ----------
state.profile = { ...baseProfile(), addons: { posture: true } };
const done = (ex) => ({ ex, done: true });
state.days = {
  "2026-10-12": {
    date: "2026-10-12", level: "returning", status: "done",
    items: {
      "mon-warm-up-pogo": done("pogo"),
      "mon-warm-up-balance": done("balance"),
      "mon-strength-gobletsquat": { ex: "gobletsquat", done: true, sets: top(10, 12) },
      "mon-core-knees-plank": { ex: "plank", done: true, sets: [{ sec: 30 }, { sec: 30 }] },
      "mon-zone-2-topup": { ex: "zone2", done: true, cardio: { min: 10 } },
      "mon-cool-down-couch": done("couch"),
    },
    addons: { posture: { items: { "posture-string": done("string") } } },
  },
  "2026-10-13": {
    date: "2026-10-13", level: "returning", status: "done",
    items: {
      "tue-vigorous-cardio": { ex: "vigorous", done: true, cardio: { min: 6 } },
      "tue-zone-2-zone2": { ex: "zone2", done: true, cardio: { min: 20 } },
      "tue-back-core-pallof": done("pallof"),
      "tue-cool-down-hamstring": done("hamstring"),
    },
    addons: {},
  },
  "2026-10-14": {
    date: "2026-10-14", level: "returning", status: "done",
    items: {
      "wed-dynamic-mobility-thread": done("thread"),
      "wed-beginner-yoga-balance-tree": done("tree"),
      "wed-static-stretching-couch": done("couch"),
    },
    addons: { posture: { items: { "posture-string": done("string") } } },
  },
  "2026-10-16": {
    date: "2026-10-16", level: "returning", status: "done",
    items: {
      "fri-speed-power-heidens": done("heidens"),
      "fri-strength-rdl": { ex: "rdl", done: true, sets: top(8, 12, 3) },
      "fri-side-plank-tendons-sideplank": { ex: "sideplank", done: true, sets: [{ sec: 30 }, { sec: 30 }] },
      "fri-cool-down-butterfly": done("butterfly"),
    },
    addons: {},
  },
};
const wt = weekTargets("2026-10-12");
const byId = Object.fromEntries(wt.targets.map((t) => [t.id, t]));
assert.equal(byId.strength.value, 3, "Mon, Wed and Fri count as strength");
assert.equal(byId.zone2.value, 30, "Zone 2 minutes add up");
assert.equal(byId.hard.value, 6, "Vigorous minutes count as hard cardio");
assert.equal(byId.zone2.target, 90, "Returning targets 90 Zone 2 minutes");
assert.equal(byId.hard.target, 26, "Returning targets 26 hard minutes");
const fullWt = weekTargets("2026-10-12", { level: 3 });
assert.equal(fullWt.targets.find((t) => t.id === "zone2").target, 150, "Well trained targets 150 Zone 2 minutes");
assert.equal(fullWt.targets.find((t) => t.id === "hard").target, 75, "Well trained targets 75 hard minutes");
const newWt = weekTargets("2026-10-12", { level: 0 });
assert.equal(newWt.targets.find((t) => t.id === "zone2").target, 60, "New to training targets 60 Zone 2 minutes");
assert.equal(newWt.targets.find((t) => t.id === "hard").target, 0, "New to training has no hard-cardio target");
assert.equal(newWt.targets.find((t) => t.id === "hard").met, true, "A zero target is met by doing none");
assert.equal(byId.jumps.value, 2, "Pogo hops and Heidens are jump days");
assert.deepEqual(byId.balance.value, 4, "Balance, stability, tree pose and side plank count");
assert.equal(byId.mobility.value, 4, "Stretch and mobility days count");
assert.equal(byId.posture.value, 2, "Only posture add-on items count");
assert.equal(wt.total, 7);
assert.equal(wt.allMet, false);
state.profile.addons.posture = false;
assert.equal(weekTargets("2026-10-12").targets.some((t) => t.id === "posture"), false);

// ---------- level readiness ----------
state.profile = { ...baseProfile(), addons: {} };
state.days = {};
let rd = currentReadiness();
assert.equal(rd.target, 12);
assert.equal(rd.ready, false);
for (let i = 0; i < 12; i++) {
  const date = `2026-09-${String(i + 1).padStart(2, "0")}`;
  state.days[date] = { date, level: "returning", status: "done", items: {}, addons: {} };
}
rd = currentReadiness();
assert.equal(rd.sessions, 12);
assert.equal(rd.ready, false, "Checkpoints still need ticking");
const waiting = levelCheckHtml();
assert.match(waiting, /The plan's two checks/);
assert.match(waiting, /about 2 weeks/, "The checkpoint shows the plan's weeks as well as sessions");
assert.match(waiting, /Move up to Active/);
assert.match(waiting, /data-level-up="active"[^>]*disabled/, "Waiting button is disabled");
assert.doesNotMatch(waiting, /Ready for Active/);
state.profile.levelCheck = { level: "returning", checks: { "top-range": true, recovered: true } };
rd = currentReadiness();
assert.equal(rd.ready, true);
const ready = levelCheckHtml();
assert.match(ready, /Ready for Active/);
assert.doesNotMatch(ready, /data-level-up="active"[^>]*disabled/, "Ready button is enabled");
state.profile.level = "trained";
assert.equal(currentReadiness(), null, "Well trained is the full plan");
assert.match(levelCheckHtml(), /full plan/);

// Desk breaks, bone protocol and dead hang & grip are registered add-ons.
assert(ADDONS.some((a) => a.id === "desk"), "Desk breaks is a registered add-on");
assert(ADDONS.some((a) => a.id === "bone"), "Bone density protocol is a registered add-on");
assert(ADDONS.some((a) => a.id === "hang"), "Dead hang & grip is a registered add-on");
state.profile = { ...baseProfile(), addons: { posture: true, desk: true, bone: true, hang: true } };
assert(addonsForDate("2026-10-17").some((a) => a.addon.id === "desk"), "Desk breaks appears when enabled");
assert(addonsForDate("2026-10-17").some((a) => a.addon.id === "bone"), "Bone density appears when enabled");
assert(addonsForDate("2026-10-17").some((a) => a.addon.id === "hang"), "Dead hang & grip appears when enabled");
state.profile.addons.desk = false;
assert(!addonsForDate("2026-10-17").some((a) => a.addon.id === "desk"), "Desk breaks stays off until enabled");

// ---------- desk streak, snooze and workout pause ----------
state.days = {
  "2026-10-15": { date: "2026-10-15", desk: { move: 2, squats: 0 } },
  "2026-10-16": { date: "2026-10-16", desk: { move: 1, squats: 1 } },
  "2026-10-17": { date: "2026-10-17", desk: { move: 3, squats: 0 } },
};
assert.equal(deskStreak("2026-10-17"), 3);
assert.equal(deskStreak("2026-10-18"), 3, "A day with no breaks yet keeps yesterday's streak");
state.days["2026-10-16"].desk = { move: 0, squats: 0 };
assert.equal(deskStreak("2026-10-17"), 1);

state.profile = { ...baseProfile(), settings: { sound: false } };
startDesk();
assert.equal(deskState().running, true);
assert.equal(deskState().paused, false);
pauseDesk("test");
assert.equal(deskState().paused, true, "A workout pause freezes the countdowns");
resumeDesk("test");
assert.equal(deskState().paused, false, "The countdowns resume when the pause reason ends");
snoozeDesk("move");
assert(deskState().nextMoveIn <= 300 && deskState().nextMoveIn > 280, "Snooze returns in about 5 minutes");
stopDesk();
assert.equal(deskState().running, false);

console.log("Progression rules, week scoreboard, level readiness and desk streaks passed.");
