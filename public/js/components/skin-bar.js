// The live theme switcher: a small bar floating at the top centre of every page,
// one lettered button per theme (A = Original, B = Chapters, …, in the order of
// SKINS) and a close button. Opened from Settings → Appearance; it stays open as
// you move between pages, and across reloads in the same tab, until closed.
// Picking a letter switches and saves the theme, like the picker in Settings.

import { state, updateProfile } from "../store.js";
import { SKINS, applyLook, currentSkin } from "../themes.js";
import { createFloatBar } from "./float-bar.js";

const bar = createFloatBar({
  key: "hp:skinbar",
  rootClass: "skinbar-on",
  className: "theme-bar",
  label: "Switch theme",
  closeLabel: "Close the theme switcher",
  items: () => SKINS.map((s, i) => ({ id: s.id, text: String.fromCharCode(65 + i), name: s.name, aria: `${s.name} theme` })),
  current: () => currentSkin().id,
  onPick(id) {
    if (!state.profile) return false;
    updateProfile((pr) => {
      pr.settings = pr.settings || {};
      pr.settings.skin = id;
    });
    applyLook(state.profile.settings);
  },
  event: "hp:look",
});

export const openSkinBar = bar.open;
export const closeSkinBar = bar.close;
export function restoreSkinBar() {
  if (state.profile) bar.restore();
}
