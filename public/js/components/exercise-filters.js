import { EXERCISES } from "../data/exercises.js";
import { EQUIPMENT_NAMES } from "./icons.js";

export function filterExercises({ query = "", category = "all", equipment = "all", muscle = "all", origin = "all", sort = "original" } = {}) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = Object.entries(EXERCISES).filter(([id, ex]) => {
    const gear = ex.equipment || [];
    const searchable = [id, ex.name, ex.cat, ...(ex.muscles || []).map((m) => m + " " + m.replace(/([a-z])([A-Z])/g, "$1 $2")), ...gear.map((g) => EQUIPMENT_NAMES[g] || g)].join(" ").toLowerCase();
    return (category === "all" || ex.cat === category)
      && (equipment === "all" || (equipment === "none" ? !gear.length : gear.includes(equipment)))
      && (muscle === "all" || (ex.muscles || []).includes(muscle))
      && (origin === "all" || (origin === "classic" ? ex.classic : origin === "video" ? (ex.bryanVideos || []).some((v) => typeof v.s === "number") : !ex.classic))
      && words.every((word) => searchable.includes(word));
  });
  const byName = (a, b) => a[1].name.localeCompare(b[1].name, "en");
  if (sort === "name") list.sort(byName);
  else if (sort === "reverse") list.sort((a, b) => byName(b, a));
  else if (sort === "category") list.sort((a, b) => a[1].cat.localeCompare(b[1].cat, "en") || byName(a, b));
  return list;
}
