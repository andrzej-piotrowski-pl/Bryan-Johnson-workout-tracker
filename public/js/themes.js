// Themes: each look has its own layout, type and
// colours (css/themes.css), on top of the light/dark mode setting.
//
// The chosen theme is profile.settings.skin; the mode is profile.settings.theme
// ("system" | "light" | "dark"). Both are mirrored in localStorage so the right
// look paints before the app boots (see the inline script in index.html).
// <html> carries data-skin, data-theme (a forced mode, if any) and data-scheme
// (the resolved "light" or "dark"), which is all the CSS and the 3D stage read.

import { esc } from "./util.js";

// preview: colours and arrangement for the small picture on each theme card.
// nav: left | right | top | rail | band; layout: how Today is arranged.
export const SKINS = [
  {
    id: "original",
    name: "Original",
    source: null,
    blurb: "The first look: sidebar on the left, rounded cards, a teal accent.",
    modes: ["light", "dark"],
    preview: { bg: "#0a0f15", surface: "#18222f", ink: "#e9eff7", accent: "#3ee0b0", nav: "left", layout: "split", r: 3 },
  },
  {
    id: "chapters",
    name: "Chapters",
    source: "taste-skill",
    blurb: "Loud and flat: every block of the day is its own colour field. Navigation across the top, huge type, square corners.",
    modes: ["light", "dark"],
    preview: { bg: "#ffffff", surface: "#000000", ink: "#000000", accent: "#fe7141", fields: ["#d1ddd3", "#f0ff1c", "#fe7141"], nav: "top", layout: "banner", r: 0 },
  },
  {
    id: "darkroom",
    name: "Dark room",
    source: "taste-skill",
    blurb: "One dark field where the 3D figure is the lit exhibit. The exercise on the left, the session in the middle, navigation on the right. Always dark.",
    modes: ["dark"],
    preview: { bg: "#161c1a", surface: "#1f2725", ink: "#e3e2da", accent: "#9fc7b8", nav: "right", layout: "mirror", r: 6 },
  },
  {
    id: "pulse",
    name: "Pulse",
    source: "ui-ux-pro-max",
    blurb: "Gym-app energy: black, orange and green tiles, a big progress ring and a slim icon rail.",
    modes: ["light", "dark"],
    preview: { bg: "#000000", surface: "#1c1c1e", ink: "#f8fafc", accent: "#f97316", second: "#22c55e", nav: "rail", layout: "bento", r: 4 },
  },
  {
    id: "lab",
    name: "Lab",
    source: "ui-ux-pro-max",
    blurb: "Longevity-lab precision: a Swiss grid with ruled lines, figures in mono, three columns on wide screens.",
    modes: ["light", "dark"],
    preview: { bg: "#ffffff", surface: "#f5f5f5", ink: "#0a0a0a", accent: "#0047ff", nav: "top", layout: "three", r: 0, ruled: true },
  },
  {
    id: "olympia",
    name: "Olympia",
    source: "impeccable",
    blurb: "A colour for each kind of session, after the 1972 Munich Games signage: blue for strength, orange for intervals, green for Zone 2. It follows the day from the header to the 3D floor.",
    modes: ["light", "dark"],
    preview: { bg: "#ffffff", surface: "#f2f5f8", ink: "#0b2545", accent: "#74b9e8", second: "#f7a541", nav: "band", layout: "aside", r: 3 },
  },
  {
    id: "course",
    name: "Course",
    source: "impeccable",
    blurb: "Your session drawn like an orienteering course: each exercise a control on a purple line. Exercises open in place, one column.",
    modes: ["light", "dark"],
    preview: { bg: "#ffffff", surface: "#ffffff", ink: "#1a1a1a", accent: "#b0279a", rail: "#fcd36f", nav: "left", layout: "course", r: 3 },
  },
  {
    id: "studio",
    name: "Studio",
    source: null,
    blurb: "A spacious training studio: the exercise takes centre stage on the left, the session sits beside it, and a compact navigation column stays close by.",
    modes: ["light", "dark"],
    preview: { bg: "#edf0fa", surface: "#ffffff", ink: "#202a46", accent: "#3c56cc", nav: "left", layout: "mirror", r: 7 },
  },
  {
    id: "journal",
    name: "Journal",
    source: null,
    blurb: "An editorial training journal: navigation across the masthead, a generous serif headline, exercises in paired rows and a demonstration that opens on the page.",
    modes: ["light", "dark"],
    preview: { bg: "#f7f2e8", surface: "#ebe4d6", ink: "#292f29", accent: "#38654e", nav: "top", layout: "journal", r: 0, ruled: true },
  },
];

