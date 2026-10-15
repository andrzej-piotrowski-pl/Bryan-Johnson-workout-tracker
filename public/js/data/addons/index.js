// Optional add-ons shown after the main session (the posture block is the first).
// The user picks them in the first-run setup and can change them in Settings.
//
// To add your own: create a file like posture.js that exports
//   { id, name, short, description, color, schedule, variants, metrics?, periodic?, habits?, checks? }
// - schedule maps weekday keys (mon…sun) to a variant name, "optional", or nothing (not shown that day)
// - variants: { name, mins, note, items: [{ id, ex, label?, rx: [new, returning, active, trained] (training levels), bryan? }] }
// - items reference exercise ids from ../exercises.js (add new exercises there)
// then import it below and add it to ADDONS. Logging, auto-save and history work automatically.

import posture from "./posture.js";

export const ADDONS = [posture];

export function getAddon(id) {
  return ADDONS.find((a) => a.id === id) || null;
}
