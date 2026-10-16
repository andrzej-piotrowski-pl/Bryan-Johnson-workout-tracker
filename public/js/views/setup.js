// First-run setup: who you are (for heart-rate zones and starting loads),
// your training level, units, equipment names and links, start date and add-ons.

import { ADDONS } from "../data/addons/index.js";
import { EQUIPMENT } from "../data/program.js";
import { EXERCISES } from "../data/exercises.js";
import { setProfile, state } from "../store.js";
import { LEVELS, SEXES, bpmRange, defaultProfile, fmtLoad, hrMax } from "../personalize.js";
import { esc, todayIso } from "../util.js";
import { icon } from "../components/icons.js";
import { levelPickerHtml } from "../components/level-picker.js";
import { createStagePanel } from "../components/stage-panel.js";
import { createEquipmentEditor } from "../components/equipment-editor.js";
import { seg } from "../components/ui.js";
import { applyLook, skinById, skinPickerHtml } from "../themes.js";

const STEPS = ["Welcome", "Theme", "About you", "Your level", "Equipment", "Add-ons", "Ready"];
const LB = 2.20462;
// Accessories with an example animation, in the order they're shown.
const GEAR = [...EQUIPMENT.have, ...EQUIPMENT.add].filter((g) => g.ex);

function gearUse(g) {
  const ex = EXERCISES[g.ex];
  return `${icon(g.icon)}<span><b>${esc(g.i)}</b> <span class="muted">${esc(g.d)}</span><br><span class="muted">Example, ${esc(ex ? ex.name.toLowerCase() : g.ex)}:</span> ${esc(g.use)}</span>`;
}

