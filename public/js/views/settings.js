// Settings: profile (drives zones and loads), training level, add-ons, workout options,
// theme, animation style, and your data (export, import, reset). Everything saves as you type.

import { ADDONS } from "../data/addons/index.js";
import { CATEGORIES, EXERCISES } from "../data/exercises.js";
import { exportAll, importAll, resetAll, state, updateProfile } from "../store.js";
import { SEXES, bpmRange, hrMax, levelIndex } from "../personalize.js";
import { blockItems, dayDef, levelFor, sessionKeyFor, sessionsDone } from "../plan.js";
import { levelPickerHtml } from "../components/level-picker.js";
import { esc, todayIso } from "../util.js";
import { icon } from "../components/icons.js";
import { confirmDialog, seg, switchHtml, toast } from "../components/ui.js";
import { SKINS, applyLook, currentSkin, detailMode, skinById, skinPickerHtml } from "../themes.js";
import { openSkinBar } from "../components/skin-bar.js";
import { ANIM_STYLES, PREVIEW_EXERCISE, animStylePickerHtml, applyAnimStyle, currentAnimStyle, hasAnimStyles } from "../anim-styles.js";
import { openAnimBar } from "../components/anim-bar.js";
import { createStagePanel } from "../components/stage-panel.js";
import { thumbnail } from "../components/thumbs.js";

const LB = 2.20462;

