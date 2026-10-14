// Video tabs: Bryan's own videos (opened at the right minute) and demo videos by
// other coaches. The YouTube player (privacy-enhanced youtube-nocookie.com) only
// loads when you press play.

import { BRYAN_VIDEOS } from "../data/videos.js";
import { esc, fmtSecs } from "../util.js";
import { icon } from "./icons.js";

export function youtubeId(url) {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url || "");
  return m ? m[1] : null;
}

const shortTitle = (t) => t.replace(/^Bryan( on X)?: /, "").replace(/^Bryan with /, "With ");

// All videos for an exercise, Bryan's first.
export function videosFor(ex) {
  const out = [];
  for (const b of ex.bryanVideos || []) {
    const v = BRYAN_VIDEOS[b.k];
    if (!v) continue;
    const at = typeof b.s === "number" ? b.s : null;
    out.push({ kind: "bryan", title: shortTitle(v.t) + (b.n ? ` (${b.n})` : ""), url: v.u, id: youtubeId(v.u), start: at });
  }
  for (const v of ex.videos || []) out.push({ kind: "demo", title: v.t, url: v.u, id: youtubeId(v.u), start: null });
  return out;
}

export function watchUrl(v) {
  if (!v.id) return v.url;
  return `https://www.youtube.com/watch?v=${v.id}${v.start ? `&t=${v.start}s` : ""}`;
}

export function renderVideos(container, list) {
  if (!list.length) {
    container.innerHTML = `<p class="muted">No video for this one. Follow the steps and the animation.</p>`;
    return;
  }
  let active = 0;
  function draw() {
    const v = list[active];
    container.innerHTML = `
      <div class="videos">
        <div class="video-tabs" role="group" aria-label="Videos">
          ${list
            .map(
              (x, i) =>
                `<button type="button" data-i="${i}" aria-pressed="${i === active}"><span class="tag ${x.kind === "demo" ? "demo" : ""}">${x.kind === "bryan" ? "Bryan" : "Demo"}</span><span>${esc(x.title)}</span></button>`
            )
            .join("")}
        </div>
        ${
          v.id
            ? `<div class="video-frame"><div class="poster" role="button" tabindex="0" aria-label="Play ${esc(v.title)}" style="background-image:url('https://i.ytimg.com/vi/${v.id}/hqdefault.jpg')"><span class="play">${icon("play")}</span><span class="vt">${esc(v.title)}${v.start ? ` · from ${fmtSecs(v.start)}` : ""}</span></div></div>`
            : `<div class="banner"><div class="grow"><b>${esc(v.title)}</b><span class="muted">This one is a post on X with a short clip.</span></div></div>`
        }
        <div class="video-meta"><span>${v.kind === "bryan" ? (v.start ? `Bryan does it at ≈${fmtSecs(v.start)} (times are approximate)` : "Bryan's own video or post") : "Technique demo by another coach"}</span><a href="${esc(watchUrl(v))}" target="_blank" rel="noopener">Open ${icon("external", "sm")}</a></div>
      </div>`;
  }
  function play() {
    const v = list[active];
    const frame = container.querySelector(".video-frame");
    if (!frame || !v.id) return;
    const params = new URLSearchParams({ autoplay: "1", rel: "0", playsinline: "1", modestbranding: "1" });
    if (v.start) params.set("start", String(v.start));
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?${params}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }
  container.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-i]");
    if (tab) {
      active = Number(tab.dataset.i);
      draw();
      return;
    }
    if (e.target.closest(".poster")) play();
  });
  container.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest(".poster")) {
      e.preventDefault();
      play();
    }
  });
  draw();
}
