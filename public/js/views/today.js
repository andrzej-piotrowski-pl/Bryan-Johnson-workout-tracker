// Today (or any day): the session block by block, tick-offs and logging,
// optional add-ons, skip with a reason, swapping sessions, notes and extras.

import { DAYS } from "../data/program.js";
import { EXERCISES } from "../data/exercises.js";
import { onChange, state } from "../store.js";
import {
  EXTRA_TYPES, SKIP_REASONS, addonProgress, addonsForDate, blockItems, blockMins, countable, dayDef, dayMins,
  editDay, isRestKey, levelFor, progressOf, rxFor, sessionKeyFor, visible,
} from "../plan.js";
import { LEVELS, fmtWeight, kgUnit, levelIndex, personalize } from "../personalize.js";
import { addDays, daysBetween, esc, fmtDate, fmtShort, parseIso, todayIso, uid, weekdayKey } from "../util.js";
import { EQUIPMENT_NAMES, icon } from "../components/icons.js";
import { createExercisePanel } from "../components/exercise-panel.js";
import { animBarOpen } from "../components/anim-bar.js";
import { hasAnimStyles } from "../anim-styles.js";
import { getItemLog, editItem, summarizeLog } from "../components/logger.js";
import { confirmDialog, openDialog, ring, toast } from "../components/ui.js";
import { blockKind, detailMode, sessionKind } from "../themes.js";

const ENERGY = ["Very low", "Low", "OK", "Good", "Great"];
const STATUS_TEXT = { done: "Done", partial: "In progress", skipped: "Skipped" };

