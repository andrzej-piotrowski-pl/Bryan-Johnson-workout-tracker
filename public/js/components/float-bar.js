// A small bar floating at the top centre of every page: one short button per choice
// and a close button. Used by the live theme switcher (skin-bar.js) and the animation
// style switcher (anim-bar.js); when both are open the second sits under the first.
// It stays open as you move between pages, and across reloads in the same tab, until
// closed. Hovering, focusing or tapping a button shows its name underneath.
//
//   createFloatBar({ key, rootClass, className, label, closeLabel, lead, items, current, onPick, event })
//   items(): [{ id, text, name, aria }]; current(): the chosen id; onPick(id): apply it
//   (return false to close the bar instead); event: re-sync on this window event.

import { esc } from "../util.js";
import { icon } from "./icons.js";

export function createFloatBar({ key, rootClass, className, label, closeLabel, lead = "", items, current, onPick, event }) {
  let bar = null;
  let flashTimer = null;

  function sync() {
    if (!bar) return;
    const cur = current();
    bar.querySelectorAll("[data-pick]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pick === cur)));
  }

  function pick(btn) {
    if (onPick(btn.dataset.pick) === false) return close();
    // Show the name for a moment, so a tap on a phone (no hover) says what it picked.
    clearTimeout(flashTimer);
    bar.querySelectorAll(".show-name").forEach((b) => b.classList.remove("show-name"));
    btn.classList.add("show-name");
    flashTimer = setTimeout(() => btn.classList.remove("show-name"), 1400);
    sync();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const btns = [...bar.querySelectorAll("button")];
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length].focus();
  }

  function open() {
    try {
      sessionStorage.setItem(key, "1");
    } catch {}
    if (bar) return sync();
    bar = document.createElement("div");
    bar.className = "skin-bar " + className;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", label);
    bar.innerHTML =
      lead +
      items().map((it) => `<button type="button" data-pick="${esc(it.id)}" data-name="${esc(it.name)}" aria-label="${esc(it.aria || it.name)}" aria-pressed="false">${esc(it.text)}</button>`).join("") +
      `<button type="button" class="skin-bar-close" data-name="Close" aria-label="${esc(closeLabel)}">${icon("x", "sm")}</button>`;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.pick) pick(b);
      else close();
    });
    bar.addEventListener("keydown", onKey);
    document.body.appendChild(bar);
    document.documentElement.classList.add(rootClass);
    sync();
  }

  function close() {
    try {
      sessionStorage.removeItem(key);
    } catch {}
    clearTimeout(flashTimer);
    if (bar) bar.remove();
    bar = null;
    document.documentElement.classList.remove(rootClass);
  }

  // Reopens the bar after a reload if it was open in this tab.
  function restore() {
    let wasOpen = false;
    try {
      wasOpen = sessionStorage.getItem(key) === "1";
    } catch {}
    if (wasOpen) open();
  }

  if (event) window.addEventListener(event, sync);
  return { open, close, restore, isOpen: () => !!bar };
}
