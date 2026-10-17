// The plan: training levels and rules, your heart-rate zones, the week by level, how it
// compares with Bryan's targets, what Bryan does now, equipment and sources.

import { DAYS, LEVEL_PLANS, PROGRAM, RULES, SOURCES, SWAPS, TAKEAWAYS, TARGETS, TIMELINE, ZONES } from "../data/program.js";
import { state } from "../store.js";
import { dayMins } from "../plan.js";
import { LEVELS, bpm, hrMax, levelIndex, personalize } from "../personalize.js";
import { esc } from "../util.js";
import { newestFirst, sourceListHtml } from "../components/sources.js";

const ZONE_COLORS = ["#8aa0ba", "#3ee0b0", "#e0b93c", "#f08f47", "#ef6a60"];

export function render(el) {
  const p = state.profile;
  const cur = levelIndex(p);
  const P = (s) => esc(personalize(s, p));
  const totals = LEVELS.map((_, i) => (DAYS.reduce((a, d) => a + dayMins(d, i), 0) / 60).toFixed(1));

  el.innerHTML = `<div class="page plan-page">
    <section class="card hero">
      <span class="eyebrow">${esc(PROGRAM.version)}</span>
      <h1>The plan</h1>
      <p class="focus">${esc(PROGRAM.summary)}</p>
      <p class="muted" style="font-size:0.85rem">This app is unofficial. Bryan Johnson and Blueprint do not endorse it. It provides a training plan, not medical advice.</p>
    </section>

    <div class="section-title"><h2>Training levels</h2><a class="btn sm" href="#/settings">Change your level</a></div>
    <p class="muted">Your training level sets the workouts. Change it in Settings when you need an easier or harder session.</p>
    <div class="plan-levels">${LEVEL_PLANS.map(
      (lp, i) => `<section class="card card-pad" style="display:grid;gap:8px${i === cur ? ";border-color:var(--accent)" : ""}">
        <span class="eyebrow">${esc(LEVELS[i].detail)}${i === cur ? " · your level" : ""}</span><h3 class="display" style="font-size:1.5rem">${esc(LEVELS[i].name)}</h3>
        <p><b>${P(lp.effort)}</b></p><ul class="list">${lp.points.map((s) => `<li>${P(s)}</li>`).join("")}</ul>
        <p class="muted" style="font-size:0.88rem">${P(lp.moveUp)}</p></section>`
    ).join("")}</div>
    <section class="card card-pad" style="display:grid;gap:8px"><h3>Rules</h3><ul class="list">${RULES.map((s) => `<li>${P(s)}</li>`).join("")}</ul></section>

    <div class="section-title"><h2>The week</h2></div>
    <div class="table-wrap"><table class="plan-week">
      <colgroup><col class="weekday-col"><col class="session-col">${LEVELS.map(() => '<col class="duration-col">').join("")}</colgroup>
      <thead><tr><th>Day</th><th>Session</th>${LEVELS.map((l, i) => `<th class="num ${i === cur ? "cur" : ""}"><span class="level-full">${esc(l.name)}</span><abbr class="level-short" title="${esc(l.name)}">${["New", "Return.", "Active", "Trained"][i]}</abbr></th>`).join("")}</tr></thead>
      <tbody>${DAYS.map((d) => `<tr><td><b>${esc(d.short)}</b></td><td><a href="#/library">${esc(d.title)}</a></td>${LEVELS.map((_, i) => `<td class="num ${i === cur ? "cur" : ""}">${d.blocks.length ? dayMins(d, i) + " min" : "Rest"}</td>`).join("")}</tr>`).join("")}
      <tr><td colspan="2"><b>Total</b> (without add-ons)</td>${totals.map((t, i) => `<td class="num ${i === cur ? "cur" : ""}"><b>${t} h</b></td>`).join("")}</tr></tbody>
    </table></div>
    <p class="muted">Your workouts include the scheduled cardio. Extra activity is optional. Lower levels build toward Bryan's weekly targets. At Well trained, sessions take about 72 to 93 minutes (8.2 hours a week) with all strength and mobility work, before add-ons or extra recovery breaks. The extra vigorous cardio and Zone 2 time adapt his weekly targets for this home plan.</p>
    <section class="card card-pad" style="display:grid;gap:10px"><h3>Well trained and Bryan's weekly targets</h3>
      <ul style="list-style:none;margin:0;padding:0;display:grid;gap:8px">${TARGETS.map(([s, t]) => `<li style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start"><span class="status ${s === "ok" ? "ok" : "part"}">${s === "ok" ? "Met" : "Partly"}</span><span>${P(t)}</span></li>`).join("")}</ul>
    </section>

    <div class="section-title"><h2>Your heart-rate zones</h2><span class="muted">Max ${hrMax(p)} bpm ${p && p.hrMax ? "(measured)" : "(estimated from your age)"}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Zone</th><th class="num">% of max</th><th class="num">Your bpm</th><th>How it feels and when to use it</th></tr></thead><tbody>
      ${ZONES.map((z, i) => `<tr><td><span class="zone-sw" style="background:${ZONE_COLORS[i]}"></span><b>${esc(z.zone)}</b></td><td class="num">${z.pct[0]} to ${z.pct[1]}%</td><td class="num">${bpm(p, z.pct[0])} to ${bpm(p, z.pct[1])}</td><td>${esc(z.feel)}</td></tr>`).join("")}
      <tr><td><b>4×4 work</b></td><td class="num">85 to 95%</td><td class="num">${bpm(p, 85)} to ${bpm(p, 95)}</td><td>Thursday's hard 4×4 intervals at Well trained. Other levels use a lower target.</td></tr>
    </tbody></table></div>

    <div class="section-title"><h2>Home substitutions</h2><a class="btn sm" href="#/setup/redo/equipment">Set up your equipment</a></div>
    <p class="muted">Add or edit your equipment during setup or in Settings under Your equipment. These home exercises stand in for Bryan's gym exercises.</p>
    <div class="table-wrap"><table><thead><tr><th>Bryan's gym exercise</th><th>Your home exercise</th></tr></thead><tbody>${SWAPS.map((s) => `<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td></tr>`).join("")}</tbody></table></div>

    <div class="section-title"><h2>What Bryan does now</h2></div>
    <section class="card card-pad"><ul class="timeline">${newestFirst(TIMELINE).map((t) => `<li><time class="when" datetime="${esc(t.date)}">${esc(t.d)}</time><div><b>${esc(t.t)}</b><p class="muted">${esc(t.s)}</p><div class="timeline-links">${t.links.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join("")}</div></div></li>`).join("")}</ul></section>
    <section class="card card-pad" style="display:grid;gap:8px"><h3>How this home plan uses his routine</h3><ul class="list">${TAKEAWAYS.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>

    <div class="section-title"><h2>Sources</h2></div>
    <div class="source-grid">${SOURCES.map((g) => `<section class="card card-pad"><h3>${esc(g.g)}</h3>${sourceListHtml(g.items)}</section>`).join("")}</div>
  </div>`;
}