export const DEFAULT_SKIN = "original";
const LS_SKIN = "hp:skin";
const LS_MODE = "hp:theme";

export function skinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function currentSkin() {
  return skinById(document.documentElement.dataset.skin);
}

// How Today shows the selected exercise: beside the list, or opened in place.
export function detailMode() {
  return window.matchMedia("(max-width: 1180px)").matches || ["course", "journal"].includes(currentSkin().id) ? "inline" : "side";
}

const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function resolveScheme() {
  const root = document.documentElement;
  const forced = root.dataset.theme;
  root.dataset.scheme = forced === "light" || forced === "dark" ? forced : darkQuery && darkQuery.matches ? "dark" : "light";
}

if (darkQuery && darkQuery.addEventListener) {
  darkQuery.addEventListener("change", () => {
    resolveScheme();
    window.dispatchEvent(new CustomEvent("hp:look"));
  });
}

// Applies { skin, theme } from profile settings: sets the <html> attributes,
// remembers them for the next page load and tells listeners (the 3D stages).
export function applyLook(settings = {}) {
  const root = document.documentElement;
  const skin = skinById(settings.skin);
  root.dataset.skin = skin.id;
  const mode = skin.modes.length === 1 ? skin.modes[0] : settings.theme;
  if (mode === "light" || mode === "dark") root.dataset.theme = mode;
  else delete root.dataset.theme;
  resolveScheme();
  try {
    localStorage.setItem(LS_SKIN, JSON.stringify(skin.id));
    localStorage.setItem(LS_MODE, JSON.stringify(settings.theme || "system"));
  } catch {}
  window.dispatchEvent(new CustomEvent("hp:look"));
}

// ---------- what a session or a block is, for the themes that colour by kind ----------

const SESSION_KINDS = { mon: "strength", tue: "intervals", wed: "strength", thu: "intervals", fri: "strength", sat: "endurance", sun: "rest" };

export function sessionKind(dayKey) {
  return SESSION_KINDS[dayKey] || "strength";
}

// Order matters: "Dynamic mobility" is a warm-up, "yoga & balance" is balance work.
const BLOCK_KINDS = [
  [/warm|dynamic/i, "warm"],
  [/jump|speed|power|interval|4×4|4x4/i, "power"],
  [/strength/i, "strength"],
  [/core|plank|tendon|stabil|balance|knee|back/i, "core"],
  [/zone/i, "cardio"],
  [/stretch|cool|yoga|mobil/i, "stretch"],
];

export function blockKind(name) {
  const hit = BLOCK_KINDS.find(([re]) => re.test(name || ""));
  return hit ? hit[1] : "other";
}

// ---------- the theme picker (setup and settings) ----------

function previewHtml(s) {
  const p = s.preview;
  const vars = `--pv-bg:${p.bg};--pv-surface:${p.surface};--pv-ink:${p.ink};--pv-accent:${p.accent};--pv-second:${p.second || p.accent};--pv-rail:${p.rail || p.surface};--pv-r:${p.r}px`;
  const fields = (p.fields || []).map((c) => `<i style="background:${c}"></i>`).join("");
  return `<span class="skin-pv" data-nav="${p.nav}" data-layout="${p.layout}"${p.ruled ? " data-ruled" : ""} style="${vars}" aria-hidden="true">
    <i class="pv-nav"><i></i><i></i><i></i></i>
    <span class="pv-main"><i class="pv-head"></i><span class="pv-list">${fields || "<i></i><i></i><i></i>"}</span><i class="pv-detail"><i></i></i></span>
  </span>`;
}

export function skinPickerHtml(current) {
  const cur = skinById(current).id;
  return `<div class="skin-grid" role="group" aria-label="Theme">${SKINS.map(
    (s) => `<button type="button" class="skin-card" data-skin="${s.id}" aria-pressed="${s.id === cur}">
      ${previewHtml(s)}
      <span class="skin-meta"><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small>${s.source ? `<small class="skin-src">Design guide: ${esc(s.source)}</small>` : ""}</span>
    </button>`
  ).join("")}</div>`;
}
