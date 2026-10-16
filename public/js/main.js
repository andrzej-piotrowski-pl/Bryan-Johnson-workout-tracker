// App shell: boots the store, draws navigation, routes #/view/param to views,
// and shows the save status. First run (no profile yet) goes to the setup wizard.

import * as store from "./store.js";
import { icon } from "./components/icons.js";
import { esc } from "./util.js";
import { applyLook } from "./themes.js";
import { applyAnimStyle } from "./anim-styles.js";
import { restoreSkinBar } from "./components/skin-bar.js";
import { restoreAnimBar } from "./components/anim-bar.js";

const VIEWS = {
  today: () => import("./views/today.js"),
  day: () => import("./views/today.js"),
  activity: () => import("./views/activity.js"),
  library: () => import("./views/library.js"),
  plan: () => import("./views/plan.js"),
  settings: () => import("./views/settings.js"),
  setup: () => import("./views/setup.js"),
};

const NAV = [
  ["today", "Today", "today"],
  ["activity", "Activity", "progress"],
  ["library", "Exercises", "library"],
  ["plan", "The plan", "plan"],
  ["settings", "Settings", "settings"],
];
const TABS = [
  ["today", "Today", "today"],
  ["activity", "Activity", "progress"],
  ["library", "Exercises", "library"],
  ["plan", "Plan", "plan"],
  ["settings", "Settings", "settings"],
];

const viewEl = document.getElementById("view");
let current = null;
let token = 0;

function drawNav(route) {
  const active = route === "day" ? "today" : route;
  document.getElementById("nav").innerHTML = NAV.map(
    ([id, label, ic]) => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${esc(label)}</span></a>`
  ).join("");
  document.getElementById("tabbar").innerHTML = TABS.map(
    ([id, label, ic]) => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${esc(label)}</span></a>`
  ).join("");
  const setup = route === "setup";
  document.querySelector(".sidebar").hidden = setup;
  document.querySelector(".topbar").hidden = setup;
  document.getElementById("tabbar").hidden = setup;
  document.getElementById("app").style.gridTemplateColumns = setup ? "minmax(0,1fr)" : "";
}

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (["week", "history", "progress"].includes(parts[0])) {
    history.replaceState(null, "", "#/activity/" + parts.map(encodeURIComponent).join("/"));
    return { route: "activity", params: parts };
  }
  return { route: VIEWS[parts[0]] ? parts[0] : "today", params: parts.slice(1) };
}

async function route() {
  const my = ++token;
  let { route: name, params } = parseHash();
  if (!store.state.profile && name !== "setup") {
    location.replace("#/setup");
    return;
  }
  if (store.state.profile && name === "setup" && !params.includes("redo")) {
    location.replace("#/today");
    return;
  }
  const mod = await VIEWS[name]();
  if (my !== token) return;
  if (current && current.destroy) current.destroy();
  // Themes can style a page by its route; Today sets the session's "venue" itself.
  document.documentElement.dataset.route = name;
  delete document.documentElement.dataset.venue;
  drawNav(name);
  // A fresh container per view, so event listeners never outlive their view.
  viewEl.innerHTML = "";
  const host = document.createElement("div");
  viewEl.appendChild(host);
  current = mod.render(host, params) || null;
  viewEl.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function drawStatus(s) {
  const local = store.state.mode === "local";
  const text = {
    idle: local ? "Saved in this browser" : "All changes saved",
    pending: "Saving…",
    saving: "Saving…",
    saved: local ? "Saved in this browser" : "All changes saved",
    offline: "Can't reach the server — will retry",
  }[s];
  for (const id of ["save-status", "save-status-top"]) {
    const el = document.getElementById(id);
    el.dataset.s = s;
    el.innerHTML = `<span class="dot"></span><span>${esc(text)}</span>`;
    el.title = local ? "No local server found: data is kept in this browser only. Run `npm start` to save to files." : `Saved to ${store.state.dataDir}/ on this computer`;
  }
}

window.addEventListener("beforeunload", (e) => {
  if (store.hasUnsaved() && store.state.saveStatus === "offline") {
    e.preventDefault();
    e.returnValue = "";
  }
});

await store.init();
// The profile on disk decides the look (this browser may have an older copy in localStorage).
if (store.state.profile) applyLook(store.state.profile.settings);
if (store.state.profile) applyAnimStyle(store.state.profile.settings);
restoreSkinBar();
restoreAnimBar();
store.onStatus(drawStatus);
window.addEventListener("hashchange", route);
route();