export function render(el) {
  const p = () => state.profile;
  const imperial = () => p().units === "imperial";
  const w = (kg) => (kg == null ? "" : imperial() ? Math.round(kg * LB * 10) / 10 : kg);
  const hgt = (cm) => (cm == null ? "" : imperial() ? Math.round(cm / 2.54) : cm);

  // The animation style preview: one 3D stage, kept across redraws of the page, on the
  // exercise picked under it (remembered for this tab).
  let previewEx = PREVIEW_EXERCISE;
  try {
    const kept = sessionStorage.getItem("hp:animpreview");
    if (kept && EXERCISES[kept]) previewEx = kept;
  } catch {}
  const previewEl = document.createElement("div");
  previewEl.className = "anim-preview stage";
  let preview = null;
  let disposed = false;
  const previewObserver = new IntersectionObserver((entries) => {
    if (disposed || !entries.some((entry) => entry.isIntersecting)) return;
    previewObserver.disconnect();
    preview = createStagePanel(previewEl);
    preview.load(previewEx);
    fillAnimThumbs();
  }, { rootMargin: "200px" });

  function drawPage() {
    const pr = p();
    const st = pr.settings || {};
    el.innerHTML = `<div class="page narrow">
      <div class="section-title"><h2>Settings</h2><span class="muted">Changes save automatically</span></div>

      <div class="btn-row"><a class="btn" href="#/plan">${icon("plan")} The plan</a><a class="btn" href="#/progress">${icon("progress")} Progress</a><a class="btn" href="#/history">${icon("history")} History</a></div>

      <section class="card card-pad" style="display:grid;gap:16px">
        <h3>You</h3>
        <p class="muted" style="font-size:0.86rem">Used for heart-rate zones (max ${hrMax(pr)} bpm, Zone 2 ${bpmRange(pr, 60, 70)}) and to scale the starting weights.</p>
        <div class="grid-form">
          <label class="field"><span>Name</span><input class="input" data-f="name" value="${esc(pr.name || "")}"></label>
          <label class="field"><span>Age</span><input class="input" data-f="age" inputmode="numeric" value="${esc(pr.age)}"></label>
          <label class="field"><span>Weight (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="weight" inputmode="decimal" value="${esc(w(pr.weightKg))}"></label>
          <label class="field"><span>Height (${imperial() ? "in" : "cm"})</span><input class="input" data-f="height" inputmode="decimal" value="${esc(hgt(pr.heightCm))}"></label>
        </div>
        <div class="field"><span>Sex (scales starting weights)</span>${seg("sex", SEXES, pr.sex)}</div>
        <div class="field"><span>Units</span>${seg("units", [{ id: "metric", name: "Metric (kg, cm)" }, { id: "imperial", name: "Imperial (lb, in)" }], pr.units, "accent")}</div>
        <div class="grid-form">
          <label class="field"><span>Heaviest dumbbell (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="maxdb" inputmode="decimal" value="${esc(w(pr.maxDumbbellKg))}"></label>
          <label class="field"><span>Measured max heart rate</span><input class="input" data-f="hrmax" inputmode="numeric" value="${esc(pr.hrMax ?? "")}" placeholder="estimated from age"></label>
          <label class="field"><span>Program start date</span><input class="input" type="date" data-f="start" value="${esc(pr.startDate || "")}"></label>
        </div>
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Training level</h3>
        <p class="muted" style="font-size:0.86rem">Your level alone decides the workouts: sets, reps, intervals and which exercises you do. Your weight, sex and age (above) scale the suggested weights.</p>
        ${levelPickerHtml(pr.level, { sessions: sessionsDone(levelIndex(pr)) })}
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Add-ons</h3>
        ${ADDONS.map((a) => `<div class="addon-card">${icon(a.icon || "sparkle")}<span style="display:grid;gap:4px"><b>${esc(a.name)}</b><small class="muted">${esc(a.description)}</small></span>${switchHtml("addon:" + a.id, pr.addons && pr.addons[a.id], a.name)}</div>`).join("")}
      </section>

      <section class="card card-pad" style="display:grid;gap:14px">
        <h3>During workouts</h3>
        <div class="field"><span>Rest timer after a set</span>${seg("rest", [45, 60, 75, 90, 120].map((s) => ({ id: String(s), name: `${s} s` })), String(st.restSec || 75))}</div>
        <label style="display:flex;gap:12px;align-items:center">${switchHtml("autoRest", st.autoRest !== false, "Start the rest timer automatically")}<span>Start the rest timer automatically when you log a set</span></label>
        <label style="display:flex;gap:12px;align-items:center">${switchHtml("sound", st.sound !== false, "Timer sounds")}<span>Timer beeps</span></label>
      </section>

      <section class="card card-pad" style="display:grid;gap:14px">
        <h3>Appearance</h3>
        <p class="muted" style="font-size:0.86rem">Each theme changes the layout, type and colours, not just the palette. Your data and settings stay the same.</p>
        ${skinPickerHtml(st.skin)}
        <div class="live-row">
          <button type="button" class="btn" data-live>${icon("eye")} Try themes live</button>
          <small class="muted">Opens Today with a switcher at the top of the screen: ${esc(SKINS.map((s, i) => `${String.fromCharCode(65 + i)} ${s.name}`).join(", "))}. Hover a letter for its name, move between pages as you like, and close it with ×.</small>
        </div>
        <div class="field"><span>Light or dark</span>${skinById(st.skin).modes.length > 1 ? seg("theme", [{ id: "system", name: "Follow the system" }, { id: "light", name: "Light" }, { id: "dark", name: "Dark" }], st.theme || "system") : `<small>${esc(skinById(st.skin).name)} is always dark.</small>`}</div>
      </section>

      <section class="card card-pad" data-anim-settings style="display:grid;gap:14px">
        <h3>Animation style</h3>
        <p class="muted" style="font-size:0.86rem">Other ways to draw the exercise animations, on every exercise. The first six are three.js scenes; the others are drawn without three.js, as SVG, on a 2D canvas, as text or in a WebGL shader of their own. The movement is the same in all of them.</p>
        <div data-anim-preview></div>
        <label class="field anim-preview-pick"><span>Exercise in the preview</span><select class="input" data-anim-ex>${CATEGORIES.map((c) => `<optgroup label="${esc(c)}">${Object.entries(EXERCISES).filter(([, x]) => x.cat === c).map(([id, x]) => `<option value="${id}"${id === previewEx ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>
        ${animStylePickerHtml(st.animStyle)}
        <div class="live-row">
          <button type="button" class="btn" data-anim-live>${icon("eye")} Try styles live</button>
          <small class="muted">Opens today's session (or the exercise above, on a phone or a rest day) with a switcher at the top of the screen, one number per style (${ANIM_STYLES.length}; hover for the name, or ‹ › on a phone). Close it with ×.</small>
        </div>
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Your data</h3>
        <p class="muted" style="font-size:0.88rem">${state.mode === "server" ? `Saved as JSON files in <code>${esc(state.dataDir)}/</code> on this computer (git-ignored). Back it up by copying that folder or exporting below.` : "No local server found: data lives in this browser only. Export regularly, or run <code>npm start</code> to save to files."}</p>
        <div class="btn-row">
          <button type="button" class="btn" data-export>${icon("download")} Export backup</button>
          <label class="btn">${icon("upload")} Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
          <a class="btn" href="#/setup/redo">${icon("rotate")} Run setup again</a>
          <button type="button" class="btn danger" data-reset>${icon("trash")} Reset everything</button>
        </div>
      </section>

      <p class="muted" style="font-size:0.82rem">Home Protocol · open source · unofficial, not affiliated with Bryan Johnson or Blueprint · not medical advice.</p>
    </div>`;
  }

  el.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    const v = e.target.value;
    const n = Number(String(v).replace(",", "."));
    const ok = v !== "" && Number.isFinite(n);
    updateProfile((pr) => {
      if (f === "name") pr.name = v;
      else if (f === "age" && ok && n >= 10 && n <= 110) pr.age = Math.round(n);
      else if (f === "weight" && ok && n > 0) pr.weightKg = Math.round((imperial() ? n / LB : n) * 10) / 10;
      else if (f === "height") pr.heightCm = ok ? Math.round(imperial() ? n * 2.54 : n) : null;
      else if (f === "maxdb") pr.maxDumbbellKg = ok ? Math.round((imperial() ? n / LB : n) * 10) / 10 : null;
      else if (f === "hrmax") pr.hrMax = ok && n > 100 ? Math.round(n) : null;
      else if (f === "start" && v) pr.startDate = v;
    });
  });

  el.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.matches("[data-anim-ex]")) {
      previewEx = t.value;
      try {
        sessionStorage.setItem("hp:animpreview", previewEx);
      } catch {}
      preview?.load(previewEx);
      fillAnimThumbs();
    } else if (t.dataset.switch) {
      const name = t.dataset.switch;
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        if (name.startsWith("addon:")) {
          pr.addons = pr.addons || {};
          pr.addons[name.slice(6)] = t.checked;
        } else pr.settings[name] = t.checked;
      });
    } else if (t.matches("[data-import]") && t.files && t.files[0]) {
      try {
        const data = JSON.parse(await t.files[0].text());
        const days = Object.keys(data.days || {}).length;
        const replace = await confirmDialog({ title: "Import backup", message: `The file has ${days} logged days${data.profile ? " and a profile" : ""}. Replace everything you have now? (Cancel merges instead: days in the file overwrite the same dates.)`, confirm: "Replace all", danger: true });
        await importAll(data, replace ? "replace" : "merge");
        applyLook(state.profile && state.profile.settings);
        applyAnimStyle((state.profile && state.profile.settings) || {});
        toast(`Imported ${days} days`);
        draw();
      } catch (err) {
        toast("That file isn't a backup from this app", { icon: "info" });
      }
      t.value = "";
    }
  });

  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-live")) {
      openSkinBar();
      location.hash = "#/today";
      return;
    }
    if (b.hasAttribute("data-anim-live")) {
      openAnimBar();
      location.hash = styledToday() ? "#/today" : `#/library/${previewEx}`;
      return;
    }
    if (b.dataset.animStyle) {
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        pr.settings.animStyle = b.dataset.animStyle;
      });
      applyAnimStyle(p().settings);
      return;
    }
    if (b.dataset.level) {
      updateProfile((pr) => (pr.level = b.dataset.level));
      draw();
      el.querySelector(`[data-level="${b.dataset.level}"]`).focus();
      return;
    }
    if (b.dataset.skin) {
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        pr.settings.skin = b.dataset.skin;
      });
      applyLook(p().settings);
      draw();
      el.querySelector(`[data-skin="${b.dataset.skin}"]`).focus();
      return;
    }
    const sg = b.closest("[data-seg]");
    if (sg) {
      const name = sg.dataset.seg;
      const v = b.dataset.value;
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        if (name === "sex") pr.sex = v;
        else if (name === "units") pr.units = v;
        else if (name === "rest") pr.settings.restSec = Number(v);
        else if (name === "theme") pr.settings.theme = v;
      });
      if (name === "theme") applyLook(p().settings);
      draw();
      return;
    }
    if (b.hasAttribute("data-export")) {
      const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `home-protocol-backup-${todayIso()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } else if (b.hasAttribute("data-reset")) {
      if (await confirmDialog({ title: "Reset everything?", message: "This deletes your profile and every logged day. Export a backup first if you might want them back.", confirm: "Delete everything", danger: true })) {
        await resetAll();
        applyAnimStyle({});
        location.hash = "#/setup";
      }
    }
  });

  // The floating switchers can change the theme or the style while this page is open.
  function onLook() {
    const cur = currentSkin();
    el.querySelectorAll(".skin-card[data-skin]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.skin === cur.id)));
    if (!!el.querySelector('[data-seg="theme"]') !== cur.modes.length > 1) draw();
    else fillAnimThumbs();
  }
  function onAnim() {
    const cur = currentAnimStyle();
    el.querySelectorAll("[data-anim-style]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.animStyle === cur)));
  }
  window.addEventListener("hp:look", onLook);
  window.addEventListener("hp:anim", onAnim);

  // Is an exercise that takes styles in today's session, where Today will show it
  // beside the list?
  function styledToday() {
    const today = todayIso();
    const def = dayDef(sessionKeyFor(today));
    const wide = detailMode() !== "inline" && !window.matchMedia("(max-width: 1180px)").matches;
    return wide && !!def && def.blocks.some((bl) => blockItems(bl, levelFor(today)).some((it) => hasAnimStyles(it.ex)));
  }

  // A still of the preview exercise on each style's card (in this theme's colours). A
  // newer pick wins over stills still being drawn for the last one.
  function fillAnimThumbs() {
    if (!preview) return;
    const ex = previewEx;
    el.querySelectorAll("img[data-anim-thumb]").forEach((img) => {
      thumbnail(ex, img.dataset.animThumb).then((url) => {
        if (ex !== previewEx) return;
        img.src = url;
        img.hidden = false;
      });
    });
  }

  function draw() {
    drawPage();
    el.querySelector("[data-anim-preview]").replaceWith(previewEl);
    if (preview) fillAnimThumbs();
    else {
      previewObserver.disconnect();
      previewObserver.observe(el.querySelector("[data-anim-settings]"));
    }
  }

  draw();
  return {
    destroy() {
      disposed = true;
      previewObserver.disconnect();
      window.removeEventListener("hp:look", onLook);
      window.removeEventListener("hp:anim", onAnim);
      preview?.dispose();
    },
  };
}
