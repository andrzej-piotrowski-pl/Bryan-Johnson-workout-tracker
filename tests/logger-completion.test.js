import assert from "node:assert/strict";
import test from "node:test";
import { renderLogger } from "../public/js/components/logger.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { defaultProfile } from "../public/js/personalize.js";
import { flushNow, state } from "../public/js/store.js";

test("guided logging preserves completion while Today keeps automatic completion", () => {
  state.mode = "local";
  state.profile = defaultProfile();
  const item = { id: "interval-test", ex: "shortint", rx: ["4 × (20 s brisk / 40 s easy)"] };
  for (const manualCompletion of [true, false]) {
    state.days = {};
    const events = {};
    const container = { innerHTML: "", addEventListener: (name, fn) => { events[name] = fn; }, querySelector: () => null };
    renderLogger(container, { date: "2026-10-20", item, ex: EXERCISES.shortint, level: 0, manualCompletion });
    assert.equal(container.innerHTML.includes('data-l="done"'), !manualCompletion);
    events.input({ target: { dataset: { r: "rounds" }, value: "2" } });
    const log = state.days["2026-10-20"].items[item.id];
    assert.equal(log.rounds, 2);
    assert.equal(log.done, !manualCompletion);
    if (manualCompletion) {
      log.done = false; log.skipped = true;
      events.input({ target: { dataset: { r: "rounds" }, value: "3" } });
      assert.equal(state.days["2026-10-20"].items[item.id].skipped, true);
      assert.equal(state.days["2026-10-20"].items[item.id].done, false);
    }
    flushNow();
  }
});