export function render(el, params) {
  const date = params[0] && /^\d{4}-\d{2}-\d{2}$/.test(params[0]) ? params[0] : todayIso();
  const isToday = date === todayIso();
  let selected = null; // { scope, id }
  let panel = null;
  let showSkipped = false;
  let lastStatus = state.days[date] ? state.days[date].status : null;
  let panelMode = detailMode();

  const log = () => state.days[date] || null;
  const profile = () => state.profile;

  function context() {
    const key = sessionKeyFor(date);
    const def = dayDef(key);
    return { key, def, level: levelFor(date), rest: isRestKey(key), swapped: !!(log() && log().session && log().session !== weekdayKey(date)) };
  }

  // ---------- rendering ----------

  function itemRow(item, level, scope) {
    const ex = EXERCISES[item.ex];
    if (!ex) return "";
    const l = getItemLog(date, scope, item.id);
    const info = !countable(item);
    const name = item.label ? personalize(item.label, profile()) : ex.name;
    const sel = selected && selected.scope === scope && selected.id === item.id;
    const summary = summarizeLog(l, ex.log);
    return `<li class="item${l && l.done ? " done" : ""}${info ? " info" : ""}" data-scope="${esc(scope)}" data-id="${esc(item.id)}" aria-selected="${sel}"${info ? "" : ` tabindex="0" aria-label="${esc(name)}: open details"`}>
      ${info ? `<span aria-hidden="true" style="display:grid;place-items:center;color:var(--muted)">${icon("list")}</span>` : `<input type="checkbox" class="tick" data-tick ${l && l.done ? "checked" : ""} aria-label="Done: ${esc(name)}">`}
      <div class="item-main">
        <div class="item-name">${esc(name)}${ex.classic ? ' <span class="badge-classic">classic</span>' : ""}</div>
        <div class="item-rx">${esc(personalize(rxFor(item, level), profile()))}</div>
        ${item.bryan ? `<div class="item-b">${esc(personalize(item.bryan, profile()))}</div>` : ""}
        <div class="item-log" data-summary>${esc(summary)}</div>
      </div>
      <div class="item-side">${(ex.equipment || []).slice(0, 3).map((e) => `<span title="${esc(EQUIPMENT_NAMES[e] || e)}">${icon(e, "sm")}</span>`).join("")}${icon("chevronR", "sm")}</div>
    </li>`;
  }

  function blocksHtml(def, level) {
    return def.blocks
      .map((b) => {
        const items = blockItems(b, level);
        if (!items.length) return "";
        return `<section class="card block" data-kind="${blockKind(b.name)}">
          <div class="block-head"><h3>${esc(b.name)}</h3><span class="eyebrow">≈${blockMins(b, level)} min</span></div>
          ${b.note ? `<p class="block-note">${esc(personalize(b.note, profile()))}</p>` : ""}
          <ul class="items">${items.map((it) => itemRow(it, level, "main")).join("")}</ul>
        </section>`;
      })
      .join("");
  }

  function addonHtml(entry, level) {
    const { addon, variant, optional } = entry;
    const a = (log() && log().addons && log().addons[addon.id]) || {};
    const prog = addonProgress(log(), entry, level);
    const items = variant.items.filter((it) => visible(it, level));
    const metrics = (addon.metrics || [])
      .map((m) => {
        const v = a.metrics ? a.metrics[m.id] : null;
        const btns = [];
        for (let i = m.min; i <= m.max; i++) btns.push(`<button type="button" data-metric="${esc(m.id)}" data-v="${i}" aria-pressed="${v === i}">${i}</button>`);
        return `<div class="field"><span>${esc(m.label)} <small class="muted">(${esc(m.low)} → ${esc(m.high)})</small></span><div class="scale">${btns.join("")}</div></div>`;
      })
      .join("");
    const due = (addon.periodic || []).filter((pd) => isDue(addon.id, pd));
    const periodic = due
      .map((pd) => `<label class="banner hint" style="align-items:center"><input type="checkbox" class="tick" data-periodic="${esc(pd.id)}" ${a.periodic && a.periodic[pd.id] ? "checked" : ""}><span class="grow"><b>Due today</b><span>${esc(pd.label)}</span></span></label>`)
      .join("");
    return `<section class="card block addon-scope" data-addon="${esc(addon.id)}">
      <div class="block-head">
        <div class="addon-head">${icon(addon.icon || "sparkle", "lg")}<h3>${esc(addon.name)}</h3><span class="chip addon">${optional ? "Optional today" : "Add-on"}</span></div>
        <span class="eyebrow" data-addon-prog>${prog.skipped ? "skipped" : `${prog.done}/${prog.total} · ≈${variant.mins} min`}</span>
      </div>
      <p class="block-note">${esc(variant.name)}. ${esc(variant.note || "")}</p>
      ${
        a.skipped
          ? `<div class="banner skip" style="margin:0 20px 16px"><div class="grow"><b>Skipped today</b>${a.skipReason ? `<span>${esc(a.skipReason)}</span>` : ""}</div><button type="button" class="btn sm" data-addon-unskip>${icon("undo", "sm")} Undo</button></div>`
          : `<ul class="items">${items.map((it) => itemRow(it, level, addon.id)).join("")}</ul>
             <div style="padding:6px 20px 18px;display:grid;gap:14px">${metrics}${periodic}
               <div class="btn-row"><button type="button" class="btn sm" data-addon-all>${icon("check", "sm")} Mark all done</button><button type="button" class="btn sm ghost skip" data-addon-skip>${icon("skip", "sm")} Skip ${esc(addon.short || addon.name)} today</button></div>
             </div>`
      }
    </section>`;
  }

  // A periodic check shows until done, then hides for `every` days.
  function isDue(addonId, pd) {
    if (date > todayIso()) return false;
    const here = log() && log().addons && log().addons[addonId] && log().addons[addonId].periodic;
    if (here && here[pd.id] != null) return true;
    const prior = Object.keys(state.days).filter((d) => d < date).sort().reverse();
    for (const d of prior) {
      const a = state.days[d].addons && state.days[d].addons[addonId];
      if (a && a.periodic && a.periodic[pd.id]) return daysBetween(d, date) >= pd.every;
    }
    return true;
  }

  function obsHtml() {
    const l = log() || {};
    const u = kgUnit(profile());
    const rpe = Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}" aria-pressed="${l.rpe === i + 1}">${i + 1}</button>`).join("");
    const energy = ENERGY.map((e, i) => `<button type="button" data-energy="${i + 1}" aria-pressed="${l.energy === i + 1}">${esc(e)}</button>`).join("");
    const extras = (l.extras || [])
      .map(
        (x) => `<div class="extra-row" data-extra="${esc(x.id)}">
          <select class="input" data-x="type" aria-label="Activity">${EXTRA_TYPES.map((t) => `<option value="${t.id}" ${x.type === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
          <input class="input num" data-x="min" inputmode="numeric" placeholder="min" value="${esc(x.min ?? "")}" aria-label="Minutes">
          <input class="input num" data-x="avg" inputmode="numeric" placeholder="bpm" value="${esc(x.avg ?? "")}" aria-label="Average heart rate">
          <select class="input" data-x="intensity" aria-label="Intensity"><option value="zone2" ${x.intensity !== "hard" && x.intensity !== "light" ? "selected" : ""}>Easy / Zone 2</option><option value="hard" ${x.intensity === "hard" ? "selected" : ""}>Hard</option><option value="light" ${x.intensity === "light" ? "selected" : ""}>Light</option></select>
          <button type="button" class="btn sm icon-only ghost" data-x-del aria-label="Remove activity">${icon("trash", "sm")}</button>
        </div>`
      )
      .join("");
    return `<section class="card card-pad obs">
      <div class="section-title"><h2>Notes & observations</h2><span class="eyebrow">saved automatically</span></div>
      <div class="obs-ratings">
        <div class="rating-line"><span class="label" title="1 = very easy, 10 = maximum">Session effort <small>(1–10)</small></span><div class="scale" role="group" aria-label="Session effort, 1 very easy to 10 maximum">${rpe}</div></div>
        <div class="rating-line"><span class="label">Energy today</span><div class="seg" role="group" aria-label="Energy today">${energy}</div></div>
      </div>
      <label class="field"><span>Notes</span><textarea class="input" data-notes rows="3" placeholder="How did it go? Anything sore, any wins, what to change next time…">${esc(l.notes || "")}</textarea></label>
      <div class="field"><span>Extra activity <small>· counts toward your weekly minutes</small></span>
        <div class="extras">${extras}</div>
        <div><button type="button" class="btn sm" data-x-add>${icon("plus", "sm")} Add activity</button></div>
      </div>
      <label class="field" style="max-width:220px"><span>Body weight today (optional, ${esc(u)})</span><input class="input num" data-bw inputmode="decimal" value="${l.bodyWeightKg != null ? esc(u === "lb" ? Math.round(l.bodyWeightKg * 2.20462 * 10) / 10 : l.bodyWeightKg) : ""}" placeholder="${esc(fmtWeight(profile(), profile() && profile().weightKg).replace(/ (kg|lb)$/, ""))}"></label>
    </section>`;
  }

  function missedHint(ctx) {
    if (!isToday || ctx.rest) return "";
    const l = log();
    if (l && (l.status || l.skip || l.session)) return "";
    try {
      if (localStorage.getItem("hp:hint:" + date)) return "";
    } catch {}
    for (let i = 1; i <= 2; i++) {
      const d = addDays(date, -i);
      if (parseIso(d) < parseIso(profile().startDate || d)) break;
      const key = weekdayKey(d);
      if (isRestKey(key)) break;
      const prev = state.days[d];
      if (prev && (prev.status === "done" || prev.status === "partial")) break;
      const def = dayDef(key);
      return `<div class="banner hint"><span>${icon("info")}</span><div class="grow"><b>You missed ${esc(def.name)}'s session (${esc(def.title)}).</b><span>You can do it today instead of today's session — don't do both in one day.</span></div><div class="btn-row"><button type="button" class="btn sm" data-swap-to="${esc(key)}">Do ${esc(def.short)}'s session</button><button type="button" class="btn sm ghost" data-hint-off aria-label="Dismiss">${icon("x", "sm")}</button></div></div>`;
    }
    return "";
  }

  function heroHtml(ctx) {
    const { def, level, rest } = ctx;
    const l = log();
    const st = l && l.status;
    const prog = progressOf(l || { date, items: {}, session: ctx.key });
    const addons = addonsForDate(date);
    const addonMins = addons.filter((a) => !a.optional).reduce((s, a) => s + (a.variant.mins || 0), 0);
    const total = rest ? 0 : prog.total || def.blocks.flatMap((b) => blockItems(b, level)).filter(countable).length;
    const done = prog.done;
    // A day already logged keeps the level it was done at.
    const levelLine = level !== levelIndex(profile()) ? `Logged at ${LEVELS[level].name} level` : `${LEVELS[level].name} level`;
    const swapOptions = DAYS.filter((d) => d.blocks.length)
      .map((d) => `<option value="${d.key}" ${ctx.key === d.key ? "selected" : ""}>${esc(d.name)}: ${esc(d.title)}</option>`)
      .join("");
    return `<section class="card hero${rest ? " rest" : ""}">
      <div class="hero-top">
        <div style="display:grid;gap:10px;min-width:0">
          <span class="eyebrow">${esc(levelLine)}</span>
          <h1>${esc(rest ? "Rest day" : def.title)}</h1>
          <p class="focus">${esc(rest ? "No training today. Keep the posture habits; an easy walk is welcome. You can still log extra activity and notes below." : def.focus)}</p>
          <div class="chips">
            ${rest ? "" : `<span class="chip mono">${icon("clock", "sm")} ≈${dayMins(def, level)} min${addonMins ? ` + ${addonMins} min add-ons` : ""}</span>`}
            ${ctx.swapped ? `<span class="chip bryan">${icon("swap", "sm")} Doing ${esc(def.name)}'s session</span>` : ""}
            ${st ? `<span class="chip ${st === "skipped" ? "skip" : "accent"}" data-status>${esc(STATUS_TEXT[st] || st)}</span>` : `<span class="chip" data-status>${date > todayIso() ? "Planned" : isToday ? "Not started" : profile().startDate && date < profile().startDate ? "Before your start" : "Not logged"}</span>`}
          </div>
        </div>
        ${rest ? "" : `<div data-ring>${ring(done, total, 76)}</div>`}
      </div>
      <div class="btn-row">
        ${rest || (l && l.skip) ? "" : `<button type="button" class="btn primary" data-guided>${icon("play")} Start guided workout</button><button type="button" class="btn" data-all>${icon("check")} Mark all done</button>`}
        ${rest ? "" : l && l.skip ? "" : `<button type="button" class="btn ghost skip" data-skip>${icon("skip")} Skip day</button>`}
        <label class="btn" style="position:relative">${icon("swap")} <span>${rest ? "Train anyway" : "Swap session"}</span>
          <select data-swap aria-label="Swap session" style="position:absolute;inset:0;opacity:0;cursor:pointer"><option value="">${rest ? "Choose a session…" : "Today's own session"}</option>${swapOptions}</select>
        </label>
      </div>
    </section>`;
  }

  function skipBanner() {
    const l = log();
    if (!l || !l.skip) return "";
    const r = SKIP_REASONS.find((x) => x.id === l.skip.reason) || SKIP_REASONS[SKIP_REASONS.length - 1];
    return `<div class="banner skip"><span>${icon(r.icon, "lg")}</span><div class="grow"><b>Skipped: ${esc(r.name)}</b>${l.skip.note ? `<span>${esc(l.skip.note)}</span>` : ""}</div><div class="btn-row"><button type="button" class="btn sm" data-skip-edit>${icon("note", "sm")} Edit</button><button type="button" class="btn sm" data-unskip>${icon("undo", "sm")} Undo skip</button></div></div>`;
  }

  function draw(mobileSheet = false) {
    if (!profile()) return;
    const ctx = context();
    const l = log();
    const prev = addDays(date, -1);
    const next = addDays(date, 1);
    const showBlocks = !ctx.rest && (!(l && l.skip) || showSkipped);
    // Themes colour or arrange the page by the kind of session (see themes.js).
    document.documentElement.dataset.venue = ctx.rest ? "rest" : sessionKind(ctx.key);
    el.innerHTML = `<div class="page">
      <div class="day-layout today-layout">
        <div class="day-head">
          <div class="day-nav">
            <a class="btn sm icon-only" href="#/day/${prev}" aria-label="Previous day">${icon("chevronL")}</a>
            <a class="btn sm icon-only" href="#/day/${next}" aria-label="Next day">${icon("chevronR")}</a>
            <span class="date">${esc(fmtDate(date))}</span>
            ${isToday ? '<span class="chip accent">Today</span>' : `<a class="btn sm ghost" href="#/today">Back to today</a>`}
          </div>
          ${heroHtml(ctx)}
          ${skipBanner()}
          ${missedHint(ctx)}
          ${l && l.skip && !ctx.rest ? `<div><button type="button" class="btn sm ghost" data-show-skipped>${showSkipped ? "Hide" : "Show"} the session anyway</button></div>` : ""}
        </div>
        <div class="day-list">
          ${showBlocks ? blocksHtml(ctx.def, ctx.level) : ""}
          ${addonsForDate(date).map((a) => addonHtml(a, ctx.level)).join("")}
          ${obsHtml()}
        </div>
        <div class="detail-col"><div data-panel-host></div></div>
      </div>
    </div>`;
    if (panel) panel.dispose();
    panel = null;
    if (selected) showPanel(selected, mobileSheet);
    else autoselect(ctx);
    const r = el.querySelector("[data-ring] .ring-wrap");
    if (r) r.classList.add("intro");
  }

  function onLook() {
    const mode = detailMode();
    if (mode === panelMode) return;
    const mobileSheet = panelMode === "inline" && window.matchMedia("(max-width: 1180px)").matches;
    panelMode = mode;
    draw(mobileSheet);
  }

  function autoselect(ctx) {
    const inline = detailMode() === "inline";
    if (!inline && window.matchMedia("(max-width: 1180px)").matches) return;
    const rows = [...el.querySelectorAll(".item:not(.info)")];
    // While the animation style switcher is open, start on an exercise the styles apply to.
    const styled = animBarOpen() && rows.find((li) => hasAnimStyles((findItem(li.dataset.scope, li.dataset.id) || { item: {} }).item.ex));
    const first = styled || rows[0];
    if (first) select(first.dataset.scope, first.dataset.id, false);
  }

  function findItem(scope, id) {
    const ctx = context();
    if (scope === "main") {
      for (const b of ctx.def ? ctx.def.blocks : []) for (const it of b.items) if (it.id === id) return { item: it, level: ctx.level };
    } else {
      for (const a of addonsForDate(date)) if (a.addon.id === scope) for (const it of a.variant.items) if (it.id === id) return { item: it, level: ctx.level, scopeName: a.addon.name };
    }
    return null;
  }

  function select(scope, id, mobileSheet = true) {
    // Opened in place: a second click on the open exercise folds it away.
    if (detailMode() === "inline" && selected && selected.scope === scope && selected.id === id && el.querySelector(".inline-panel")) {
      closeInline();
      selected = null;
      el.querySelectorAll(".item").forEach((li) => li.setAttribute("aria-selected", "false"));
      return;
    }
    selected = { scope, id };
    el.querySelectorAll(".item").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.scope === scope && li.dataset.id === id)));
    showPanel(selected, mobileSheet);
  }

  function panelCtx(found) {
    return { exId: found.item.ex, item: found.item, date, level: found.level, scope: selected.scope, scopeName: found.scopeName, onChange: refreshStatus };
  }

  function closeInline() {
    if (panel) panel.dispose();
    panel = null;
    const host = el.querySelector(".inline-panel");
    if (host) host.remove();
  }

  // The exercise opens right under its row (the Course theme), at any width.
  function showInline(sel, found) {
    const li = el.querySelector(`.item[data-scope="${CSS.escape(sel.scope)}"][data-id="${CSS.escape(sel.id)}"]`);
    if (!li) return;
    let host = el.querySelector(".inline-panel");
    if (!host || host.previousElementSibling !== li) {
      closeInline();
      host = document.createElement("li");
      host.className = "inline-panel";
      li.after(host);
    }
    if (!panel) panel = createExercisePanel(host);
    panel.show(panelCtx(found));
  }

  function showPanel(sel, mobileSheet) {
    const found = findItem(sel.scope, sel.id);
    if (!found) return;
    if (detailMode() === "inline") return showInline(sel, found);
    const narrow = window.matchMedia("(max-width: 1180px)").matches;
    if (narrow) {
      if (!mobileSheet) return;
      const host = document.createElement("div");
      let sheetPanel;
      openDialog({
        title: EXERCISES[found.item.ex].name,
        content: host,
        sheet: true,
        hideTitle: true,
        onClose: () => {
          sheetPanel && sheetPanel.dispose();
          refreshStatus();
        },
      });
      sheetPanel = createExercisePanel(host);
      sheetPanel.show(panelCtx(found));
      return;
    }
    const host = el.querySelector("[data-panel-host]");
    if (!host) return;
    if (!panel) panel = createExercisePanel(host);
    panel.show(panelCtx(found));
  }

  // Updates ticks, summaries, the ring and status without re-rendering inputs.
  function refreshStatus() {
    const ctx = context();
    const l = log();
    el.querySelectorAll(".item[data-id]").forEach((li) => {
      const found = findItem(li.dataset.scope, li.dataset.id);
      if (!found) return;
      const il = getItemLog(date, li.dataset.scope, li.dataset.id);
      li.classList.toggle("done", !!(il && il.done));
      const cb = li.querySelector("[data-tick]");
      if (cb) cb.checked = !!(il && il.done);
      const s = li.querySelector("[data-summary]");
      if (s) s.textContent = summarizeLog(il, EXERCISES[found.item.ex].log);
    });
    if (!ctx.rest) {
      const prog = progressOf(l || { date, items: {}, session: ctx.key });
      const r = el.querySelector("[data-ring]");
      if (r) r.innerHTML = ring(prog.done, prog.total, 76);
    }
    const chip = el.querySelector("[data-status]");
    if (chip && l) {
      chip.textContent = l.status ? STATUS_TEXT[l.status] : isToday ? "Not started" : "Not logged";
      chip.className = `chip ${l.status === "skipped" ? "skip" : l.status ? "accent" : ""}`;
    }
    for (const a of addonsForDate(date)) {
      const pEl = el.querySelector(`[data-addon="${a.addon.id}"] [data-addon-prog]`);
      const pr = addonProgress(l, a, ctx.level);
      if (pEl) pEl.textContent = pr.skipped ? "skipped" : `${pr.done}/${pr.total} · ≈${a.variant.mins} min`;
    }
    if (l && l.status === "done" && lastStatus !== "done") toast("Session complete. Nice work!", { icon: "flame" });
    lastStatus = l && l.status;
  }

  // ---------- actions ----------

  function openSkip() {
    const l = log();
    const cur = (l && l.skip) || { reason: null, note: "" };
    const content = document.createElement("div");
    content.style.display = "grid";
    content.style.gap = "14px";
    content.innerHTML = `<p class="muted">Life happens. Logging why you skipped helps you spot patterns later; skipped days never count against you.</p>
      <div class="reason-grid">${SKIP_REASONS.map((r) => `<button type="button" data-reason="${r.id}" aria-pressed="${cur.reason === r.id}">${icon(r.icon)} ${esc(r.name)}</button>`).join("")}</div>
      <label class="field"><span>Note (optional)</span><textarea class="input" rows="3" data-skip-note placeholder="e.g. flight at 7 am, will do Tuesday's session tomorrow">${esc(cur.note || "")}</textarea></label>
      <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn primary" data-confirm>${icon("skip")} Skip ${date === todayIso() ? "today" : "this day"}</button></div>`;
    const d = openDialog({ title: "Skip this day", content, sheet: false });
    let reason = cur.reason || "other";
    content.addEventListener("click", (e) => {
      const r = e.target.closest("[data-reason]");
      if (r) {
        reason = r.dataset.reason;
        content.querySelectorAll("[data-reason]").forEach((b) => b.setAttribute("aria-pressed", String(b === r)));
      }
      if (e.target.closest("[data-cancel]")) d.close();
      if (e.target.closest("[data-confirm]")) {
        const note = content.querySelector("[data-skip-note]").value.trim();
        editDay(date, (day) => {
          day.skip = { reason, note };
        });
        d.close();
        showSkipped = false;
        selected = null;
        draw();
        toast("Day skipped. Rest well.", { icon: "skip" });
      }
    });
  }

  el.addEventListener("click", async (e) => {
    const t = e.target;
    const tick = t.closest("[data-tick]");
    if (tick) {
      const li = tick.closest(".item");
      const found = findItem(li.dataset.scope, li.dataset.id);
      if (found) editItem(date, li.dataset.scope, found.item, (l) => (l.done = tick.checked));
      refreshStatus();
      if (panel && selected && selected.id === li.dataset.id) showPanel(selected, false);
      return;
    }
    const periodic = t.closest("[data-periodic]");
    if (periodic) {
      const aid = periodic.closest("[data-addon]").dataset.addon;
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].periodic = d.addons[aid].periodic || {};
        d.addons[aid].periodic[periodic.dataset.periodic] = periodic.checked;
      });
      return;
    }
    const li = t.closest(".item");
    if (li && !li.classList.contains("info") && !t.closest("input")) {
      select(li.dataset.scope, li.dataset.id, true);
      return;
    }
    const b = t.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-guided")) {
      const { startGuided } = await import("./guided.js");
      startGuided(date, () => {
        draw();
      });
    } else if (b.hasAttribute("data-all")) {
      const ctx = context();
      editDay(date, (d) => {
        for (const bl of ctx.def.blocks) for (const it of blockItems(bl, ctx.level)) if (countable(it)) {
          d.items[it.id] = d.items[it.id] || { ex: it.ex };
          d.items[it.id].done = true;
        }
      });
      refreshStatus();
      if (panel && selected) showPanel(selected, false);
    } else if (b.hasAttribute("data-skip") || b.hasAttribute("data-skip-edit")) openSkip();
    else if (b.hasAttribute("data-unskip")) {
      editDay(date, (d) => {
        d.skip = null;
      });
      draw();
    } else if (b.hasAttribute("data-show-skipped")) {
      showSkipped = !showSkipped;
      draw();
    } else if (b.dataset.swapTo) {
      editDay(date, (d) => {
        d.session = b.dataset.swapTo;
      });
      selected = null;
      draw();
    } else if (b.hasAttribute("data-hint-off")) {
      try {
        localStorage.setItem("hp:hint:" + date, "1");
      } catch {}
      b.closest(".banner").remove();
    } else if (b.dataset.rpe) {
      editDay(date, (d) => {
        d.rpe = d.rpe === Number(b.dataset.rpe) ? null : Number(b.dataset.rpe);
      });
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(log().rpe === Number(x.dataset.rpe))));
    } else if (b.dataset.energy) {
      editDay(date, (d) => {
        d.energy = d.energy === Number(b.dataset.energy) ? null : Number(b.dataset.energy);
      });
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(log().energy === Number(x.dataset.energy))));
    } else if (b.dataset.metric) {
      const aid = b.closest("[data-addon]").dataset.addon;
      const v = Number(b.dataset.v);
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].metrics = d.addons[aid].metrics || {};
        d.addons[aid].metrics[b.dataset.metric] = d.addons[aid].metrics[b.dataset.metric] === v ? null : v;
      });
      const cur = log().addons[aid].metrics[b.dataset.metric];
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.v) === cur)));
    } else if (b.hasAttribute("data-addon-all")) {
      const aid = b.closest("[data-addon]").dataset.addon;
      const entry = addonsForDate(date).find((a) => a.addon.id === aid);
      const level = context().level;
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].items = d.addons[aid].items || {};
        for (const it of entry.variant.items) if (visible(it, level)) d.addons[aid].items[it.id] = { ...(d.addons[aid].items[it.id] || {}), ex: it.ex, done: true };
      });
      refreshStatus();
    } else if (b.hasAttribute("data-addon-skip")) {
      const aid = b.closest("[data-addon]").dataset.addon;
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].skipped = true;
      });
      draw();
    } else if (b.hasAttribute("data-addon-unskip")) {
      const aid = b.closest("[data-addon]").dataset.addon;
      editDay(date, (d) => {
        if (d.addons[aid]) d.addons[aid].skipped = false;
      });
      draw();
    } else if (b.hasAttribute("data-x-add")) {
      editDay(date, (d) => {
        d.extras = d.extras || [];
        d.extras.push({ id: uid(), type: "desk", min: null, avg: null, intensity: "zone2" });
      });
      draw();
    } else if (b.hasAttribute("data-x-del")) {
      const id = b.closest("[data-extra]").dataset.extra;
      if (await confirmDialog({ title: "Remove activity?", message: "This removes the activity from this day.", confirm: "Remove", danger: true })) {
        editDay(date, (d) => {
          d.extras = (d.extras || []).filter((x) => x.id !== id);
        });
        draw();
      }
    }
  });

  // Keyboard: Enter or Space on a row opens the exercise.
  el.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".item[tabindex]")) {
      e.preventDefault();
      select(e.target.dataset.scope, e.target.dataset.id, true);
    }
  });

  el.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-swap]")) {
      const v = t.value;
      editDay(date, (d) => {
        d.session = v && v !== weekdayKey(date) ? v : null;
      });
      selected = null;
      draw();
    } else if (t.matches("[data-x]") && t.tagName === "SELECT") {
      const id = t.closest("[data-extra]").dataset.extra;
      editDay(date, (d) => {
        const x = d.extras.find((y) => y.id === id);
        if (x) x[t.dataset.x] = t.value;
      });
    }
  });

  el.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-notes]")) editDay(date, (d) => (d.notes = t.value), { delay: 900 });
    else if (t.matches("[data-bw]")) {
      const v = Number(String(t.value).replace(",", "."));
      const kg = t.value === "" || !Number.isFinite(v) ? null : kgUnit(profile()) === "lb" ? Math.round((v / 2.20462) * 10) / 10 : v;
      editDay(date, (d) => (d.bodyWeightKg = kg), { delay: 900 });
    } else if (t.matches("[data-x]") && t.tagName === "INPUT") {
      const id = t.closest("[data-extra]").dataset.extra;
      const v = t.value === "" ? null : Number(t.value);
      editDay(date, (d) => {
        const x = d.extras.find((y) => y.id === id);
        if (x) x[t.dataset.x] = Number.isFinite(v) ? v : null;
      });
    }
  });

  const unsub = onChange((evt) => {
    if (evt.type === "all" || evt.type === "profile") draw();
  });
  window.addEventListener("hp:look", onLook);
  draw();

  // The detail panel is sticky and can be taller than the window: let it scroll first, then the page.
  const onWheel = (e) => {
    const col = el.querySelector(".detail-col");
    if (!col || e.ctrlKey || e.deltaY === 0 || !col.offsetParent || col.getBoundingClientRect().top > window.innerHeight) return;
    if (e.target.closest && e.target.closest(".modal, .sheet, .guided, textarea, select")) return;
    const max = col.scrollHeight - col.clientHeight;
    if (max <= 1) return;
    const down = e.deltaY > 0;
    if (down ? col.scrollTop < max - 1 : col.scrollTop > 0 && window.scrollY <= 0) {
      e.preventDefault();
      col.scrollTop += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    }
  };
  window.addEventListener("wheel", onWheel, { passive: false });
  return {
    destroy() {
      unsub();
      window.removeEventListener("hp:look", onLook);
      window.removeEventListener("wheel", onWheel);
      if (panel) panel.dispose();
      delete document.documentElement.dataset.venue;
    },
  };
}
