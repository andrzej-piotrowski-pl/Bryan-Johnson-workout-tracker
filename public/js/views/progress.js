// Progress: weekly sessions, Zone 2 and hard-cardio minutes against Bryan's
// targets, strength progression per exercise, posture stiffness and body weight.

import { EXERCISES } from "../data/exercises.js";
import { state, updateProfile } from "../store.js";
import { countsAsSession, currentReadiness, liftHistory, logLevel, weekStats } from "../plan.js";
import { LEVELS, kgUnit, levelIndex } from "../personalize.js";
import { addDays, esc, fmtDate, fmtShort, parseIso, weekStart } from "../util.js";
import { PROGRESS_RANGES, inProgressRange, progressBeginning, progressRange } from "../progress-ranges.js";
import { icon } from "../components/icons.js";
import { mountChart, tableHtml } from "../components/charts.js";
import { toast } from "../components/ui.js";

export function render(el) {
  let range = "12w";
  let lift = null;
  const charts = [];
  const tables = new Set();

  const u = () => kgUnit(state.profile);
  const dated = (date) => fmtDate(date, { day: "numeric", month: "short", year: "numeric" });
  const toUnit = (kg) => (u() === "lb" ? Math.round(kg * 2.20462) : kg);

  function weeks(selected) {
    const out = [];
    for (let start = weekStart(selected.start); start <= selected.end; start = addDays(start, 7)) {
      out.push({ start, s: weekStats(start, { from: selected.start, to: selected.end }) });
    }
    return out;
  }

  function lifts(selected) {
    return Object.entries(EXERCISES)
      .filter(([, e]) => e.log === "load" || e.log === "reps")
      .map(([id, e]) => ({ id, name: e.name, hist: liftHistory(id).filter((h) => inProgressRange(h.date, selected)) }))
      .filter((x) => x.hist.length);
  }

  function addonSeries(addonId, metricId, selected) {
    return Object.keys(state.days)
      .filter((d) => inProgressRange(d, selected))
      .sort()
      .map((d) => {
        const a = state.days[d].addons && state.days[d].addons[addonId];
        const v = a && a.metrics ? a.metrics[metricId] : null;
        return v == null ? null : { x: parseIso(d), value: v, label: dated(d), short: fmtShort(d) };
      })
      .filter(Boolean);
  }

  function card(id, title, sub, spec, headers) {
    const showTable = tables.has(id);
    return `<section class="card chart-card" data-chart="${id}">
      <div class="section-title"><div><h3>${esc(title)}</h3><p class="sub">${esc(sub)}</p></div><button type="button" class="btn sm ghost" data-table="${id}">${icon(showTable ? "progress" : "list", "sm")} ${showTable ? "Chart" : "Table"}</button></div>
      ${showTable ? tableHtml(spec, headers) : `<div class="chart" data-host="${id}"></div>`}
    </section>`;
  }

  // The plan's own move-up checkpoints, with the session count and the two
  // questions from the level notes. Nothing changes level without a tap.
  function levelCard() {
    const rd = currentReadiness();
    const lvl = levelIndex(state.profile);
    const current = LEVELS[lvl];
    if (!rd) {
      const prev = lvl > 0 ? LEVELS[lvl - 1] : null;
      return `<section class="card card-pad level-check">
        <div class="section-title"><div><h3>Training level</h3><p class="sub">The plan's checkpoint card.</p></div><span class="chip accent">${esc(current.name)}</span></div>
        <p class="muted">This is the full plan. There is no level above it; after illness, injury or a long break, the plan says step down for a while.</p>
        ${prev ? `<div class="btn-row"><button type="button" class="btn" data-level-down="${esc(prev.id)}">Step down to ${esc(prev.name)}</button></div>` : ""}
      </section>`;
    }
    const next = LEVELS.find((l) => l.id === rd.next);
    const pct = Math.min(100, Math.round((rd.sessions / rd.target) * 100));
    const remaining = Math.max(0, rd.target - rd.sessions);
    const questions = rd.questions.map((q) => `<label class="check-line"><input type="checkbox" data-readiness="${esc(q.id)}" ${rd.checks[q.id] ? "checked" : ""}> <span>${esc(q.label)}</span></label>`).join("");
    return `<section class="card card-pad level-check">
      <div class="section-title"><div><h3>Training level</h3><p class="sub">The plan's own move-up checkpoints. You change level; nothing moves on by itself.</p></div><span class="chip accent">${esc(current.name)}</span></div>
      <div class="level-meter"><div class="level-meter-bar"><i style="width:${pct}%"></i></div><span class="mono">${rd.sessions} / ${rd.target} sessions</span></div>
      <p class="muted">About ${rd.weeks} weeks at this level${remaining ? `; ${remaining} more ${remaining === 1 ? "session" : "sessions"} to the checkpoint` : ""}. Past logs keep their level.</p>
      <div class="check-list">${questions}</div>
      <div class="btn-row">
        <button type="button" class="btn primary" data-level-up="${esc(rd.next)}" ${rd.ready ? "" : "disabled"}>Move up to ${esc(next ? next.name : "next level")}</button>
        ${lvl > 0 ? `<button type="button" class="btn ghost" data-level-down="${esc(LEVELS[lvl - 1].id)}">Step down to ${esc(LEVELS[lvl - 1].name)}</button>` : ""}
      </div>
      <p class="muted" data-level-hint>${rd.ready ? "Both checkpoints are ticked and the session count is met." : "The button unlocks when the session count is met and both checkpoints are ticked."}</p>
    </section>`;
  }

  function draw() {
    charts.splice(0).forEach((c) => c.destroy());
    const selected = progressRange(range, state.profile, state.days);
    const W = weeks(selected);
    const sessions = { type: "columns", integer: true, title: "Sessions per week", target: 6, targetLabel: "6 a week", fmt: (v) => `${v} sessions`, data: W.map((w) => ({ label: `Week of ${dated(w.start)}`, short: fmtShort(w.start), value: w.s.sessions, sub: w.s.skipped ? `${w.s.skipped} skipped` : "" })) };
    const zone2 = { type: "columns", title: "Zone 2 minutes per week", target: 150, targetLabel: "Bryan: 150", fmt: (v) => `${v} min`, data: W.map((w) => ({ label: `Week of ${dated(w.start)}`, short: fmtShort(w.start), value: w.s.zone2 })) };
    const hard = { type: "columns", title: "Hard-cardio minutes per week", target: 75, targetLabel: "Bryan: 75", fmt: (v) => `${v} min`, data: W.map((w) => ({ label: `Week of ${dated(w.start)}`, short: fmtShort(w.start), value: w.s.hard })) };

    const L = lifts(selected);
    if (!lift || !L.find((x) => x.id === lift)) lift = L.length ? L.sort((a, b) => b.hist.length - a.hist.length)[0].id : null;
    const cur = L.find((x) => x.id === lift);
    const useKg = cur && cur.hist.some((h) => h.kg > 0);
    const liftSpec = cur
      ? {
          type: "line",
          title: cur.name,
          fmt: (v) => (useKg ? `${v} ${u()}` : `${v} reps`),
          data: cur.hist.map((h) => ({ x: parseIso(h.date), value: useKg ? toUnit(h.kg) : h.reps, label: dated(h.date), short: fmtShort(h.date), sub: useKg ? `${h.reps} reps` : "" })),
        }
      : null;
    const stiffness = state.profile && state.profile.addons && state.profile.addons.posture ? addonSeries("posture", "stiffness", selected) : [];
    const stiffSpec = { type: "line", title: "Neck & upper-back stiffness", yMin: 0, fmt: (v) => `${v} / 10`, data: stiffness };
    const bw = Object.keys(state.days)
      .sort()
      .filter((d) => inProgressRange(d, selected) && state.days[d].bodyWeightKg != null)
      .map((d) => ({ x: parseIso(d), value: toUnit(state.days[d].bodyWeightKg), label: dated(d), short: fmtShort(d) }));
    const bwSpec = { type: "line", title: "Body weight", fmt: (v) => `${v} ${u()}`, data: bw };

    const logged = Object.entries(state.days).filter(([date, d]) => inProgressRange(date, selected) && countsAsSession(d)).map(([, d]) => d);
    const total = logged.length;
    const beginning = progressBeginning(state.profile, state.days);
    const full = W.filter((w) => w.start >= selected.start && w.start >= beginning && addDays(w.start, 6) <= selected.end);
    const basis = full.length ? full : W;
    const avg = (k) => basis.reduce((a, w) => a + w.s[k], 0) / basis.length;
    const avgSess = avg("sessions").toFixed(1);
    const avgZ2 = Math.round(avg("zone2"));
    const avgNote = full.length ? `${full.length} full ${full.length === 1 ? "week" : "weeks"} in range` : "selected period";
    const lvl = levelIndex(state.profile);

    el.innerHTML = `<div class="page">
      <div class="section-title"><h2>Progress</h2></div>
      <section class="card card-pad progress-range" aria-label="Progress time interval">
        <div class="section-title"><h3>Time interval</h3><span class="range-dates" data-range-dates>${esc(dated(selected.start))} – ${esc(dated(selected.end))}</span></div>
        <div class="range-groups">${["Recent", "Longer"].map((group) => `<div class="range-group"><span class="label">${group}</span><div class="range-options${group === "Longer" ? " longer" : ""}" role="group" aria-label="${group} intervals">${PROGRESS_RANGES.filter((r) => r.group === group).map((r) => `<button type="button" data-range="${r.id}" aria-pressed="${range === r.id}">${r.name}</button>`).join("")}</div></div>`).join("")}</div>
        <p class="muted range-note">Last week runs from Monday to Sunday. Last month covers the previous calendar month. Charts and totals use the dates above, so the first and last weeks may be incomplete.</p>
      </section>
      <div class="kpis">
        <div class="card kpi"><span>Current level</span><b>${esc(LEVELS[lvl].name)}</b><span>${logged.filter((d) => logLevel(d) === lvl).length} sessions at this level in range</span></div>
        <div class="card kpi"><span>Sessions done</span><b>${total}</b><span>in selected interval</span></div>
        <div class="card kpi"><span>Sessions a week</span><b>${avgSess}</b><span>${avgNote} · plan: 6</span></div>
        <div class="card kpi"><span>Zone 2 a week</span><b>${avgZ2} min</b><span>${avgNote} · Bryan: 150</span></div>
      </div>
      ${levelCard()}
      <div class="charts">
        ${card("sessions", "Sessions per week", "Sessions count once at least half the exercises are done. The target is 6 a week.", sessions, ["Week", "Sessions"])}
        ${card("zone2", "Zone 2 minutes per week", "Includes Zone 2 blocks, easy recovery between 4×4 intervals and extra activity logged as Easy / Zone 2.", zone2, ["Week", "Minutes"])}
        ${card("hard", "Hard-cardio minutes per week", "Includes controlled vigorous cardio, hard intervals and extra activity logged as Hard. Brisk beginner intervals don't count.", hard, ["Week", "Minutes"])}
      </div>
      <div class="section-title"><h2 style="font-size:1.25rem">Strength</h2>
        ${L.length ? `<select class="input" data-lift style="max-width:320px" aria-label="Exercise">${L.map((x) => `<option value="${x.id}" ${x.id === lift ? "selected" : ""}>${esc(x.name)} (${x.hist.length})</option>`).join("")}</select>` : ""}
      </div>
      ${liftSpec ? `<div class="charts">${card("lift", liftSpec.title, useKg ? `Heaviest set per session (${u()}). Point details include the reps.` : "Most reps in one set per session.", liftSpec, ["Date", useKg ? u() : "Reps"])}</div>` : `<div class="card empty">No strength sets logged in these dates. Choose a longer interval or record a set during your workout.</div>`}
      ${stiffness.length || bw.length ? `<div class="charts">${stiffness.length ? card("stiff", "Neck & upper-back stiffness", "Your posture add-on ratings: 0 means no stiffness, 10 means very stiff. Lower scores mean less stiffness.", stiffSpec, ["Date", "Stiffness"]) : ""}${bw.length ? card("bw", "Body weight", "Weights recorded in each day's notes section.", bwSpec, ["Date", u()]) : ""}</div>` : ""}
    </div>`;

    const specs = { sessions, zone2, hard, lift: liftSpec, stiff: stiffSpec, bw: bwSpec };
    el.querySelectorAll("[data-host]").forEach((host) => {
      const spec = specs[host.dataset.host];
      if (spec && spec.data.length) charts.push(mountChart(host, spec));
      else host.innerHTML = `<p class="empty">No data yet.</p>`;
    });
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.range) {
      range = b.dataset.range;
      draw();
      el.querySelector(`[data-range="${range}"]`).focus({ preventScroll: true });
    } else if (b.dataset.table) {
      tables.has(b.dataset.table) ? tables.delete(b.dataset.table) : tables.add(b.dataset.table);
      draw();
    } else if (b.dataset.levelUp) {
      const id = b.dataset.levelUp;
      const name = (LEVELS.find((l) => l.id === id) || {}).name || id;
      updateProfile((p) => {
        p.level = id;
        p.levelCheck = null;
      });
      toast(`Level set to ${name}. Past logs keep the level they were done at.`);
      draw();
    } else if (b.dataset.levelDown) {
      const id = b.dataset.levelDown;
      const name = (LEVELS.find((l) => l.id === id) || {}).name || id;
      updateProfile((p) => {
        p.level = id;
        p.levelCheck = null;
      });
      toast(`Level set to ${name}. Past logs keep the level they were done at.`);
      draw();
    }
  });
  el.addEventListener("change", (e) => {
    if (e.target.matches("[data-lift]")) {
      lift = e.target.value;
      draw();
    } else if (e.target.matches("[data-readiness]")) {
      const checks = {};
      el.querySelectorAll("[data-readiness]").forEach((c) => (checks[c.dataset.readiness] = c.checked));
      const rd = currentReadiness();
      updateProfile((p) => {
        p.levelCheck = { ...(p.levelCheck || {}), level: rd ? rd.plan.id : p.level, checks };
      });
      // Update in place so ticking the second box does not re-render the page.
      const ready = !!(rd && rd.sessions >= rd.target && rd.questions.every((q) => checks[q.id]));
      const card = el.querySelector(".level-check");
      const btn = card && card.querySelector("[data-level-up]");
      if (btn) btn.disabled = !ready;
      const hint = card && card.querySelector("[data-level-hint]");
      if (hint) hint.textContent = ready ? "Both checkpoints are ticked and the session count is met." : "The button unlocks when the session count is met and both checkpoints are ticked.";
    }
  });
  draw();
  return { destroy: () => charts.forEach((c) => c.destroy()) };
}
