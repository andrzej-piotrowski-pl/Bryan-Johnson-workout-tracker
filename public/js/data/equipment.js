// Optional personal inventory and compact home equipment recommendations.
import { EQUIPMENT } from "./program.js";

export const EQUIPMENT_CATEGORIES = ["Strength", "Mobility & floor work", "Cardio & monitoring", "Massage", "Other"];

export const RECOMMENDED_EQUIPMENT = [
  ...[...EQUIPMENT.have, ...EQUIPMENT.add].map((g) => ({
    type: g.icon, name: g.i, description: g.d,
    category: ["mat", "slant", "step"].includes(g.icon) ? "Mobility & floor work" : "Strength",
  })),
  { type: "handles", name: "Push-up handles", category: "Strength", description: "Optional accessory. The plan keeps its existing push-ups; no handle-specific exercise or extra sets." },
  { type: "gripper", name: "Adjustable hand gripper", category: "Strength", description: "Optional extra. Carries and hangs already train grip; no extra gripper sets are prescribed by this plan." },
  { type: "rope", name: "Skipping rope", category: "Cardio & monitoring", description: "Optional accessory. No rope drills or additional cardio are prescribed by this plan." },
  { type: "hr", name: "Heart-rate chest strap", category: "Cardio & monitoring", description: "Read heart rate in your strap's compatible app, then log it here. No automatic connection." },
  { type: "massagegun", name: "Massage gun", category: "Massage", description: "Optional comfort and recovery equipment, outside Bryan's exercise prescription. Follow its manual." },
  { type: "footmassager", name: "Foot massager", category: "Massage", description: "Optional comfort equipment, outside Bryan's exercise prescription. Follow its manual." },
];

export function equipmentUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}
