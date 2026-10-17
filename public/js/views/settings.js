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
import { confirmDialog, openDialog, seg, switchHtml, toast } from "../components/ui.js";
import { applyLook, currentSkin, detailMode, skinById, skinPickerHtml } from "../themes.js";
import { openSkinBar } from "../components/skin-bar.js";
import { ANIM_STYLES, PREVIEW_EXERCISE, animStylePickerHtml, applyAnimStyle, currentAnimStyle, hasAnimStyles } from "../anim-styles.js";
import { openAnimBar } from "../components/anim-bar.js";
import { createEquipmentEditor } from "../components/equipment-editor.js";
import { createStagePanel } from "../components/stage-panel.js";
import { thumbnail } from "../components/thumbs.js";

const LB = 2.20462;
const REST_PRESETS = [45, 60, 75, 90, 120];
const REPO = "https://github.com/liviux/Bryan-Johnson-workout-website";

export function render(el) {
  const p = () => state.profile;
  const imperial = () => p().units === "imperial";
  const w = (kg) => (kg == null ? "" : imperial() ? Math.round(kg * LB * 10) / 10 : kg);
  const hgt = (cm) => (cm == null ? "" : imperial() ? Math.round(cm / 2.54) : cm);
  let customRest = !REST_PRESETS.includes(p().settings?.restSec || 75);

  // The animation style preview: one 3D stage, kept across redraws of the page, on the
  // exercise picked under it (remembered for this tab).
  let previewEx = PREVIEW_EXERCISE;
  try {
    const kept = sessionStorage.getItem("hp:animpreview");
    if (kept && EXERCISES[kept]) previewEx = kept;
  } catch {}
  const previewEl = document.createElement("div");
  previewEl.className = "anim-preview stage";
  let equipmentEditor = null;
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

      <section class="card card-pad" style="display:grid;gap:16px">
        <h3>Your details</h3>
        <p class="muted" style="font-size:0.86rem">Your details set your suggested starting weights and heart-rate zones: max ${hrMax(pr)} bpm, Zone 2 ${bpmRange(pr, 60, 70)}.</p>
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

      <details class="card card-pad equipment-settings" id="equipment">
        <summary>Your equipment <small class="muted">Optional inventory</small></summary>
        <div data-equipment-editor></div>
      </details>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Training level</h3>
        <p class="muted" style="font-size:0.86rem">Your level sets the exercises, sets, reps and intervals. Your weight, sex and age adjust the suggested weights.</p>
        ${levelPickerHtml(pr.level, { sessions: sessionsDone(levelIndex(pr)) })}
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Add-ons</h3>
        ${ADDONS.map((a) => `<div class="addon-card">${icon(a.icon || "sparkle")}<span style="display:grid;gap:4px"><b>${esc(a.name)}</b><small class="muted">${esc(a.description)}</small></span>${switchHtml("addon:" + a.id, pr.addons && pr.addons[a.id], a.name)}</div>`).join("")}
      </section>

      <section class="card card-pad" style="display:grid;gap:14px">
        <h3>During workouts</h3>
        <div class="field"><span>Rest timer after a set</span>${seg("rest", [...REST_PRESETS.map((s) => ({ id: String(s), name: `${s} s` })), { id: "custom", name: "Custom" }], customRest ? "custom" : String(st.restSec || 75))}</div>
        <label class="field rest-custom" ${customRest ? "" : "hidden"}><span>Custom rest (seconds)</span><input class="input" type="number" data-f="restCustom" min="1" max="3600" step="1" required value="${esc(st.restSec || 75)}"><small>Enter 1 to 3,600 seconds.</small></label>
        <label style="display:flex;gap:12px;align-items:center">${switchHtml("autoRest", st.autoRest !== false, "Start the rest timer automatically")}<span>Start the rest timer automatically when you log a set</span></label>
        <label style="display:flex;gap:12px;align-items:center">${switchHtml("sound", st.sound !== false, "Timer sounds")}<span>Timer beeps</span></label>
      </section>

      <section class="card card-pad" style="display:grid;gap:14px">
        <h3>Appearance</h3>
        <p class="muted" style="font-size:0.86rem">Choose a theme from these Today screenshots. Each shows a different exercise and animation style; you can choose your animation style below.</p>
        ${skinPickerHtml(st.skin)}
        <div class="live-row">
          <button type="button" class="btn" data-live>${icon("eye")} Try themes live</button>
          <small class="muted">Compare themes on Today with the switcher at the top. Hover a letter to see the theme name. Close it with ×.</small>
        </div>
        <div class="field"><span>Light or dark</span>${skinById(st.skin).modes.length > 1 ? seg("theme", [{ id: "system", name: "Follow the system" }, { id: "light", name: "Light" }, { id: "dark", name: "Dark" }], st.theme || "system") : `<small>${esc(skinById(st.skin).name)} is always dark.</small>`}</div>
      </section>

      <section class="card card-pad" data-anim-settings style="display:grid;gap:14px">
        <h3>Animation style</h3>
        <p class="muted" style="font-size:0.86rem">Pick how the demonstrations look. Every style shows the same movement.</p>
        <div data-anim-preview></div>
        <label class="field anim-preview-pick"><span>Exercise in the preview</span><select class="input" data-anim-ex>${CATEGORIES.map((c) => `<optgroup label="${esc(c)}">${Object.entries(EXERCISES).filter(([, x]) => x.cat === c).map(([id, x]) => `<option value="${id}"${id === previewEx ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>
        ${animStylePickerHtml(st.animStyle)}
        <div class="live-row">
          <button type="button" class="btn" data-anim-live>${icon("eye")} Try styles live</button>
          <small class="muted">Compare ${ANIM_STYLES.length} styles during today's session. On a phone or rest day, the exercise above opens instead. Hover a number for the style name, or use ‹ › on a phone. Close the switcher with ×.</small>
        </div>
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Your data</h3>
        <p class="muted" style="font-size:0.88rem">${state.mode === "server" ? `Your data saves to <code>${esc(state.dataDir)}/</code> on this computer. Git ignores this folder. Copy it or export a backup below to keep a spare copy.` : "The local server is unavailable, so your data saves only in this browser. Export a backup regularly, or run <code>npm start</code> to save to files on your computer."}</p>
        <div class="btn-row">
          <button type="button" class="btn" data-export>${icon("download")} Export backup</button>
          <label class="btn">${icon("upload")} Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
          <a class="btn" href="#/setup/redo">${icon("rotate")} Run setup again</a>
          <button type="button" class="btn danger" data-reset>${icon("trash")} Reset everything</button>
        </div>
      </section>

      <p class="muted" style="font-size:0.82rem">Home Protocol is open source and unaffiliated with Bryan Johnson or Blueprint. It provides a training plan, not medical advice.</p>
      <div class="settings-footer"><button type="button" class="btn ghost sm" data-changelog>Version ${esc(state.version || "unavailable")} · Latest changes</button><a href="${REPO}" target="_blank" rel="noopener noreferrer">GitHub repository ${icon("external", "sm")}</a></div>
    </div>`;
  }

  el.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    const v = e.target.value;
    const n = Number(String(v).replace(",", "."));
    const ok = v !== "" && Number.isFinite(n);
    if (f === "restCustom") {
      const valid = ok && Number.isInteger(n) && n >= 1 && n <= 3600;
      e.target.setCustomValidity(valid ? "" : "Enter a whole number from 1 to 3,600 seconds.");
      if (!valid) return;
    }
    updateProfile((pr) => {
      if (f === "name") pr.name = v;
      else if (f === "age" && ok && n >= 10 && n <= 110) pr.age = Math.round(n);
      else if (f === "weight" && ok && n > 0) pr.weightKg = Math.round((imperial() ? n / LB : n) * 10) / 10;
      else if (f === "height") pr.heightCm = ok ? Math.round(imperial() ? n * 2.54 : n) : null;
      else if (f === "maxdb") pr.maxDumbbellKg = ok ? Math.round((imperial() ? n / LB : n) * 10) / 10 : null;
      else if (f === "hrmax") pr.hrMax = ok && n > 100 ? Math.round(n) : null;
      else if (f === "start" && v) pr.startDate = v;
      else if (f === "restCustom") {
        pr.settings = pr.settings || {};
        pr.settings.restSec = n;
      }
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
        const replace = await confirmDialog({ title: "Import backup", message: `This backup has ${days} logged days${data.profile ? " and a profile" : ""}. Choose Replace all to overwrite your current data. Cancel merges the backup instead; its days overwrite matching dates.`, confirm: "Replace all", danger: true });
        await importAll(data, replace ? "replace" : "merge");
        customRest = !REST_PRESETS.includes(p().settings?.restSec || 75);
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
    if (b.hasAttribute("data-changelog")) {
      try {
        const res = await fetch("/api/changelog", { cache: "no-store" });
        if (!res.ok) throw new Error("Changelog unavailable");
        const releases = (await res.text()).split(/(?=^## \[)/m).filter((section) => section.startsWith("## [")).slice(0, 20);
        if (!releases.length) throw new Error("Changelog is empty");
        const content = `<div class="release-list">${releases.map((release) => {
          const [heading, ...lines] = release.trim().split("\n");
          const [, version, date] = heading.match(/^## \[(.+?)\] - (.+)$/) || [];
          const planChanged = lines.some((line) => /^- \*\*Plan change:\*\*/.test(line));
          const changes = lines.map((line) => {
            const category = line.match(/^### (.+)$/);
            const item = line.match(/^(\s*)- (.+)$/);
            if (category) return `<h4>${esc(category[1])}</h4>`;
            if (item) {
              const planChange = item[2].startsWith("**Plan change:**");
              const text = esc(item[2]).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
              return `<p class="release-bullet${item[1] ? " nested" : ""}${planChange ? " release-plan-change" : ""}">${text}</p>`;
            }
            return "";
          }).join("");
          return `<section class="release-entry"><h3><span>v${esc(version || "?")}${planChanged ? ' <span class="plan-change-badge">Plan changed</span>' : ""}</span><small>${esc(date || "")}</small></h3>${changes}</section>`;
        }).join("")}<p><a href="${REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Read the full changelog</a></p></div>`;
        openDialog({ title: "Latest changes", content, wide: true });
      } catch {
        toast("Couldn't load the changelog", { icon: "info" });
      }
      return;
    }
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
      if (name === "rest") {
        customRest = v === "custom";
        if (customRest) {
          draw();
          el.querySelector('[data-f="restCustom"]').focus();
          return;
        }
      }
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
    equipmentEditor?.destroy();
    drawPage();
    equipmentEditor = createEquipmentEditor(el.querySelector("[data-equipment-editor]"), { profile: p, save: updateProfile });
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
      equipmentEditor?.destroy();
      disposed = true;
      previewObserver.disconnect();
      window.removeEventListener("hp:look", onLook);
      window.removeEventListener("hp:anim", onAnim);
      preview?.dispose();
    },
  };
}
