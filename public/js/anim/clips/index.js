// Registry of all exercise animations, keyed by exercise id.
import warmup from "./warmup.js";
import power from "./power.js";
import legs from "./legs.js";
import upper from "./upper.js";
import core from "./core.js";
import stability from "./stability.js";
import cardio from "./cardio.js";
import mobility from "./mobility.js";
import posture from "./posture.js";

const ALL = { ...warmup, ...power, ...legs, ...upper, ...core, ...stability, ...cardio, ...mobility, ...posture };
ALL.vigorous = cardio.zone2;

export function getAnimation(id) {
  return ALL[id] || null;
}

export function animationIds() {
  return Object.keys(ALL);
}
