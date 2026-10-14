// Progress: weekly sessions, Zone 2 and hard-cardio minutes against Bryan's
// targets, strength progression per exercise, posture stiffness and body weight.

import { EXERCISES } from "../data/exercises.js";
import { PHASES } from "../data/program.js";
import { state } from "../store.js";
import { countsAsSession, liftHistory, phaseFor, weekStats } from "../plan.js";
import { kgUnit } from "../personalize.js";
import { addDays, esc, fmtShort, parseIso, todayIso, weekStart } from "../util.js";
import { icon } from "../components/icons.js";
import { mountChart, tableHtml } from "../components/charts.js";

export function render(el) {
  let range = 12;
  let lift = null;
  const charts = [];
  const tables = new Set();

  const u = () => kgUnit(state.profile);
  const toUnit = (kg) => (u() === "lb" ? Math.round(kg * 2.20462) : kg);

  function weeks(n, clip = true) {
    const out = [];
    let start = weekStart(todayIso());
    const first = clip && state.profile && state.profile.startDate ? weekStart(state.profile.startDate) : null;
    for (let i = 0; i < n; i++) {
      if (first && start < first && out.length) break;
      out.unshift({ start, s: weekStats(start) });
      start = addDays(start, -7);
    }
    return out;
  }

  function lifts() {
    return Object.entries(EXERCISES)
      .filter(([, e]) => e.log === "load" || e.log === "reps")
      .map(([id, e]) => ({ id, name: e.name, hist: liftHistory(id) }))
      .filter((x) => x.hist.length);
  }

  function addonSeries(addonId, metricId) {
    return Object.keys(state.days)
      .sort()
      .map((d) => {
        const a = state.days[d].addons && state.days[d].addons[addonId];
        const v = a && a.metrics ? a.metrics[metricId] : null;
        return v == null ? null : { x: parseIso(d), value: v, label: fmtShort(d), short: fmtShort(d) };
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

  function draw() {
    charts.splice(0).forEach((c) => c.destroy());
    const W = weeks(range);
    const sessions = { type: "columns", integer: true, title: "Sessions per week", target: 6, targetLabel: "6 a week", fmt: (v) => `${v} sessions`, data: W.map((w) => ({ label: `Week of ${fmtShort(w.start)}`, short: fmtShort(w.start), value: w.s.sessions, sub: w.s.skipped ? `${w.s.skipped} skipped` : "" })) };
    const zone2 = { type: "columns", title: "Zone 2 minutes per week", target: 150, targetLabel: "Bryan: 150", fmt: (v) => `${v} min`, data: W.map((w) => ({ label: `Week of ${fmtShort(w.start)}`, short: fmtShort(w.start), value: w.s.zone2 })) };
    const hard = { type: "columns", title: "Hard-cardio minutes per week", target: 75, targetLabel: "Bryan: 75", fmt: (v) => `${v} min`, data: W.map((w) => ({ label: `Week of ${fmtShort(w.start)}`, short: fmtShort(w.start), value: w.s.hard })) };

    const L = lifts();
    if (!lift || !L.find((x) => x.id === lift)) lift = L.length ? L.sort((a, b) => b.hist.length - a.hist.length)[0].id : null;
    const cur = L.find((x) => x.id === lift);
    const useKg = cur && cur.hist.some((h) => h.kg > 0);
    const liftSpec = cur
      ? {
          type: "line",
          title: cur.name,
          fmt: (v) => (useKg ? `${v} ${u()}` : `${v} reps`),
          data: cur.hist.map((h) => ({ x: parseIso(h.date), value: useKg ? toUnit(h.kg) : h.reps, label: fmtShort(h.date), short: fmtShort(h.date), sub: useKg ? `${h.reps} reps` : "" })),
        }
      : null;
    const stiffness = state.profile && state.profile.addons && state.profile.addons.posture ? addonSeries("posture", "stiffness") : [];
    const stiffSpec = { type: "line", title: "Neck & upper-back stiffness", yMin: 0, fmt: (v) => `${v} / 10`, data: stiffness };
    const bw = Object.keys(state.days)
      .sort()
      .filter((d) => state.days[d].bodyWeightKg != null)
      .map((d) => ({ x: parseIso(d), value: toUnit(state.days[d].bodyWeightKg), label: fmtShort(d), short: fmtShort(d) }));
    const bwSpec = { type: "line", title: "Body weight", fmt: (v) => `${v} ${u()}`, data: bw };

    const total = Object.values(state.days).filter(countsAsSession).length;
    // Weekly averages use full weeks only: not the current one, and not a first
    // week you joined half way through. Before that, this week so far.
    const thisWeek = weekStart(todayIso());
    const startDate = state.profile && state.profile.startDate;
    let firstFull = startDate ? weekStart(startDate) : null;
    if (firstFull && startDate > firstFull) firstFull = addDays(firstFull, 7);
    const full = weeks(9, false).filter((w) => w.start < thisWeek && (!firstFull || w.start >= firstFull)).slice(-8);
    const basis = full.length ? full : weeks(1, false);
    const avg = (k) => basis.reduce((a, w) => a + w.s[k], 0) / basis.length;
    const avgSess = avg("sessions").toFixed(1);
    const avgZ2 = Math.round(avg("zone2"));
    const avgNote = full.length ? `last ${full.length === 1 ? "full week" : `${full.length} full weeks`}` : "this week so far";
    const ph = phaseFor(todayIso());

    el.innerHTML = `<div class="page">
      <div class="section-title"><h2>Progress</h2>
        <div class="seg" role="group" aria-label="Range">${[[8, "8 weeks"], [12, "12 weeks"], [26, "6 months"], [52, "1 year"]].map(([n, l]) => `<button type="button" data-range="${n}" aria-pressed="${range === n}">${l}</button>`).join("")}</div>
      </div>
      <div class="kpis">
        <div class="card kpi"><span>Phase</span><b>${esc(PHASES[ph.phase].name)}</b><span>program week ${ph.week}</span></div>
        <div class="card kpi"><span>Sessions done</span><b>${total}</b><span>in total</span></div>
        <div class="card kpi"><span>Sessions a week</span><b>${avgSess}</b><span>${avgNote} · plan: 6</span></div>
        <div class="card kpi"><span>Zone 2 a week</span><b>${avgZ2} min</b><span>${avgNote} · Bryan: 150</span></div>
      </div>
      <div class="charts">
        ${card("sessions", "Sessions per week", "Completed (or at least half-done) sessions; target 6.", sessions, ["Week", "Sessions"])}
        ${card("zone2", "Zone 2 minutes per week", "Zone 2 blocks, the easy minutes of the 4×4 and easy extra activity.", zone2, ["Week", "Minutes"])}
        ${card("hard", "Hard-cardio minutes per week", "Work intervals plus hard extra activity.", hard, ["Week", "Minutes"])}
      </div>
      <div class="section-title"><h2 style="font-size:1.25rem">Strength</h2>
        ${L.length ? `<select class="input" data-lift style="max-width:320px" aria-label="Exercise">${L.map((x) => `<option value="${x.id}" ${x.id === lift ? "selected" : ""}>${esc(x.name)} (${x.hist.length})</option>`).join("")}</select>` : ""}
      </div>
      ${liftSpec ? `<div class="charts">${card("lift", liftSpec.title, useKg ? `Heaviest set each session (${u()}); the tooltip shows the reps.` : "Most reps in a set each session.", liftSpec, ["Date", useKg ? u() : "Reps"])}</div>` : `<div class="card empty">Log sets with weight or reps and your progression shows up here.</div>`}
      ${stiffness.length || bw.length ? `<div class="charts">${stiffness.length ? card("stiff", "Neck & upper-back stiffness", "From the posture add-on, 0 = none, 10 = very stiff. Lower is better.", stiffSpec, ["Date", "Stiffness"]) : ""}${bw.length ? card("bw", "Body weight", "From the notes card on each day.", bwSpec, ["Date", u()]) : ""}</div>` : ""}
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
      range = Number(b.dataset.range);
      draw();
    } else if (b.dataset.table) {
      tables.has(b.dataset.table) ? tables.delete(b.dataset.table) : tables.add(b.dataset.table);
      draw();
    }
  });
  el.addEventListener("change", (e) => {
    if (e.target.matches("[data-lift]")) {
      lift = e.target.value;
      draw();
    }
  });
  draw();
  return { destroy: () => charts.forEach((c) => c.destroy()) };
}