export function render(el, params) {
  const redo = params.includes("redo");
  const draft = redo && state.profile ? structuredClone(state.profile) : defaultProfile();
  draft.settings = draft.settings || {};
  if (!redo) {
    // Keep whatever look this browser already shows (e.g. after "Reset everything").
    draft.settings.skin = document.documentElement.dataset.skin || "original";
    try {
      draft.settings.theme = JSON.parse(localStorage.getItem("hp:theme")) || "system";
    } catch {}
  }
  let step = redo && params.includes("equipment") ? 4 : 0;
  let equipmentEditor = null;
  let saved = false;
  let error = "";
  let gear = 0;
  let stage = null;

  const imperial = () => draft.units === "imperial";
  const wShow = (kg) => (kg == null ? "" : imperial() ? Math.round(kg * LB) : kg);
  const hShow = (cm) => (cm == null ? "" : imperial() ? Math.round(cm / 2.54) : cm);

  function stepBody() {
    if (step === 0) {
      return `<p>This app plans and tracks a six-day home workout built from <b>Bryan Johnson's public exercise protocol</b>: strength three days a week, short intervals, the Norwegian 4×4, Zone 2, balance and mobility, rebuilt for bodyweight, adjustable dumbbells, a pull-up bar and bands.</p>
        <div class="preview">
          <p>${icon("info")} <b>Unofficial.</b> Not affiliated with or endorsed by Bryan Johnson or Blueprint. It's a training plan, not medical advice.</p>
          <p>${icon("download")} <b>Your data stays with you.</b> ${state.mode === "server" ? `Everything is saved as files in the <code>${esc(state.dataDir)}/</code> folder on this computer.` : "No local server found, so data is kept in this browser. Run <code>npm start</code> to save to files instead."}</p>
        </div>
        <label class="field"><span>Your name (optional)</span><input class="input" data-f="name" value="${esc(draft.name)}" placeholder="Shown on the today screen" autocomplete="given-name"></label>`;
    }
    if (step === 1) {
      const sk = skinById(draft.settings.skin);
      return `<p class="muted">Pick a theme. Each one changes the layout, type and colours, and you see it right away. You can switch any time in Settings.</p>
        ${skinPickerHtml(sk.id)}
        <div class="field"><span>Light or dark</span>${sk.modes.length > 1 ? seg("mode", [{ id: "system", name: "Follow the system" }, { id: "light", name: "Light" }, { id: "dark", name: "Dark" }], draft.settings.theme || "system") : `<small>${esc(sk.name)} is always dark.</small>`}</div>`;
    }
    if (step === 2) {
      return `<p class="muted">Used to set your heart-rate zones and scale the starting weights. Nothing leaves this computer.</p>
        <div class="field"><span>Units</span>${seg("units", [{ id: "metric", name: "Metric (kg, cm)" }, { id: "imperial", name: "Imperial (lb, in)" }], draft.units, "accent")}</div>
        <div class="grid-form">
          <label class="field"><span>Age</span><input class="input" data-f="age" inputmode="numeric" value="${esc(draft.age)}"></label>
          <label class="field"><span>Weight (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="weight" inputmode="decimal" value="${esc(wShow(draft.weightKg))}"></label>
          <label class="field"><span>Height (${imperial() ? "in" : "cm"}, optional)</span><input class="input" data-f="height" inputmode="decimal" value="${esc(hShow(draft.heightCm))}"></label>
        </div>
        <div class="field"><span>Sex <small>(only used to scale starting weights)</small></span>${seg("sex", SEXES, draft.sex)}</div>`;
    }
    if (step === 3) {
      const ex = (lo, hi) => fmtLoad(draft, lo, hi);
      return `<div class="field"><span>Where are you starting from?</span>${levelPickerHtml(draft.level)}</div>
        <div class="grid-form">
          <label class="field"><span>Measured max heart rate (optional)</span><input class="input" data-f="hrmax" inputmode="numeric" value="${esc(draft.hrMax ?? "")}" placeholder="${hrMax({ age: draft.age })} (estimated)"><small>Leave empty to estimate from age.</small></label>
          <label class="field"><span>Start date</span><input class="input" type="date" data-f="start" value="${esc(draft.startDate)}"></label>
        </div>
        <div class="preview"><b>Your numbers</b><dl>
          <dt>Max heart rate</dt><dd>${hrMax(draft)} bpm</dd>
          <dt>Zone 2</dt><dd>${bpmRange(draft, 60, 70)}</dd>
          <dt>4×4 hard minutes</dt><dd>${bpmRange(draft, 85, 95)}</dd>
          <dt>Goblet squat</dt><dd>${ex(10, 14)}</dd>
          <dt>Dumbbell row</dt><dd>${ex(14, 16)}</dd>
          <dt>Overhead press</dt><dd>2 × ${ex(6, 8)}</dd>
        </dl><small class="muted">Starting weights, scaled to your level, weight, sex and age. The effort target of your level (reps left in the tank) decides the real weight.</small></div>`;
    }
    if (step === 4) {
      return `<p class="muted"><b>Optional.</b> Add equipment names and links now, or skip this step and add them later in Settings. The examples show the small accessories used by the home plan.</p>
        <div class="gear-demo card"><div class="stage-host"></div><p class="gear-use">${gearUse(GEAR[gear])}</p></div>
        <div class="gear-grid">${GEAR.map(
          (x, i) => `<button type="button" class="choice gear" data-gear="${i}" aria-pressed="${i === gear}">${icon(x.icon)}<b>${esc(x.i)}</b></button>`
        ).join("")}</div>
        <div data-equipment-editor></div>
        <p class="muted" style="font-size:0.88rem">Missing something? Check the easier version and home swaps in <i>The plan</i>. Massage devices are optional extras, not prescribed exercise.</p>
        <label class="field" style="max-width:320px"><span>Heaviest dumbbell you have (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="maxdb" inputmode="decimal" value="${esc(wShow(draft.maxDumbbellKg))}"><small>Suggested weights are capped at this.</small></label>`;
    }
    if (step === 5) {
      return `<p class="muted">Optional extras that show up after the main session, tracked the same way. You can change this any time in Settings.</p>
        ${ADDONS.map(
          (a) => `<label class="addon-card">${icon(a.icon || "sparkle")}<span style="display:grid;gap:4px"><b>${esc(a.name)}</b><small class="muted">${esc(a.description)}</small></span><span class="switch"><input type="checkbox" data-addon="${esc(a.id)}" ${draft.addons && draft.addons[a.id] ? "checked" : ""} aria-label="${esc(a.name)}"><span></span></span></label>`
        ).join("")}
        <p class="muted" style="font-size:0.85rem">More add-ons can be added later (see the README).</p>`;
    }
    const lvl = LEVELS.find((l) => l.id === draft.level);
    return `<div class="preview"><dl>
        ${draft.name ? `<dt>Name</dt><dd>${esc(draft.name)}</dd>` : ""}
        <dt>Age, weight</dt><dd>${esc(draft.age)} · ${esc(wShow(draft.weightKg))} ${imperial() ? "lb" : "kg"}</dd>
        <dt>Level</dt><dd>${esc(lvl ? lvl.name : "")}</dd>
        <dt>Theme</dt><dd>${esc(skinById(draft.settings.skin).name)}</dd>
        <dt>Starts</dt><dd>${esc(draft.startDate)}</dd>
        <dt>Zone 2</dt><dd>${bpmRange(draft, 60, 70)}</dd>
        <dt>Add-ons</dt><dd>${esc(ADDONS.filter((a) => draft.addons && draft.addons[a.id]).map((a) => a.name).join(", ") || "None")}</dd>
      </dl></div>
      <p>Your week: <b>Mon</b> strength, <b>Tue</b> short intervals + Zone 2, <b>Wed</b> strength + mobility, <b>Thu</b> Norwegian 4×4 + stability, <b>Fri</b> power + strength, <b>Sat</b> controlled vigorous cardio + Zone 2 + long stretch, <b>Sun</b> rest. Tap any exercise to see a 3D animation, Bryan's own video at the right minute and demos.</p>`;
  }

  function draw() {
    equipmentEditor?.destroy();
    equipmentEditor = null;
    if (stage) stage.dispose();
    stage = null;
    el.innerHTML = `<div class="setup"><div class="card setup-card">
      <div class="setup-head">
        <div class="steps">${STEPS.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
        <span class="eyebrow">Step ${step + 1} of ${STEPS.length} · ${esc(STEPS[step])}</span>
        <h1>${step === 0 ? "Home Protocol" : esc(STEPS[step])}</h1>
      </div>
      <div class="setup-body">${stepBody()}${error ? `<p style="color:var(--danger)">${esc(error)}</p>` : ""}</div>
      <div class="setup-foot">
        ${step > 0 ? `<button type="button" class="btn" data-back>${icon("chevronL")} Back</button>` : redo ? `<a class="btn" href="#/settings">Cancel</a>` : "<span></span>"}
        ${step === 4 ? '<button type="button" class="btn ghost" data-skip-equipment>Skip for now</button>' : ""}
        <button type="button" class="btn primary" data-next>${step === STEPS.length - 1 ? `${icon("check")} ${redo ? "Save" : "Start training"}` : `Next ${icon("chevronR")}`}</button>
      </div>
    </div></div>`;
    const editorHost = el.querySelector("[data-equipment-editor]");
    if (editorHost) equipmentEditor = createEquipmentEditor(editorHost, { profile: () => draft, save: (fn) => fn(draft) });
    const host = el.querySelector(".gear-demo .stage-host");
    if (host) {
      stage = createStagePanel(host);
      stage.load(GEAR[gear].ex);
    }
  }

  function validate() {
    if (step === 4) {
      const invalid = [...el.querySelectorAll("[data-equipment-id]")].filter((row) => row.querySelector('[data-equipment-field="owned"]').checked).map((row) => row.querySelector("input:invalid")).find(Boolean);
      if (invalid) { invalid.reportValidity(); return "Please check the equipment name or product link."; }
    }
    if (step === 2) {
      const age = Number(draft.age);
      if (!(age >= 14 && age <= 99)) return "Please enter an age between 14 and 99.";
      if (!(draft.weightKg >= 30 && draft.weightKg <= 250)) return "Please enter your weight.";
    }
    return "";
  }

  el.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    const v = e.target.value;
    const n = Number(String(v).replace(",", "."));
    if (f === "name") draft.name = v;
    else if (f === "age") draft.age = Math.round(n) || "";
    else if (f === "weight") draft.weightKg = Number.isFinite(n) && v !== "" ? Math.round((imperial() ? n / LB : n) * 10) / 10 : null;
    else if (f === "height") draft.heightCm = Number.isFinite(n) && v !== "" ? Math.round(imperial() ? n * 2.54 : n) : null;
    else if (f === "maxdb") draft.maxDumbbellKg = Number.isFinite(n) && v !== "" ? Math.round((imperial() ? n / LB : n) * 10) / 10 : null;
    else if (f === "hrmax") draft.hrMax = Number.isFinite(n) && n > 100 ? Math.round(n) : null;
    else if (f === "start") draft.startDate = v || todayIso();
    if (step === 3 && f !== "start") {
      // Refresh the preview numbers without losing focus.
      const preview = el.querySelector(".preview");
      const tmp = document.createElement("div");
      tmp.innerHTML = stepBody();
      const fresh = tmp.querySelector(".preview");
      if (preview && fresh) preview.replaceWith(fresh);
    }
  });

  el.addEventListener("change", (e) => {
    if (e.target.dataset.addon) {
      draft.addons = draft.addons || {};
      draft.addons[e.target.dataset.addon] = e.target.checked;
    }
  });

  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.skin) {
      draft.settings.skin = b.dataset.skin;
      applyLook(draft.settings);
      draw();
      el.querySelector(`[data-skin="${b.dataset.skin}"]`).focus();
      return;
    }
    const segEl = b.closest("[data-seg]");
    if (segEl) {
      const name = segEl.dataset.seg;
      const v = b.dataset.value;
      if (name === "mode") {
        draft.settings.theme = v;
        applyLook(draft.settings);
      } else if (name === "units") draft.units = v;
      else if (name === "sex") draft.sex = v;
      draw();
      return;
    }
    if (b.dataset.level) {
      draft.level = b.dataset.level;
      draw();
      return;
    }
    if (b.dataset.gear) {
      gear = Number(b.dataset.gear);
      el.querySelectorAll("[data-gear]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      el.querySelector(".gear-use").innerHTML = gearUse(GEAR[gear]);
      if (stage) stage.load(GEAR[gear].ex);
      return;
    }
    if (b.hasAttribute("data-back")) {
      step = Math.max(0, step - 1);
      error = "";
      draw();
      return;
    }
    if (b.hasAttribute("data-skip-equipment")) {
      draft.equipment = redo ? structuredClone(state.profile.equipment || []) : [];
      step += 1;
      error = "";
      draw();
      return;
    }
    if (b.hasAttribute("data-next")) {
      error = validate();
      if (error) return draw();
      if (step < STEPS.length - 1) {
        step += 1;
        draw();
        return;
      }
      draft.updatedAt = new Date().toISOString();
      saved = true;
      setProfile(draft);
      applyLook(draft.settings);
      location.hash = redo ? "#/settings" : "#/today";
    }
  });

  draw();
  return {
    destroy() {
      equipmentEditor?.destroy();
      if (stage) stage.dispose();
      // Leaving a re-run of setup without saving puts the saved look back.
      if (redo && !saved && state.profile) applyLook(state.profile.settings);
    },
  };
}
