// Run with node checks/activity.mjs. All logs below are temporary in-memory fixtures.
import assert from "node:assert/strict";
import { PROGRESS_RANGES, inProgressRange, progressBeginning, progressRange } from "../public/js/progress-ranges.js";
import { weekStats } from "../public/js/plan.js";
import { state } from "../public/js/store.js";

const profile = { startDate: "2020-01-01" };
const range = (id, today = "2026-10-16") => progressRange(id, profile, {}, today);
const bounds = (r) => [r.start, r.end];
assert.deepEqual(bounds(range("this-week")), ["2026-10-12", "2026-10-16"]);
assert.deepEqual(bounds(range("last-week")), ["2026-10-05", "2026-10-11"]);
assert.deepEqual(bounds(range("this-month")), ["2026-10-01", "2026-10-16"]);
assert.deepEqual(bounds(range("last-month")), ["2026-09-01", "2026-09-30"]);
assert.deepEqual(bounds(range("last-week", "2026-01-01")), ["2025-12-22", "2025-12-28"]);
assert.deepEqual(bounds(range("last-month", "2026-01-01")), ["2025-12-01", "2025-12-31"]);
assert.deepEqual(bounds(range("last-month", "2024-03-15")), ["2024-02-01", "2024-02-29"]);
assert.deepEqual(bounds(range("last-month", "2025-03-15")), ["2025-02-01", "2025-02-28"]);
assert.deepEqual(bounds(range("8w")), ["2026-08-24", "2026-10-16"]);
assert.deepEqual(bounds(range("12w")), ["2026-07-27", "2026-10-16"]);
assert.deepEqual(bounds(range("6m", "2024-08-31")), ["2024-03-01", "2024-08-31"]);
assert.deepEqual(bounds(range("1y", "2024-02-29")), ["2023-03-01", "2024-02-29"]);
assert.deepEqual(bounds(range("unknown")), bounds(range("12w")));
assert.equal(new Set(PROGRESS_RANGES.map((r) => r.id)).size, 9);
assert.equal(progressBeginning({ startDate: "2026-09-01" }, { "2025-12-20": {}, "2027-01-01": {} }, "2026-10-16"), "2025-12-20");
assert.equal(progressBeginning({ startDate: "2027-01-01" }, {}, "2026-10-16"), "2026-10-16");
assert.deepEqual(bounds(progressRange("all", {}, {}, "2026-10-16")), ["2026-10-16", "2026-10-16"]);
assert.deepEqual(bounds(progressRange("12w", { startDate: "2026-10-14" }, {}, "2026-10-16")), ["2026-10-14", "2026-10-16"]);
const lastMonth = range("last-month");
assert(inProgressRange("2026-09-01", lastMonth));
assert(inProgressRange("2026-09-30", lastMonth));
assert(!inProgressRange("2026-08-31", lastMonth));
assert(!inProgressRange("2026-10-01", lastMonth));

state.days = Object.fromEntries(["2026-09-28", "2026-09-30", "2026-10-01", "2026-10-04"].map((date, i) => [date, {
  date, status: "done", items: {}, addons: {}, extras: [{ min: 10 * (i + 1), intensity: "zone2" }],
}]));
assert.equal(weekStats("2026-09-28").sessions, 4);
assert.equal(weekStats("2026-09-28").zone2, 100);
assert.equal(weekStats("2026-09-28", { from: "2026-10-01", to: "2026-10-02" }).sessions, 1);
assert.equal(weekStats("2026-09-28", { from: "2026-10-01", to: "2026-10-02" }).zone2, 30);
assert.equal(weekStats("2026-09-28", { from: "2026-09-01", to: "2026-09-30" }).zone2, 30);
assert.equal(weekStats("2026-09-28", { from: "2026-10-05" }).sessions, 0);
console.log("Calendar boundaries, leap years, inclusive ranges, imported history and partial-week totals passed.");
