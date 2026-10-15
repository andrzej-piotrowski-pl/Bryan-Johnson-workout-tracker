// The plan: training levels and rules, your heart-rate zones, the week by level, how it
// compares with Bryan's targets, what Bryan does now, equipment and sources.

import { CHANGES, DAYS, EQUIPMENT, LEVEL_PLANS, PROGRAM, RULES, SOURCES, SWAPS, TAKEAWAYS, TARGETS, TIMELINE, ZONES } from "../data/program.js";
import { state } from "../store.js";
import { dayMins } from "../plan.js";
import { LEVELS, bpm, hrMax, levelIndex, personalize } from "../personalize.js";
import { esc } from "../util.js";

const ZONE_COLORS = ["#8aa0ba", "#3ee0b0", "#e0b93c", "#f08f47", "#ef6a60"];

export function render(el) {
  const p = state.profile;
  const cur = levelIndex(p);
  const P = (s) => esc(personalize(s, p));
  const totals = LEVELS.map((_, i) =>(i) => (DAYS.reduce((a, d) => a + dayMins(d, i), 0) / 60).toFixed(1));

  el.innerHTML = `<div class="page">
    <section class="card hero">
      <span class="eyebrow">${esc(PROGRAM.version)}</span>
      <h1>The plan</h1>
      <p class="focus">${esc(PROGRAM.summary)}</p>
      <p class="muted" style="font-size:0.85rem">Unofficial. Not affiliated with or endorsed by Bryan Johnson or Blueprint. A training plan, not medical advice.</p>
    </section>

    <div class="section-title"><h2>Training levels</h2><a class="btn sm" href="#/settings">Change your level</a></div>
    <p class="muted">Your level alone decides the workouts. It only changes when you change it in Settings.</p>
    <div class="two-col">${LEVEL_PLANS.map(
      (lp, i) => `<section class="card card-pad" style="display:grid;gap:8px${i === cur ? ";border-color:var(--accent)" : ""}">
        <span class="eyebrow">${esc(LEVELS[i].detail)}${i === cur ? " · your level" : ""}</span><h3 class="display" style="font-size:1.5rem">${esc(LEVELS[i].name)}</h3>
        <p><b>${P(lp.effort)}</b></p><ul class="list">${lp.points.map((s) => `<li>${P(s)}</li>`).join("")}</ul>
        <p class="muted" style="font-size:0.88rem">${P(lp.moveUp)}</p></section>`
    ).join("")}</div>
    <section class="card card-pad" style="display:grid;gap:8px"><h3>Rules</h3><ul class="list">${RULES.map((s) => `<li>${P(s)}</li>`).join("")}</ul></section>

    <div class="section-title"><h2>The week</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Day</th><th>Session</th>${LEVELS.map((l, i) => `<th class="num ${i === cur ? "cur" : ""}">${esc(l.name)}</th>`).join("")}</tr></thead>
      <tbody>${DAYS.map((d) => `<tr><td><b>${esc(d.short)}</b></td><td><a href="#/library">${esc(d.title)}</a></td>${LEVELS.map((_, i) => `<td class="num ${i === cur ? "cur" : ""}">${d.blocks.length ? dayMins(d, i) + " min" : "—"}</td>`).join("")}</tr>`).join("")}
      <tr><td colspan="2"><b>Total</b> (without add-ons)</td>${totals.map((t, i) => `<td class="num ${i === cur ? "cur" : ""}"><b>${t} h</b></td>`).join("")}</tr></tbody>
    </table></div>
    <section class="card card-pad" style="display:grid;gap:10px"><h3>Well trained against Bryan's targets</h3>
      <ul style="list-style:none;margin:0;padding:0;display:grid;gap:8px">${TARGETS.map(([s, t]) => `<li style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start"><span class="status ${s === "ok" ? "ok" : "part"}">${s === "ok" ? "Met" : "Partly"}</span><span>${P(t)}</span></li>`).join("")}</ul>
    </section>

    <div class="section-title"><h2>Your heart-rate zones</h2><span class="muted">Max ${hrMax(p)} bpm ${p && p.hrMax ? "(measured)" : "(estimated: 208 − 0.7 × age)"}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Zone</th><th class="num">% of max</th><th class="num">Your bpm</th><th>Feels like / used for</th></tr></thead><tbody>
      ${ZONES.map((z, i) => `<tr><td><span class="zone-sw" style="background:${ZONE_COLORS[i]}"></span><b>${esc(z.zone)}</b></td><td class="num">${z.pct[0]}–${z.pct[1]}%</td><td class="num">${bpm(p, z.pct[0])}–${bpm(p, z.pct[1])}</td><td>${esc(z.feel)}</td></tr>`).join("")}
      <tr><td><b>4×4 work</b></td><td class="num">85–95%</td><td class="num">${bpm(p, 85)}–${bpm(p, 95)}</td><td>Hard minutes of Thursday's 4×4 at Well trained (the other levels aim lower)</td></tr>
    </tbody></table></div>

    <div class="section-title"><h2>Equipment</h2></div>
    <div class="two-col">${[["You need", EQUIPMENT.have], ["Add (all small)", EQUIPMENT.add], ["Optional", EQUIPMENT.optional]].map(([t, arr]) => `<section class="card card-pad" style="display:grid;gap:8px"><h3>${esc(t)}</h3><ul class="list">${arr.map((x) => `<li><b>${esc(x.i)}.</b> ${esc(x.d)}</li>`).join("")}</ul></section>`).join("")}</div>
    <div class="table-wrap"><table><thead><tr><th>Bryan (gym)</th><th>You (home)</th></tr></thead><tbody>${SWAPS.map((s) => `<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td></tr>`).join("")}</tbody></table></div>

    <div class="section-title"><h2>What Bryan does now</h2></div>
    <section class="card card-pad"><ul class="timeline">${TIMELINE.map((t) => `<li><span class="when">${esc(t.d)}</span><div><b>${esc(t.t)}</b><p class="muted">${esc(t.s)}</p></div></li>`).join("")}</ul></section>
    <section class="card card-pad" style="display:grid;gap:8px"><h3>What this plan takes from it</h3><ul class="list">${TAKEAWAYS.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>
    <details class="card card-pad"><summary style="cursor:pointer;font-weight:650">Plan changelog (v2)</summary><ul class="list" style="margin-top:10px">${CHANGES.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></details>

    <div class="section-title"><h2>Sources</h2></div>
    <div class="two-col">${SOURCES.map((g) => `<section class="card card-pad" style="display:grid;gap:8px"><h3>${esc(g.g)}</h3><ul class="list">${g.items.map((s) => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join("")}</ul></section>`).join("")}</div>
  </div>`;
}

