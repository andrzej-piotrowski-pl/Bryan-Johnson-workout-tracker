// Logging UI for one exercise on one day: sets × reps × load, holds with a timer,
// cardio minutes and heart rate, or interval rounds. Everything auto-saves.

import { state } from "../store.js";
import { editDay, rxFor, timerPresets } from "../plan.js";
import { LEVELS, bpmRange, fmtWeight, kgUnit, personalize, suggestedKg } from "../personalize.js";
import { esc, fmtShort } from "../util.js";
import { icon } from "./icons.js";
import { openDialog, toast } from "./ui.js";
import { startCountdown, startHold, startIntervals, startRest } from "./timer.js";

// "3 × 8–10 @ …" → { sets: 3, reps: "8–10", seconds: null, perSide: false }
export function parseRx(rx) {
  const t = rx || "";
  const out = { sets: 1, reps: "", seconds: null, minutes: null, perSide: /\/(side|leg|arm)\b/.test(t) };
  const m = /(\d+)\s*×\s*(\d+)(?:–(\d+))?\s*(s\b|min\b)?/.exec(t);
  if (m) {
    out.sets = Number(m[1]);
    if (m[4] === "s") out.seconds = Number(m[3] || m[2]);
    else if (m[4] === "min") out.minutes = Number(m[2]);
    else out.reps = m[3] ? `${m[2]}–${m[3]}` : m[2];
  } else {
    const r = /(\d+)(?:–(\d+))?\s*reps?\b/.exec(t);
    if (r) out.reps = r[2] ? `${r[1]}–${r[2]}` : r[1];
    const s = /(\d+)\s*s\b/.exec(t);
    if (s) out.seconds = Number(s[1]);
    const mi = /(\d+)(?:–(\d+))?\s*min\b/.exec(t);
    if (mi) out.minutes = Number(mi[1]);
    if (/fatigue/.test(t)) out.reps = "max";
  }
  return out;
}

const toUnit = (kg) => (state.profile && state.profile.units === "imperial" ? Math.round(kg * 2.20462 * 10) / 10 : kg);
const fromUnit = (v) => (state.profile && state.profile.units === "imperial" ? Math.round((v / 2.20462) * 10) / 10 : v);
const num = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function getItemLog(date, scope, itemId) {
  const d = state.days[date];
  if (!d) return null;
  if (scope === "main") return d.items[itemId] || null;
  return (d.addons[scope] && d.addons[scope].items && d.addons[scope].items[itemId]) || null;
}

export function editItem(date, scope, item, fn) {
  return editDay(date, (d) => {
    let bag;
    if (scope === "main") bag = d.items;
    else {
      d.addons[scope] = d.addons[scope] || { items: {} };
      d.addons[scope].items = d.addons[scope].items || {};
      bag = d.addons[scope].items;
    }
    const cur = bag[item.id] || { ex: item.ex, done: false };
    cur.ex = item.ex;
    fn(cur);
    bag[item.id] = cur;
  });
}

// Earlier logs of the same exercise, newest first, for "last time" and the
// progression rule. Entries without any set values are ignored.
export function performanceHistory(exId, beforeDate, limit = 4) {
  const out = [];
  const dates = Object.keys(state.days).filter((d) => d < beforeDate).sort().reverse();
  for (const date of dates) {
    const day = state.days[date];
    const bags = [day.items, ...Object.values(day.addons || {}).map((a) => a && a.items)];
    for (const bag of bags) {
      for (const l of Object.values(bag || {})) {
        if (l.ex === exId && l.sets && l.sets.some((s) => s.reps != null || s.kg != null || s.sec != null)) {
          out.push({ date, log: l });
          if (out.length >= limit) return out;
        }
      }
    }
  }
  return out;
}

// Most recent earlier log of the same exercise, for "last time".
export function lastPerformance(exId, beforeDate) {
  return performanceHistory(exId, beforeDate, 1)[0] || null;
}

