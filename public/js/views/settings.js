// Settings: profile (drives zones and loads), phase, add-ons, workout options,
// theme, and your data (export, import, reset). Everything saves as you type.

import { ADDONS } from "../data/addons/index.js";
import { PHASES } from "../data/program.js";
import { exportAll, importAll, resetAll, state, updateProfile } from "../store.js";
import { LEVELS, SEXES, bpmRange, hrMax, phaseLengths, setLevel } from "../personalize.js";
import { phaseFor } from "../plan.js";
import { esc, todayIso } from "../util.js";
import { icon } from "../components/icons.js";
import { confirmDialog, seg, switchHtml, toast } from "../components/ui.js";

const LB = 2.20462;

export function applyTheme(theme) {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem("hp:theme", JSON.stringify(theme || "system"));
  } catch {}
}

export function render(el) {
  const p = () => state.profile;
  const imperial = () => p().units === "imperial";
  const w = (kg) => (kg == null ? "" : imperial() ? Math.round(kg * LB * 10) / 10 : kg);
  const hgt = (cm) => (cm == null ? "" : imperial() ? Math.round(cm / 2.54) : cm);

  function draw() {
    const pr = p();
    const st = pr.settings || {};
    const ph = phaseFor(todayIso());
    const lens = phaseLengths(pr);
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
        <label class="field"><span>Training level</span><select class="input" data-f="level">${LEVELS.map((l) => `<option value="${l.id}" ${pr.level === l.id ? "selected" : ""}>${esc(l.name)} — ${esc(l.detail)}</option>`).join("")}</select><small>Feeling more comfortable, or need it easier? Change your level any time: the starting weights rescale and your phase restarts at that level's starting point (${LEVELS.map((l) => `${esc(l.name)}: ${esc(PHASES[l.startPhase].name)}`).join(", ")}).</small></label>
        <div class="field"><span>Units</span>${seg("units", [{ id: "metric", name: "Metric (kg, cm)" }, { id: "imperial", name: "Imperial (lb, in)" }], pr.units, "accent")}</div>
        <div class="grid-form">
          <label class="field"><span>Heaviest dumbbell (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="maxdb" inputmode="decimal" value="${esc(w(pr.maxDumbbellKg))}"></label>
          <label class="field"><span>Measured max heart rate</span><input class="input" data-f="hrmax" inputmode="numeric" value="${esc(pr.hrMax ?? "")}" placeholder="estimated from age"></label>
          <label class="field"><span>Program start date</span><input class="input" type="date" data-f="start" value="${esc(pr.startDate || "")}"></label>
        </div>
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Phase</h3>
        <p class="muted" style="font-size:0.86rem">You're in <b>${esc(PHASES[ph.phase].name)}</b>${ph.needed ? `, ${ph.done} of ${ph.needed} sessions done towards ${esc(PHASES[ph.phase + 1].name)}` : ""}. Your training level sets the starting phase; phases advance after ${lens[0]} and then ${lens[1]} completed sessions; skipped days don't count. Lock a phase to stay in it.</p>
        ${seg("phaseLock", [{ id: "auto", name: "Automatic" }, ...PHASES.map((x, i) => ({ id: String(i), name: x.name }))], pr.phaseLock == null || pr.phaseLock === "" ? "auto" : String(pr.phaseLock))}
        <div class="field"><span>Starting phase (for automatic mode)</span>${seg("startPhase", PHASES.map((x, i) => ({ id: String(i), name: x.name })), String(pr.startPhase || 0))}</div>
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

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Appearance</h3>
        ${seg("theme", [{ id: "system", name: "System" }, { id: "light", name: "Light" }, { id: "dark", name: "Dark" }], st.theme || "system")}
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
    if (t.dataset.f === "level") {
      updateProfile((pr) => setLevel(pr, t.value));
      draw();
    }
    else if (t.dataset.switch) {
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
    const sg = b.closest("[data-seg]");
    if (sg) {
      const name = sg.dataset.seg;
      const v = b.dataset.value;
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        if (name === "sex") pr.sex = v;
        else if (name === "units") pr.units = v;
        else if (name === "phaseLock") pr.phaseLock = v === "auto" ? null : Number(v);
        else if (name === "startPhase") pr.startPhase = Number(v);
        else if (name === "rest") pr.settings.restSec = Number(v);
        else if (name === "theme") pr.settings.theme = v;
      });
      if (name === "theme") applyTheme(v);
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
        location.hash = "#/setup";
      }
    }
  });

  draw();
}
