// The timer and movement list share the same order and round boundaries.
export const INTERVAL_MOVES = ["highknees", "faststep", "climbers", "jacks", "burpee"];
export const DYNAMIC_MOVES = ["armcircles", "legswingfront", "legswingside", "highknees", "laterallunge", "hipcars", "lungetwist"];

export function intervalPhases(exId, preset, moves = ["highknees"]) {
  const phases = [{ kind: "ready", label: "Get ready", sec: 10, sub: "First round starts soon" }];
  const choices = (Array.isArray(moves) ? moves : []).filter((id) => INTERVAL_MOVES.includes(id));
  if (!choices.length) choices.push("highknees");
  const total = preset.rounds * (preset.blocks || 1);
  for (let block = 0; block < (preset.blocks || 1); block++) {
    for (let round = 0; round < preset.rounds; round++) {
      const number = block * preset.rounds + round + 1;
      let remaining = preset.work;
      const workMoves = exId === "norwegian" ? ["faststep", "highknees", "jacks", "climbers"] : [choices[(number - 1) % choices.length]];
      let index = 0;
      while (remaining > 0) {
        const sec = exId === "norwegian" ? Math.min(60, remaining) : remaining;
        remaining -= sec;
        phases.push({ kind: "work", ex: workMoves[index % workMoves.length], sec, round: number, total, roundEnd: remaining === 0, label: `Round ${number} of ${total}`, sub: "Follow today's work pace and heart-rate target" });
        index++;
      }
      if (round < preset.rounds - 1) phases.push({ kind: "rest", ex: "marching", sec: preset.rest, round: number, total, label: "Easy marching", sub: `Recover before round ${number + 1} of ${total}` });
    }
    if (block < (preset.blocks || 1) - 1) phases.push({ kind: "rest", ex: "marching", sec: preset.blockRest || 180, label: "Block recovery", sub: "March gently and breathe" });
  }
  return phases;
}
