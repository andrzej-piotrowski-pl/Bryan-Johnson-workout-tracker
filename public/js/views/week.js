// One week at a glance: seven day cards, weekly totals against Bryan's targets.

import { state } from "../store.js";
import { SKIP_REASONS, addonsForDate, dayDef, dayMins, isRestKey, levelFor, sessionKeyFor, weekStats } from "../plan.js";
import { addDays, esc, fmtDate, fmtShort, isoWeekNumber, parseIso, todayIso, weekStart } from "../util.js";
import { icon } from "../components/icons.js";
import { sessionKind } from "../themes.js";

const STATUS = { done: "Done", partial: "In progress", skipped: "Skipped" };

export function render(el, params) {
  const start = weekStart(params[0] && /^\d{4}-\d{2}-\d{2}$/.test(params[0]) ? params[0] : todayIso());
  const today = todayIso();
  const s = weekStats(start);
  const end = addDays(start, 6);
  const isThisWeek = today >= start && today <= end;

  const cards = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const key = sessionKeyFor(date);
    const def = dayDef(key);
    const log = state.days[date];
    const rest = isRestKey(key);
    const level = levelFor(date);
    const st = log && log.status;
    const skip = log && log.skip ? SKIP_REASONS.find((r) => r.id === log.skip.reason) : null;
    const addonDone = log && Object.values(log.addons || {}).some((a) => a && a.items && Object.values(a.items).some((x) => x.done));
    const future = date > today;
    const before = state.profile && state.profile.startDate && date < state.profile.startDate;
    const statusText = st ? STATUS[st] : rest ? "Rest" : before ? "Before your start" : future ? "Planned" : date === today ? "Today" : "Not logged";
    return `<a class="card wday${date === today ? " today" : ""}${rest || before ? " rest" : ""}" href="#/day/${date}" data-kind="${rest ? "rest" : sessionKind(key)}">
      <div class="d"><b>${esc(parseIso(date).toLocaleDateString(undefined, { weekday: "short" }))}</b><span class="muted mono">${esc(fmtShort(date))}</span></div>
      <span class="t">${esc(rest ? "Rest day" : def.title)}</span>
      ${rest ? "" : `<span class="muted mono" style="font-size:0.8rem">≈${dayMins(def, level)} min</span>`}
      <span class="chips"><span class="status-dot ${st || ""}"></span><span style="font-size:0.85rem">${esc(statusText)}</span>${addonDone ? '<span class="status-dot addon" title="Add-on done"></span>' : ""}</span>
      ${skip ? `<span class="chip skip">${icon(skip.icon, "sm")} ${esc(skip.name)}</span>` : ""}
      ${log && log.notes ? `<span class="muted" style="font-size:0.82rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(log.notes)}</span>` : ""}
    </a>`;
  }).join("");

  const zonePct = Math.min(100, Math.round((s.zone2 / 150) * 100));
  el.innerHTML = `<div class="page">
    <div class="section-title">
      <div style="display:grid;gap:4px"><span class="eyebrow">Week ${isoWeekNumber(start)}</span><h2>${esc(fmtShort(start))} – ${esc(fmtShort(end))}</h2></div>
      <div class="btn-row">
        <a class="btn sm icon-only" href="#/activity/week/${addDays(start, -7)}" aria-label="Previous week">${icon("chevronL")}</a>
        ${isThisWeek ? "" : `<a class="btn sm" href="#/activity/week">This week</a>`}
        <a class="btn sm icon-only" href="#/activity/week/${addDays(start, 7)}" aria-label="Next week">${icon("chevronR")}</a>
      </div>
    </div>
    <div class="kpis">
      <div class="card kpi">${icon("check")}<b>${s.sessions}<small class="muted" style="font-size:1rem"> / 6</small></b><span>sessions done${s.skipped ? ` · ${s.skipped} skipped` : ""}</span></div>
      <div class="card kpi">${icon("heart")}<b>${s.zone2}<small class="muted" style="font-size:1rem"> / 150</small></b><span>Zone 2 minutes (${zonePct}% of Bryan's 150)</span></div>
      <div class="card kpi">${icon("bolt")}<b>${s.hard}<small class="muted" style="font-size:1rem"> / 75</small></b><span>hard-cardio minutes</span></div>
      <div class="card kpi">${icon("history")}<b>${s.extra}</b><span>minutes of extra activity</span></div>
    </div>
    <div class="week-grid">${cards}</div>
    <p class="muted" style="font-size:0.85rem">Zone 2 includes scheduled Zone 2 blocks, easy recovery between 4×4 intervals and extra activity logged as "Easy / Zone 2". Hard cardio includes vigorous blocks and hard intervals. Brisk beginner intervals, warm-ups and cool-downs don't count toward these targets. Bryan's weekly targets are at least 150 minutes of Zone 2 and 75 minutes of hard cardio. Lower levels build toward those amounts.</p>
  </div>`;
}
