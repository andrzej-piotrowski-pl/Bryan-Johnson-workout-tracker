// Animation styles: other ways to draw the exercise animations, on top of the
// original mannequin. Picked in Settings → Animation style or from the floating style
// bar (components/anim-bar.js). They apply to every exercise (STYLED_EXERCISES).
//
// The choice is profile.settings.animStyle; <html data-anim> carries it for the 3D
// stages, which listen for "hp:anim". The styles themselves are in js/anim/styles/.

import { esc } from "./util.js";

// after: what the style is modelled on, shown on its card. tech: how it's drawn —
// "3d" styles are three.js scenes; the others draw the same moving skeleton without
// three.js: "svg" vector shapes, "canvas" 2D canvas, "text" characters.
// fun: one of the funny ones.
export const ANIM_STYLES = [
  { id: "athlete", name: "Athlete", tech: "3d", after: "Semi-realistic, like Mixamo characters", blurb: "Skin, a T-shirt, shorts and trainers under soft studio light. The closest to a real person to copy." },
  { id: "mannequin", name: "Mannequin", tech: "3d", after: "The original", blurb: "Smooth grey figure; the muscles being worked light up. The look the app started with." },
  { id: "anime", name: "Anime", tech: "3d", after: "VRM avatars with MToon shading", blurb: "Soft cel shading with tinted shadows, a rim light, thin outlines, big eyes and spiky hair." },
  { id: "lowpoly", name: "Low poly", tech: "3d", after: "Quaternius' free game characters", blurb: "Faceted shapes and flat colours. Light to draw and very clear to read." },
  { id: "cartoon", name: "Cartoon", tech: "3d", after: "Classic cel shading with ink outlines", blurb: "Two hard tones, thick black outlines and bold colours; the worked muscles get a yellow outline." },
  { id: "voxel", name: "Voxel", tech: "3d", after: "Minecraft-style blocks", blurb: "Built from blocks with pixel-art faces and clothes, on grass, with pixel-textured props." },
  { id: "pictogram", name: "Pictogram", tech: "svg", after: "Otl Aicher's 1972 Munich Olympics pictograms", blurb: "A white sign figure on a blue tile: even bars for limbs, a floating round head, the worked muscles in orange. Drawn as SVG." },
  { id: "ink", name: "Ink brush", tech: "canvas", after: "Japanese sumi-e painting", blurb: "Brush strokes on rice paper that leave fading ink trails, an ensō circle for the head and red washes on the worked muscles. Drawn on a 2D canvas." },
  { id: "ascii", name: "ASCII", tech: "text", after: "Old green-screen terminals", blurb: "The figure typed out in characters on a glowing CRT, with a floor grid; the worked muscles in amber. Drawn as text." },
  { id: "synthwave", name: "Synthwave", tech: "canvas", after: "1980s retro-futurism", blurb: "Neon tubes on a scrolling grid under a striped sunset, mirrored on a wet floor; the worked muscles in hot pink. Drawn on a 2D canvas." },
  { id: "blueprint", name: "Blueprint", tech: "svg", after: "Engineering drawings", blurb: "A technical drawing that measures you: live knee, hip and elbow angles, centre lines, hatched muscles, steps and boxes dimensioned and a title block naming the exercise. Drawn as SVG." },
  { id: "stardust", name: "Stardust", tech: "canvas", after: "Long-exposure light painting", blurb: "A body of about 1,800 particles drifting in deep space, trailing light as they move; golden where the muscles work. Drawn on a 2D canvas." },
  { id: "doodle", name: "Doodle", tech: "svg", fun: true, after: "Margin doodles in a school notebook", blurb: "A wobbly biro stick figure on lined paper with highlighter on the worked muscles, sweat drops and opinions about every exercise. Drawn as SVG." },
  { id: "googly", name: "Googly", tech: "canvas", fun: true, after: "Felt puppets", blurb: "A fuzzy monster in huge trainers whose googly eyes rattle with real physics on every move. Drawn on a 2D canvas." },
];

// The style until you pick one.
export const DEFAULT_ANIM_STYLE = "athlete";
// What the exercises without styles show.
export const BASE_ANIM_STYLE = "mannequin";

// Which exercises take the styles: "all", or a list of exercise ids (data/exercises.js)
// to try them on a few first.
export const STYLED_EXERCISES = "all";

// The exercise the Settings preview shows first.
export const PREVIEW_EXERCISE = "zone2";

export function animStyleById(id) {
  return ANIM_STYLES.find((s) => s.id === id) || ANIM_STYLES.find((s) => s.id === DEFAULT_ANIM_STYLE);
}

export function currentAnimStyle() {
  return animStyleById(document.documentElement.dataset.anim).id;
}

export function hasAnimStyles(exId) {
  return STYLED_EXERCISES === "all" || STYLED_EXERCISES.includes(exId);
}

// The style an exercise is drawn in: the chosen one if the exercise takes styles.
export function animStyleFor(exId, styleId = currentAnimStyle()) {
  return hasAnimStyles(exId) ? animStyleById(styleId).id : BASE_ANIM_STYLE;
}

// Applies settings.animStyle and tells the 3D stages.
export function applyAnimStyle(settings = {}) {
  const id = animStyleById(settings.animStyle).id;
  if (document.documentElement.dataset.anim === id) return;
  document.documentElement.dataset.anim = id;
  window.dispatchEvent(new CustomEvent("hp:anim"));
}

// How each kind of style is drawn, for the badges on the cards.
export const TECH_NAMES = { "3d": "three.js", svg: "SVG", canvas: "2D canvas", text: "Text" };

// The picker in Settings: one card per style, with a still of the styled exercise
// filled in by the settings view; the three.js styles first, then the others.
export function animStylePickerHtml(current) {
  const cur = animStyleById(current).id;
  const card = (s) => `<button type="button" class="skin-card anim-card" data-anim-style="${s.id}" aria-pressed="${s.id === cur}">
      <span class="anim-thumb"><span class="anim-num mono">${ANIM_STYLES.indexOf(s) + 1}</span><img alt="" data-anim-thumb="${s.id}" hidden></span>
      <span class="anim-badges"><span class="anim-badge">${TECH_NAMES[s.tech]}</span>${s.fun ? '<span class="anim-badge fun">Funny</span>' : ""}</span>
      <span class="skin-meta"><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small><small class="skin-src">After: ${esc(s.after)}</small></span>
    </button>`;
  const group = (title, note, list) => `<div class="anim-group"><h4>${esc(title)} <small class="muted">${esc(note)}</small></h4>
    <div class="skin-grid anim-grid">${list.map(card).join("")}</div></div>`;
  const three = ANIM_STYLES.filter((s) => s.tech === "3d"), flat = ANIM_STYLES.filter((s) => s.tech !== "3d");
  return `<div class="anim-groups" role="group" aria-label="Animation style">
    ${group("3D scenes", `three.js · ${three.length} styles`, three)}
    ${group("Drawn without three.js", `SVG, 2D canvas and text · ${flat.length} styles`, flat)}
  </div>`;
}
