// The live theme switcher: a small bar floating at the top centre of every page,
// one lettered button per theme (A = Original, B = Chapters, …, in the order of
// SKINS) and a close button. Opened from Settings → Appearance; it stays open as
// you move between pages, and across reloads in the same tab, until closed.
// Picking a letter switches and saves the theme, like the picker in Settings.

import { state, updateProfile } from "../store.js";
import { SKINS, applyLook, currentSkin } from "../themes.js";
import { esc } from "../util.js";
import { icon } from "./icons.js";

const KEY = "hp:skinbar";
let bar = null;
let flashTimer = null;

const letter = (i) => String.fromCharCode(65 + i);

function sync() {
  if (!bar) return;
  const cur = currentSkin().id;
  bar.querySelectorAll("[data-pick]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pick === cur)));
}

function pick(btn) {
  if (!state.profile) return closeSkinBar();
  updateProfile((pr) => {
    pr.settings = pr.settings || {};
    pr.settings.skin = btn.dataset.pick;
  });
  applyLook(state.profile.settings);
  // Show the name for a moment, so a tap on a phone (no hover) says what it picked.
  clearTimeout(flashTimer);
  bar.querySelectorAll(".show-name").forEach((b) => b.classList.remove("show-name"));
  btn.classList.add("show-name");
  flashTimer = setTimeout(() => btn.classList.remove("show-name"), 1400);
}

function onKey(e) {
  if (e.key === "Escape") {
    closeSkinBar();
    return;
  }
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const btns = [...bar.querySelectorAll("button")];
  const i = btns.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length].focus();
}

export function openSkinBar() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
  if (bar) return sync();
  bar = document.createElement("div");
  bar.className = "skin-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Switch theme");
  bar.innerHTML =
    SKINS.map((s, i) => `<button type="button" data-pick="${s.id}" data-name="${esc(s.name)}" aria-label="${esc(s.name)} theme" aria-pressed="false">${letter(i)}</button>`).join("") +
    `<button type="button" class="skin-bar-close" data-name="Close" aria-label="Close the theme switcher">${icon("x", "sm")}</button>`;
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.pick) pick(b);
    else closeSkinBar();
  });
  bar.addEventListener("keydown", onKey);
  document.body.appendChild(bar);
  document.documentElement.classList.add("skinbar-on");
  sync();
}

export function closeSkinBar() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  clearTimeout(flashTimer);
  if (bar) bar.remove();
  bar = null;
  document.documentElement.classList.remove("skinbar-on");
}

// Reopens the bar after a reload if it was open in this tab.
export function restoreSkinBar() {
  let open = false;
  try {
    open = sessionStorage.getItem(KEY) === "1";
  } catch {}
  if (open && state.profile) openSkinBar();
}

window.addEventListener("hp:look", sync);
