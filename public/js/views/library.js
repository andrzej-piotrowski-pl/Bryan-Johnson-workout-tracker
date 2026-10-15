// Exercise library: every exercise with a 3D preview, search and categories,
// Bryan's own videos, and a detail page showing where it sits in your plan.

import { CATEGORIES, EXERCISES } from "../data/exercises.js";
import { DAYS } from "../data/program.js";
import { ADDONS } from "../data/addons/index.js";
import { BRYAN_VIDEOS, WATCH } from "../data/videos.js";
import { state } from "../store.js";
import { rxFor } from "../plan.js";
import { LEVELS, levelIndex, personalize } from "../personalize.js";
import { esc } from "../util.js";
import { icon } from "../components/icons.js";
import { createExercisePanel } from "../components/exercise-panel.js";
import { renderVideos, youtubeId } from "../components/video.js";
import { thumbnail } from "../components/thumbs.js";

function usages(exId) {
  const out = [];
  for (const d of DAYS) for (const b of d.blocks) for (const it of b.items) if (it.ex === exId) out.push({ where: `${d.name} · ${b.name}`, item: it });
  for (const a of ADDONS) for (const v of Object.values(a.variants)) for (const it of v.items) if (it.ex === exId) out.push({ where: `${a.name} · ${v.name}`, item: it });
  return out;
}

export function render(el, params) {
  if (params[0] && EXERCISES[params[0]]) return detail(el, params[0]);
  let q = "";
  let cat = "all";
  let io = null;

  function cards() {
    const needle = q.trim().toLowerCase();
    const list = Object.entries(EXERCISES).filter(([id, e]) => (cat === "all" || e.cat === cat) && (!needle || e.name.toLowerCase().includes(needle) || id.includes(needle) || (e.muscles || []).some((m) => m.toLowerCase().includes(needle))));
    if (!list.length) return `<div class="card empty">No exercise matches “${esc(q)}”.</div>`;
    return `<div class="lib-grid">${list
      .map(
        ([id, e]) => `<a class="card ex-card" href="#/library/${id}">
          <div class="thumb" data-thumb="${id}"><span class="muted">${icon("rotate")}</span></div>
          <div class="meta"><span class="eyebrow">${esc(e.cat)}</span><b>${esc(e.name)}</b>
          <span class="chips">${e.classic ? '<span class="badge-classic">classic</span>' : ""}${(e.bryanVideos || []).some((b) => typeof b.s === "number") ? `<span class="chip bryan">${icon("video", "sm")} Bryan</span>` : ""}</span></div>
        </a>`
      )
      .join("")}</div>`;
  }

  function draw() {
    el.innerHTML = `<div class="page">
      <div class="section-title"><h2>Exercises</h2><span class="muted">${Object.keys(EXERCISES).length} exercises, each with a 3D animation, steps and videos</span></div>
      <details class="card card-pad">
        <summary style="cursor:pointer;font-weight:650;display:flex;gap:8px;align-items:center">${icon("video")} Watch Bryan first</summary>
        <div style="display:grid;gap:12px;margin-top:12px">
          <ul class="list">${WATCH.map(([k, d]) => `<li><a href="${esc(BRYAN_VIDEOS[k].u)}" target="_blank" rel="noopener">${esc(BRYAN_VIDEOS[k].t.replace(/^Bryan( on X)?: /, ""))}</a> <span class="muted">${esc(d)}</span></li>`).join("")}</ul>
          <div data-watch></div>
        </div>
      </details>
      <div class="lib-tools">
        <input class="input" type="search" data-q placeholder="Search: squat, neck, band, glutes…" value="${esc(q)}" aria-label="Search exercises">
        <div class="seg" role="group" aria-label="Category">${["all", ...CATEGORIES].map((c) => `<button type="button" data-cat="${esc(c)}" aria-pressed="${cat === c}">${esc(c === "all" ? "All" : c)}</button>`).join("")}</div>
      </div>
      <div data-cards>${cards()}</div>
    </div>`;
    const vids = WATCH.map(([k]) => ({ kind: "bryan", title: BRYAN_VIDEOS[k].t.replace(/^Bryan( on X)?: /, ""), url: BRYAN_VIDEOS[k].u, id: youtubeId(BRYAN_VIDEOS[k].u), start: null })).filter((v) => v.id);
    renderVideos(el.querySelector("[data-watch]"), vids);
    observeThumbs();
  }

  function observeThumbs() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        io.unobserve(en.target);
        const id = en.target.dataset.thumb;
        thumbnail(id)
          .then((url) => {
            if (url) en.target.innerHTML = `<img alt="" src="${url}">`;
          })
          .catch(() => {});
      }
    }, { rootMargin: "200px" });
    el.querySelectorAll("[data-thumb]").forEach((t) => io.observe(t));
  }

  el.addEventListener("input", (e) => {
    if (e.target.matches("[data-q]")) {
      q = e.target.value;
      el.querySelector("[data-cards]").innerHTML = cards();
      observeThumbs();
    }
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (b) {
      cat = b.dataset.cat;
      el.querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      el.querySelector("[data-cards]").innerHTML = cards();
      observeThumbs();
    }
  });
  draw();
  return { destroy: () => io && io.disconnect() };
}

function detail(el, id) {
  const ex = EXERCISES[id];
  const p = state.profile;
  const cur = levelIndex(p);
  const uses = usages(id);
  el.innerHTML = `<div class="page">
    <div class="btn-row"><a class="btn sm" href="#/library">${icon("chevronL", "sm")} All exercises</a></div>
    <div class="day-layout">
      <div style="display:grid;gap:16px;min-width:0">
        <div data-panel></div>
      </div>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="card card-pad" style="display:grid;gap:10px">
          <h3>In your plan</h3>
          ${
            uses.length
              ? `<div class="table-wrap"><table><thead><tr><th>Where</th>${LEVELS.map((l, i) => `<th class="${i === cur ? "cur" : ""}">${esc(l.name)}</th>`).join("")}</tr></thead><tbody>${uses
                  .map((u) => `<tr><td>${esc(u.where)}</td>${LEVELS.map((_, i) => `<td class="${i === cur ? "cur" : ""}">${esc(personalize(rxFor(u.item, i), { ...p, level: LEVELS[i].id }))}</td>`).join("")}</tr>`)
                  .join("")}</tbody></table></div>`
              : `<p class="muted">Not scheduled in the current plan.</p>`
          }
        </section>
      </div>
    </div>
  </div>`;
  const panel = createExercisePanel(el.querySelector("[data-panel]"), { mode: "library" });
  panel.show({ exId: id });
  return { destroy: () => panel.dispose() };
}
