// The live animation style switcher: like the theme switcher (skin-bar.js), a bar
// floating at the top centre of every page, one numbered button per style (1 =
// Mannequin, 2 = Athlete, …, in the order of ANIM_STYLES). Opened from Settings →
// Animation style; picking a number switches and saves the style, and every 3D
// figure on screen that takes styles redraws in it.

import { state, updateProfile } from "../store.js";
import { ANIM_STYLES, applyAnimStyle, currentAnimStyle } from "../anim-styles.js";
import { createFloatBar } from "./float-bar.js";
import { icon } from "./icons.js";

const bar = createFloatBar({
  key: "hp:animbar",
  rootClass: "animbar-on",
  className: "anim-bar",
  label: "Switch animation style",
  closeLabel: "Close the animation style switcher",
  lead: `<span class="bar-lead" title="Animation style">${icon("posture", "sm")}</span>`,
  items: () => ANIM_STYLES.map((s, i) => ({ id: s.id, text: String(i + 1), name: s.name, aria: `${s.name} animation style` })),
  current: currentAnimStyle,
  onPick(id) {
    if (!state.profile) return false;
    updateProfile((pr) => {
      pr.settings = pr.settings || {};
      pr.settings.animStyle = id;
    });
    applyAnimStyle(state.profile.settings);
  },
  event: "hp:anim",
});

export const openAnimBar = bar.open;
export const closeAnimBar = bar.close;
export const animBarOpen = bar.isOpen;
export function restoreAnimBar() {
  if (state.profile) bar.restore();
}