// Top of the rep range or the hold time, if the dose gives one.
function topValue(target, key) {
  const v = key === "reps" ? target.reps : target.seconds;
  if (v == null || v === "max") return null;
  const m = /(\d+)(?:–(\d+))?/.exec(String(v));
  return m ? Number(m[2] || m[1]) : null;
}

function hitTarget(log, target, key) {
  const top = topValue(target, key);
  if (!top || !log || !log.sets) return false;
  const rows = log.sets.filter((s) => (key === "reps" ? s.reps != null : s.sec != null));
  if (rows.length < (target.sets || 1)) return false;
  return rows.every((s) => Number(key === "reps" ? s.reps : s.sec) >= top);
}

function topKg(log) {
  return Math.max(0, ...((log && log.sets) || []).map((s) => Number(s.kg) || 0));
}

const showKg = (p, kg) => fmtWeight(p, kg, 1);

// The plan's own progression rule, turned into a suggestion for the next time:
// add weight only after two sessions at the top of the rep range, and step back
// to "repeat" whenever the last session was marked easier or painful.
export function nextTimeRecommendation({ item, ex, level, date }) {
  const p = state.profile;
  if (!ex || !["load", "reps", "hold", "carry"].includes(ex.log)) return null;
  const rx = rxFor(item, level);
  const target = parseRx(personalize(rx, p));
  const hist = performanceHistory(item.ex, date, 4);
  const last = hist[0] || null;
  const prev = hist[1] || null;

  if (ex.log === "hold" || (ex.log === "carry" && !target.seconds && !topValue(target, "reps"))) {
    const top = topValue(target, "seconds");
    if (!top) return null;
    if (!last) return { kind: "start", seconds: top, text: `Hold ${top} s and build from there.` };
    const both = prev && hitTarget(last.log, target, "sec") && hitTarget(prev.log, target, "sec");
    if (last.log.holdProgress) return { kind: "repeat", seconds: top, text: `Repeat ${top} s — progression is paused after the easier session.` };
    if (both) return { kind: "add", seconds: top + 5, text: `Try ${top + 5} s next time — you held the top of the range twice.` };
    return { kind: "repeat", seconds: top, text: `Hold ${top} s again — two sessions at the top unlock more time.` };
  }

  if (ex.log === "carry") {
    const secs = topValue(target, "seconds");
    const lastKg = topKg(last && last.log);
    const suggested = suggestedKg(rx, p);
    if (!last) return suggested != null ? { kind: "start", kg: suggested, seconds: secs, text: `Start around ${showKg(p, suggested)} for ${secs || 30} s.` } : null;
    const both = prev && hitTarget(last.log, target, "sec") && hitTarget(prev.log, target, "sec");
    if (last.log.holdProgress) return { kind: "repeat", kg: lastKg || null, seconds: secs, text: lastKg ? `Repeat ${showKg(p, lastKg)} — progression is paused after the easier session.` : `Repeat the same hold — progression is paused after the easier session.` };
    if (both && lastKg) return { kind: "add", kg: lastKg + 1, seconds: secs, text: `Try ${showKg(p, lastKg + 1)} next time — you held the top twice.` };
    return { kind: "repeat", kg: lastKg || null, seconds: secs, text: lastKg ? `Repeat ${showKg(p, lastKg)} — two clean sessions at the top unlock the next step.` : "Repeat the same hold — two sessions at the top unlock the next step." };
  }

  if (ex.log === "load") {
    const top = topValue(target, "reps");
    const suggested = suggestedKg(rx, p);
    if (!last) {
      if (suggested == null) return null;
      return { kind: "start", kg: suggested, text: `Start around ${showKg(p, suggested)} — adjust so you finish with the reps your level recommends.` };
    }
    const lastKg = topKg(last.log);
    if (!lastKg) {
      if (top) return { kind: "repeat", reps: top, text: `Aim for ${top} reps and add reps before adding weight.` };
      return null;
    }
    const both = top && prev && hitTarget(last.log, target, "reps") && hitTarget(prev.log, target, "reps");
    if (last.log.holdProgress) return { kind: "repeat", kg: lastKg, text: `Repeat ${showKg(p, lastKg)} — progression is paused after the easier session.` };
    if (both) {
      const inc = ex.cat === "Legs & knees" ? 2 : 1;
      let kg = lastKg + inc;
      const max = Number(p && p.maxDumbbellKg) || null;
      let note = "";
      if (max && kg > max) {
        kg = max;
        note = " You are at your heaviest dumbbell: aim for one more rep instead.";
      }
      return { kind: "add", kg, text: `Try ${showKg(p, kg)} next time — you hit the top of the range twice.${note}` };
    }
    return { kind: "repeat", kg: lastKg, text: `Repeat ${showKg(p, lastKg)} — two clean sessions at the top of the range unlock the next jump.` };
  }

  // Bodyweight reps.
  const top = topValue(target, "reps");
  if (!top) return null;
  if (!last) return { kind: "start", reps: top, text: `Aim for ${top} reps.` };
  const both = prev && hitTarget(last.log, target, "reps") && hitTarget(prev.log, target, "reps");
  if (last.log.holdProgress) return { kind: "repeat", reps: top, text: `Repeat ${top} reps — progression is paused after the easier session.` };
  if (both) return { kind: "add", reps: top + 1, text: `Try ${top + 1} reps next time — you hit the top of the range twice.` };
  return { kind: "repeat", reps: top, text: `Aim for ${top} reps again — two sessions at the top unlock the next step.` };
}

