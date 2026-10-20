// Changelog dialog: renders recent release notes in a modal dialog
// with pagination and a direct link to GitHub's full changelog.

import { openDialog, toast } from "./ui.js";
import { icon } from "./icons.js";
import { esc } from "../util.js";

export const REPO = "https://github.com/liviux/Bryan-Johnson-workout-website";
const PAGE_SIZE = 20;

export function renderReleases(list) {
  return list.map((release) => {
    const [heading, ...lines] = release.trim().split("\n");
    const [, version, date] = heading.match(/^## \[(.+?)\] - (.+)$/) || [];
    const planChanged = lines.some((line) => /^- \*\*Plan change:\*\*/.test(line));
    const changes = lines.map((line) => {
      const category = line.match(/^### (.+)$/);
      const item = line.match(/^(\s*)- (.+)$/);
      if (category) return `<h4>${esc(category[1])}</h4>`;
      if (item) {
        const planChange = item[2].startsWith("**Plan change:**");
        const text = esc(item[2]).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
        return `<p class="release-bullet${item[1] ? " nested" : ""}${planChange ? " release-plan-change" : ""}">${text}</p>`;
      }
      return "";
    }).join("");
    return `<section class="release-entry"><h3><span>v${esc(version || "?")}${planChanged ? ' <span class="plan-change-badge">Plan changed</span>' : ""}</span><small>${esc(date || "")}</small></h3>${changes}</section>`;
  }).join("");
}

export async function openChangelogDialog() {
  try {
    const res = await fetch("/api/changelog", { cache: "no-store" });
    if (!res.ok) throw new Error("Changelog unavailable");
    const releases = (await res.text()).split(/(?=^## \[)/m).filter((section) => section.startsWith("## ["));
    if (!releases.length) throw new Error("Changelog is empty");
    let shown = Math.min(PAGE_SIZE, releases.length);
    const content = `<div class="release-list">${renderReleases(releases.slice(0, shown))}</div>${shown < releases.length ? '<div class="btn-row changelog-more-row"><button type="button" class="btn sm" data-changelog-more>Read more</button></div>' : ""}`;
    const d = openDialog({ title: "Latest changes", content, wide: true });
    d.el.querySelector(".modal-head").classList.add("changelog-head");
    d.el.querySelector("[data-close]").insertAdjacentHTML("beforebegin", `<a class="btn sm" href="${REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Full changelog ${icon("external", "sm")}</a>`);
    d.el.querySelector(".changelog-head a").focus();
    d.el.scrollTop = 0;
    d.body.addEventListener("click", (ev) => {
      const moreBtn = ev.target.closest("[data-changelog-more]");
      if (!moreBtn) return;
      if (shown >= releases.length) return;
      const next = Math.min(shown + PAGE_SIZE, releases.length);
      const chunk = releases.slice(shown, next);
      const listEl = d.body.querySelector(".release-list");
      if (listEl && chunk.length) {
        listEl.insertAdjacentHTML("beforeend", renderReleases(chunk));
      }
      shown = next;
      if (shown >= releases.length) {
        const moreRow = moreBtn.closest(".changelog-more-row") || moreBtn;
        moreRow.remove();
      }
    });
    return d;
  } catch {
    toast("Couldn't load the changelog", { icon: "info" });
  }
}
