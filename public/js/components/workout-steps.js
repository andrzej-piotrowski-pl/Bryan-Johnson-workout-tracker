import { dose, rxFor } from "../plan.js";
import { parseRx } from "./logger.js";

// Keep each set in its own log row while alternating paired exercises.
export function orderedSteps(items, level) {
  const steps = [];
  const used = new Set();
  for (const item of items) {
    if (used.has(item.id)) continue;
    const pair = dose(item.pair, level);
    if (!pair) { steps.push({ item }); continue; }
    const members = items.filter((it) => dose(it.pair, level) === pair);
    const counts = members.map((it) => parseRx(rxFor(it, level)).sets);
    const rounds = Math.max(...counts);
    for (let round = 0; round < rounds; round++) for (let index = 0; index < members.length; index++) {
      if (round < counts[index]) steps.push({ item: members[index], setIndex: round, sets: counts[index], round: round + 1, rounds });
    }
    members.forEach((it) => used.add(it.id));
  }
  return steps;
}
