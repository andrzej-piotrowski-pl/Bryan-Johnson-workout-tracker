// Animation styles: other ways to draw the 3D figure, on top of the original
// mannequin. Picked in Settings → Animation style or from the floating style bar
// (components/anim-bar.js).
//
// A test for now: the styles apply only to the exercises in STYLED_EXERCISES
// (Zone 2: "Easy step-ups or marching"); every other exercise keeps the mannequin.
//
// The choice is profile.settings.animStyle; <html data-anim> carries it for the 3D
// stages, which listen for "hp:anim". The styles themselves are in js/anim/styles/.

import { esc } from "./util.js";

// after: what the style is modelled on, shown on its card. tech: how it's drawn —
// "3d" styles are three.js scenes; "svg", "canvas" and "text" styles draw the same
// moving skeleton without three.js, as vector shapes, brush strokes or characters.
export const ANIM_STYLES = [
  { id: "mannequin", name: "Mannequin", tech: "3d", after: "The original", blurb: "Smooth grey figure; the muscles being worked light up." },
  { id: "athlete", name: "Athlete", tech: "3d", after: "Semi-realistic, like Mixamo characters", blurb: "Skin, a T-shirt, shorts and trainers under soft studio light. The closest to a real person to copy." },
  { id: "anime", name: "Anime", tech: "3d", after: "VRM avatars with MToon shading", blurb: "Soft cel shading with tinted shadows, a rim light, thin outlines, big eyes and spiky hair." },
  { id: "lowpoly", name: "Low poly", tech: "3d", after: "Quaternius' free game characters", blurb: "Faceted shapes and flat colours. Light to draw and very clear to read." },
  { id: "cartoon", name: "Cartoon", tech: "3d", after: "Classic cel shading with ink outlines", blurb: "Two hard tones, thick black outlines and bold colours; the worked muscles get a yellow outline." },
  { id: "voxel", name: "Voxel", tech: "3d", after: "Minecraft-style blocks", blurb: "Built from blocks with pixel-art faces and clothes, on grass with a cobblestone step." },
  { id: "pictogram", name: "Pictogram", tech: "svg", after: "Otl Aicher's 1972 Munich Olympics pictograms", blurb: "A white sign figure on a blue tile: even bars for limbs, a floating round head, the worked muscles in orange. Drawn as SVG." },
  { id: "ink", name: "Ink brush", tech: "canvas", after: "Japanese sumi-e painting", blurb: "Brush strokes on rice paper that leave fading ink trails, an ensō circle for the head and red washes on the worked muscles. Drawn on a 2D canvas." },
  { id: "ascii", name: "ASCII", tech: "text", after: "Old green-screen terminals", blurb: "The figure typed out in characters on a glowing CRT, with a floor grid; the worked muscles in amber. Drawn as text." },
];

export const DEFAULT_ANIM_STYLE = "mannequin";

// Exercise ids (data/exercises.js) the styles are tried on.
export const STYLED_EXERCISES = ["zone2"];

export function animStyleById(id) {
  return ANIM_STYLES.find((s) => s.id === id) || ANIM_STYLES[0];
}

export function currentAnimStyle() {
  return animStyleById(document.documentElement.dataset.anim).id;
}

export function hasAnimStyles(exId) {
  return STYLED_EXERCISES.includes(exId);
}

// The style an exercise is drawn in: the chosen one if the exercise takes styles.
export function animStyleFor(exId, styleId = currentAnimStyle()) {
  return hasAnimStyles(exId) ? animStyleById(styleId).id : DEFAULT_ANIM_STYLE;
}

// Applies settings.animStyle and tells the 3D stages.
export function applyAnimStyle(settings = {}) {
  const id = animStyleById(settings.animStyle).id;
  if (document.documentElement.dataset.anim === id) return;
  document.documentElement.dataset.anim = id;
  window.dispatchEvent(new CustomEvent("hp:anim"));
}

// The picker in Settings: one card per style, with a still of the styled exercise
// filled in by the settings view.
export function animStylePickerHtml(current) {
  const cur = animStyleById(current).id;
  return `<div class="skin-grid anim-grid" role="group" aria-label="Animation style">${ANIM_STYLES.map(
    (s, i) => `<button type="button" class="skin-card anim-card" data-anim-style="${s.id}" aria-pressed="${s.id === cur}">
      <span class="anim-thumb"><span class="anim-num mono">${i + 1}</span><img alt="" data-anim-thumb="${s.id}" hidden></span>
      <span class="skin-meta"><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small><small class="skin-src">After: ${esc(s.after)}</small></span>
    </button>`
  ).join("")}</div>`;
}
