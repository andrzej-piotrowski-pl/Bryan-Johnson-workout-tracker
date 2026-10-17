// Logging UI for one exercise on one day: sets × reps × load, holds with a timer,
// cardio minutes and heart rate, or interval rounds. Everything auto-saves.

import { state } from "../store.js";
import { editDay, rxFor, timerPresets } from "../plan.js";
import { kgUnit, personalize, suggestedKg, bpmRange } from "../personalize.js";
import { esc, fmtShort } from "../util.js";
import { icon } from "./icons.js";
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

// Most recent earlier log of the same exercise, for "last time".
export function lastPerformance(exId, beforeDate) {
  const dates = Object.keys(state.days).filter((d) => d < beforeDate).sort().reverse();
  for (const date of dates) {
    const day = state.days[date];
    const bags = [day.items, ...Object.values(day.addons || {}).map((a) => a && a.items)];
    for (const bag of bags) {
      for (const l of Object.values(bag || {})) {
        if (l.ex === exId && l.sets && l.sets.some((s) => s.reps != null || s.kg != null || s.sec != null)) return { date, log: l };
      }
    }
  }
  return null;
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
  const rxText = personalize(rxFor(item, level), p);
  const target = parseRx(rxText);
  const type = ex.log;
  const u = kgUnit(p);
  const kgPh = suggestedKg(rxFor(item, level), p);
  const restSec = (p && p.settings && p.settings.restSec) || 75;
  const cardioRange = item.intensity === "light" ? [50, 60] : ex.intensity === "hard" ? [80, level === 1 ? 85 : 90] : [60, 70];
  const cardioLabel = item.intensity === "light" ? "Easy pace" : ex.intensity === "hard" ? "Vigorous" : "Zone 2";

  function draw() {
    const l = getItemLog(date, scope, item.id) || {};
    const done = !!l.done;
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
      if (type === "load" || type === "carry") cols.push(["kg", u, kgPh != null ? toUnit(kgPh) : ""]);
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
                  return `<input class="input num" inputmode="decimal" data-set="${i}" data-k="${k}" value="${esc(v)}" placeholder="${esc(ph)}" aria-label="Set ${i + 1} ${k}">`;
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

    const last = type !== "check" && type !== "cardio" && type !== "intervals" ? lastPerformance(item.ex, date) : null;
    body += last ? `<p class="muted" style="font-size:0.84rem">Last time (${esc(fmtShort(last.date))}): <span class="mono">${esc(summarizeLog(last.log, type))}</span></p>` : "";
    body += `<details ${l.note ? "open" : ""}><summary class="muted" style="cursor:pointer;font-size:0.86rem">${icon("note", "sm")} Note for this exercise</summary><textarea class="input" data-l="note" rows="2" placeholder="Note how it felt, any pain or a technique cue to remember." style="margin-top:8px;min-height:64px">${esc(l.note || "")}</textarea></details>`;
    container.innerHTML = `<div class="logger">${body}</div>`;
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
      });
      refreshDoneButton();
    } else if (a === "add") {
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
