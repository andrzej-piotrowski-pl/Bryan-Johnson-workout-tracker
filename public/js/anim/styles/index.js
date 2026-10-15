// Loads the figure for an animation style (the list and the picker are in
// js/anim-styles.js). Each style is its own module, fetched the first time it's used.

import { createMannequin } from "../mannequin.js";

const MODULES = {
  athlete: () => import("./athlete.js"),
  anime: () => import("./anime.js"),
  lowpoly: () => import("./lowpoly.js"),
  cartoon: () => import("./cartoon.js"),
  voxel: () => import("./voxel.js"),
  pictogram: () => import("./pictogram.js"),
  ink: () => import("./ink.js"),
  ascii: () => import("./ascii.js"),
  chrome: () => import("./chrome.js"),
  synthwave: () => import("./synthwave.js"),
  blueprint: () => import("./blueprint.js"),
  stardust: () => import("./stardust.js"),
  doodle: () => import("./doodle.js"),
  googly: () => import("./googly.js"),
};

export async function loadFigure(id) {
  if (!MODULES[id]) return createMannequin();
  const mod = await MODULES[id]();
  return mod.createFigure();
}