export function summarizeLog(l, logType) {
  if (!l) return "";
  const u = kgUnit(state.profile);
  if (l.sets && l.sets.length) {
    const parts = l.sets
      .filter((s) => s.reps != null || s.kg != null || s.sec != null)
      .map((s) => {
        const a = s.sec != null ? `${s.sec} s` : s.reps != null ? `${s.reps}` : "";
        const b = s.kg != null ? ` × ${toUnit(s.kg)} ${u}` : "";
        return a + b;
      });
    if (parts.length) return parts.join(" · ");
  }
  if (l.cardio && (l.cardio.min || l.cardio.avg)) return [l.cardio.min && `${l.cardio.min} min`, l.cardio.avg && `avg ${l.cardio.avg} bpm`].filter(Boolean).join(" · ");
  if (l.rounds) return `${l.rounds} rounds${l.peak ? ` · peak ${l.peak} bpm` : ""}`;
  return "";
}

export function renderLogger(container, ctx) {
  const { date, item, ex, level, scope = "main" } = ctx;
  const p = state.profile;
  const type = ex.log;
  const u = kgUnit(p);
  const restSec = (p && p.settings && p.settings.restSec) || 75;
  const cardioRange = item.intensity === "light" ? [50, 60] : ex.intensity === "hard" ? [80, level === 1 ? 85 : 90] : [60, 70];
  const cardioLabel = item.intensity === "light" ? "Easy pace" : ex.intensity === "hard" ? "Vigorous" : "Zone 2";

  function draw() {
    const l = getItemLog(date, scope, item.id) || {};
    const done = !!l.done;
    // An easier choice made today changes only today's displayed dose.
    const rxText = personalize(l.rxOverride || rxFor(item, level), p);
    const target = parseRx(rxText);
    if (ctx.onDraw) ctx.onDraw(l);
    const suggestion = nextTimeRecommendation({ item, ex, level, date });
    const kgPh = suggestion && suggestion.kg != null ? suggestion.kg : suggestedKg(rxFor(item, level), p);
    const place = (k, fallback) => {
      if (k === "kg") return kgPh != null ? toUnit(kgPh) : "";
      if (k === "reps" && suggestion && suggestion.reps != null) return suggestion.reps;
      if (k === "sec" && suggestion && suggestion.seconds != null) return suggestion.seconds;
      return fallback;
    };
    let body = "";
    if (type === "none") {
      container.innerHTML = `<p class="muted">Choose movements from this list for your intervals, then record them in the interval block.</p>`;
      return;
    }
    const doneBtn = `<button type="button" class="btn ${done ? "primary" : ""}" data-l="done">${icon("check")} ${done ? "Done" : "Mark done"}</button>`;

    if (type === "reps" || type === "load" || type === "hold" || type === "carry") {
      const cols = [];
      if (type === "reps" || type === "load") cols.push(["reps", "Reps", target.reps || ""]);
      if (type === "hold" || type === "carry") cols.push(["sec", "Seconds", target.seconds || ""]);
      if (type === "load" || type === "carry") cols.push(["kg", u, ""]);
      const n = Math.max(l.sets ? l.sets.length : 0, target.sets || 1);
      const sets = Array.from({ length: n }, (_, i) => (l.sets && l.sets[i]) || {});
      body += `<div class="sets" style="--cols:${cols.length}">
        <div class="set-row set-head"><span>Set</span>${cols.map((c) => `<span>${esc(c[1])}</span>`).join("")}<span></span></div>
        ${sets
          .map(
            (s, i) => `<div class="set-row">
              <span class="n">${i + 1}</span>
              ${cols
                .map(([k, , ph]) => {
                  const v = s[k] == null ? "" : k === "kg" ? toUnit(s[k]) : s[k];
                  return `<input class="input num" inputmode="decimal" data-set="${i}" data-k="${k}" value="${esc(v)}" placeholder="${esc(place(k, ph))}" aria-label="Set ${i + 1} ${k}">`;
                })
                .join("")}
              ${
                type === "hold"
                  ? `<button type="button" class="btn sm icon-only" data-l="hold" data-i="${i}" aria-label="Start ${target.seconds || 30} second timer">${icon("timer", "sm")}</button>`
                  : `<button type="button" class="btn sm icon-only ghost" data-l="del" data-i="${i}" aria-label="Remove set ${i + 1}">${icon("minus", "sm")}</button>`
              }
            </div>`
          )
          .join("")}
      </div>
      <div class="btn-row">${doneBtn}<button type="button" class="btn sm ghost" data-l="add">${icon("plus", "sm")} Add set</button></div>`;
    } else if (type === "cardio") {
      const c = l.cardio || {};
      body += `<div class="grid-form" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          <label class="field"><span>Minutes</span><input class="input num" inputmode="decimal" data-c="min" value="${esc(c.min ?? "")}" placeholder="${esc(target.minutes || "")}"></label>
          <label class="field"><span>Avg bpm</span><input class="input num" inputmode="numeric" data-c="avg" value="${esc(c.avg ?? "")}" placeholder="${esc(bpmRange(p, ...cardioRange).replace(" bpm", ""))}"></label>
          <label class="field"><span>Max bpm</span><input class="input num" inputmode="numeric" data-c="max" value="${esc(c.max ?? "")}"></label>
        </div>
        <div class="btn-row">${doneBtn}${target.minutes ? `<button type="button" class="btn" data-l="countdown">${icon("timer")} ${target.minutes} min timer</button>` : ""}</div>`;
    } else if (type === "intervals") {
      const presets = timerPresets(item, level);
      const pi = Math.min(l.preset || 0, Math.max(0, presets.length - 1));
      body += `${presets.length > 1 ? `<div class="seg" role="group" aria-label="Preset">${presets.map((pr, i) => `<button type="button" data-preset="${i}" aria-pressed="${i === pi}">${esc(pr.label)}</button>`).join("")}</div>` : ""}
        <div class="btn-row"><button type="button" class="btn primary" data-l="intervals">${icon("timer")} Start interval timer</button>${doneBtn}</div>
        <div class="grid-form" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <label class="field"><span>Hard intervals done</span><input class="input num" inputmode="numeric" data-r="rounds" value="${esc(l.rounds ?? "")}" placeholder="${presets[pi] ? presets[pi].rounds * (presets[pi].blocks || 1) : ""}"></label>
          <label class="field"><span>Peak bpm</span><input class="input num" inputmode="numeric" data-r="peak" value="${esc(l.peak ?? "")}"></label>
        </div>`;
    } else {
      // check
      const timerBtn = target.seconds ? `<button type="button" class="btn" data-l="hold" data-i="0">${icon("timer")} ${target.seconds} s${target.perSide ? " per side" : ""}</button>` : "";
      body += `<div class="btn-row">${doneBtn}${timerBtn}</div>`;
    }

    if (l.easier) {
      const label = l.easier.choice === "skip" ? "Skipped today" : "Easier today";
      body += `<div class="banner easier"><span>${icon("info", "lg")}</span><div class="grow"><b>${esc(label)}</b><span>${esc(l.easier.text || "")}</span></div><button type="button" class="btn sm ghost" data-l="easier-undo">${icon("undo", "sm")} Undo</button></div>`;
    }
    body += suggestionHtml(l.holdProgress ? { kind: "repeat", text: "Progression paused today after the easier choice. Repeat this session next time." } : suggestion);
    body += `<div class="btn-row"><button type="button" class="btn sm ghost" data-l="easier">${icon("info", "sm")} ${l.easier ? "Change easier choice" : "Something hurts or too hard?"}</button></div>`;
    const last = type !== "check" && type !== "cardio" && type !== "intervals" ? lastPerformance(item.ex, date) : null;
    body += last ? `<p class="muted" style="font-size:0.84rem">Last time (${esc(fmtShort(last.date))}): <span class="mono">${esc(summarizeLog(last.log, type))}</span></p>` : "";
    body += `<details ${l.note ? "open" : ""}><summary class="muted" style="cursor:pointer;font-size:0.86rem">${icon("note", "sm")} Note for this exercise</summary><textarea class="input" data-l="note" rows="2" placeholder="Note how it felt, any pain or a technique cue to remember." style="margin-top:8px;min-height:64px">${esc(l.note || "")}</textarea></details>`;
    container.innerHTML = `<div class="logger">${body}</div>`;
  }

  // The next-time line turns the plan's progression rule into one clear action.
  function suggestionHtml(rec) {
    if (!rec) return "";
    const value = rec.kg != null ? fmtWeight(p, rec.kg) : rec.reps != null ? `${rec.reps} reps` : rec.seconds != null ? `${rec.seconds} s` : "";
    const kind = rec.kg != null ? "kg" : rec.reps != null ? "reps" : rec.seconds != null ? "sec" : null;
    const raw = rec.kg != null ? rec.kg : rec.reps != null ? rec.reps : rec.seconds;
    const use = kind && raw != null ? `<button type="button" class="btn sm" data-l="use" data-use-kind="${kind}" data-use-value="${raw}">${icon("check", "sm")} Use ${esc(value)}</button>` : "";
    return `<div class="next-time" data-kind="${esc(rec.kind)}">
      <div class="grow"><span class="eyebrow">Next time</span><p>${esc(rec.text)}</p></div>
      ${use}
    </div>`;
  }

  // One tap to an easier version of today's dose, using only options already in
  // the plan. Progression pauses after this so the next-time line stays safe.
  function openEasier() {
    const hasEasier = !!ex.easier;
    const prevName = level > 0 ? LEVELS[level - 1].name : null;
    const prevRaw = level > 0 ? rxFor(item, level - 1) : null;
    const prevRx = prevRaw && prevRaw !== "—" ? personalize(prevRaw, p) : null;
    const content = document.createElement("div");
    content.className = "easier-dialog";
    content.style.display = "grid";
    content.style.gap = "12px";
    content.innerHTML = `<p class="muted">Bryan's rule: injury prevention comes first. Swap to the easier variant whenever a joint complains; never train through sharp pain.</p>
      <div class="reason-grid">
        <button type="button" data-easy-reason="hard" aria-pressed="false">${icon("battery")} Too hard today</button>
        <button type="button" data-easy-reason="joint" aria-pressed="false">${icon("bandage")} A joint hurts</button>
      </div>
      <div data-easy-options hidden>
        ${hasEasier ? `<button type="button" class="choice" data-easy-choice="version"><b>Use the easier version</b><small>${esc(personalize(ex.easier, p))}</small></button>` : ""}
        ${prevRx ? `<button type="button" class="choice" data-easy-choice="dose"><b>Use the easier dose</b><small>${esc(prevName)}: ${esc(prevRx)}</small></button>` : ""}
        <button type="button" class="choice" data-easy-choice="skip"><b>Skip this exercise today</b><small>Today's dose only; the rest of the session is unchanged.</small></button>
        <p class="muted" data-easy-advice hidden>Sharp pain, tingling, numbness or a joint that gives way: stop this movement and get it checked before training it again.</p>
      </div>
      <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn" data-easy-cancel>Cancel</button></div>`;
    const d = openDialog({ title: "Make today easier", content, sheet: false });
    let reason = null;
    content.addEventListener("click", (e) => {
      const r = e.target.closest("[data-easy-reason]");
      if (r) {
        reason = r.dataset.easyReason;
        content.querySelectorAll("[data-easy-reason]").forEach((x) => x.setAttribute("aria-pressed", String(x === r)));
        content.querySelector("[data-easy-options]").hidden = false;
        if (reason === "joint") content.querySelector("[data-easy-advice]").hidden = false;
        return;
      }
      if (e.target.closest("[data-easy-cancel]")) return d.close();
      const c = e.target.closest("[data-easy-choice]");
      if (!c || !reason) return;
      const choice = c.dataset.easyChoice;
      const text = choice === "version" ? personalize(ex.easier, p) : choice === "dose" ? `${prevName}: ${prevRx}` : "Skipped today";
      save((l) => {
        l.easier = { reason, choice, text, at: new Date().toISOString() };
        l.holdProgress = true;
        if (choice === "dose" && level > 0) l.rxOverride = rxFor(item, level - 1);
        if (choice === "skip") {
          l.skipped = true;
          l.done = false;
        }
      });
      d.close();
      draw();
      toast(choice === "skip" ? "Exercise skipped today" : "Easier version logged for today");
    });
  }

  const save = (fn) => {
    editItem(date, scope, item, fn);
    if (ctx.onChange) ctx.onChange();
  };

  container.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.set != null) {
      const i = Number(t.dataset.set);
      const k = t.dataset.k;
      save((l) => {
        l.sets = l.sets || [];
        while (l.sets.length <= i) l.sets.push({});
        const v = num(t.value);
        l.sets[i][k] = v == null ? null : k === "kg" ? fromUnit(v) : v;
        if (v != null) l.done = true;
      });
    } else if (t.dataset.c) {
      save((l) => {
        l.cardio = l.cardio || {};
        l.cardio[t.dataset.c] = num(t.value);
        if (num(t.value) != null) l.done = true;
      });
    } else if (t.dataset.r) {
      save((l) => {
        l[t.dataset.r] = num(t.value);
        if (t.dataset.r === "rounds" && num(t.value)) l.done = true;
      });
    } else if (t.dataset.l === "note") {
      save((l) => {
        l.note = t.value;
      });
    }
    refreshDoneButton();
  });

  // Rest timer after you log the reps of a set.
  container.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.k === "reps" && num(t.value) != null && (!p.settings || p.settings.autoRest !== false)) startRest(restSec);
  });

  function currentTarget() {
    const l = getItemLog(date, scope, item.id) || {};
    return parseRx(personalize(l.rxOverride || rxFor(item, level), p));
  }

  function refreshDoneButton() {
    const l = getItemLog(date, scope, item.id) || {};
    const b = container.querySelector('[data-l="done"]');
    if (b) {
      b.classList.toggle("primary", !!l.done);
      b.innerHTML = `${icon("check")} ${l.done ? "Done" : "Mark done"}`;
    }
  }

  container.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const a = b.dataset.l;
    if (a === "done") {
      save((l) => {
        l.done = !l.done;
        if (l.done) l.skipped = false;
      });
      refreshDoneButton();
    } else if (a === "easier") {
      openEasier();
    } else if (a === "easier-undo") {
      save((l) => {
        delete l.easier;
        delete l.rxOverride;
        l.skipped = false;
        l.holdProgress = false;
      });
      draw();
      toast("Back to the plan's dose for today");
    } else if (a === "use") {
      const kind = b.dataset.useKind;
      const v = Number(b.dataset.useValue);
      const t = currentTarget();
      save((l) => {
        l.sets = l.sets || [];
        const n = Math.max(l.sets.length, t.sets || 1);
        while (l.sets.length < n) l.sets.push({});
        for (const s of l.sets) {
          if (kind === "kg" && s.kg == null) s.kg = v;
          else if (kind === "reps" && s.reps == null) s.reps = v;
          else if (kind === "sec" && s.sec == null) s.sec = v;
        }
      });
      draw();
      toast("Filled in the suggestion");
    } else if (a === "add") {
      const target = currentTarget();
      save((l) => {
        const n = Math.max(l.sets ? l.sets.length : 0, target.sets || 1);
        l.sets = l.sets || [];
        while (l.sets.length < n) l.sets.push({});
        l.sets.push({});
      });
      draw();
    } else if (a === "del") {
      const i = Number(b.dataset.i);
      save((l) => {
        if (l.sets && l.sets.length > i) l.sets.splice(i, 1);
      });
      draw();
    } else if (a === "hold") {
      const i = Number(b.dataset.i);
      const target = currentTarget();
      const secs = target.seconds || 30;
      startHold({
        title: ex.name,
        seconds: secs,
        sides: target.perSide ? 2 : 1,
        onFinish: () => {
          save((l) => {
            if (type === "hold") {
              l.sets = l.sets || [];
              while (l.sets.length <= i) l.sets.push({});
              if (l.sets[i].sec == null) l.sets[i].sec = secs;
            }
            l.done = true;
          });
          draw();
        },
      });
    } else if (a === "countdown") {
      const target = currentTarget();
      startCountdown({
        title: ex.name,
        minutes: target.minutes,
        sub: `${cardioLabel}: ${bpmRange(p, ...cardioRange)}`,
        onFinish: () => {
          save((l) => {
            l.cardio = l.cardio || {};
            if (l.cardio.min == null) l.cardio.min = target.minutes;
            l.done = true;
          });
          draw();
        },
      });
    } else if (a === "intervals") {
      const presets = timerPresets(item, level);
      const l0 = getItemLog(date, scope, item.id) || {};
      const preset = presets[Math.min(l0.preset || 0, presets.length - 1)];
      if (!preset) return;
      const hr = { work: preset.workHr ? bpmRange(p, ...preset.workHr) : "", rest: preset.restHr ? bpmRange(p, ...preset.restHr) : "" };
      startIntervals({
        title: `${ex.name} · ${preset.label}`,
        preset,
        hr,
        onFinish: (rounds) => {
          save((l) => {
            l.rounds = rounds;
            l.done = true;
          });
          draw();
        },
      });
    } else if (b.dataset.preset != null) {
      save((l) => {
        l.preset = Number(b.dataset.preset);
      });
      draw();
    }
  });

  draw();
  return { redraw: draw };
}
