import { state, updateProfile } from "../store.js";
import { esc, h } from "../util.js";
import { icon } from "./icons.js";
import { VOICES } from "../voice/script.js";
import { cancelVoice, installVoice, onVoice, playVoice, prepareVoice, refreshVoiceStatus, selectedVoice, setVoiceEnabled, unlockVoice, voiceEnabled, voiceStatus } from "../voice/player.js";

export function createCoachControls({ popup = false, onChange = () => {} } = {}) {
  const el = h(`<div class="workout-coach${popup ? " coach-popup" : ""}">
    ${popup ? `<button type="button" class="btn sm ghost coach-toggle" aria-expanded="false" aria-controls="workout-coach-panel">${icon("volume", "sm")}<span>Coach</span></button>` : ""}
    <div class="coach-panel${popup ? " radio-panel" : ""}" ${popup ? 'id="workout-coach-panel" hidden' : ""} role="group" aria-label="Voice coach">
      <div class="radio-head"><div><h3>Voice coach</h3><small class="muted">Spoken guidance for your workout</small></div>${popup ? `<button type="button" class="btn sm ghost icon-only" data-coach="close" aria-label="Close coach">${icon("x", "sm")}</button>` : ""}</div>
      <p class="coach-status muted" role="status" aria-live="polite"></p>
      <div class="btn-row"><button type="button" class="btn primary" data-coach="enable"></button><button type="button" class="btn" data-coach="preview">${icon("play", "sm")} Preview</button></div>
      <button type="button" class="btn" data-coach="install">Download local voice</button>
      <small class="muted" data-coach="download-info">132 MB model download, plus the voice runtime. Uses about 215 MB on Linux, with up to 256 MB more for saved audio. Download once, then speech works offline.</small>
      <div class="coach-voices" aria-label="Coach voice">${VOICES.map((v) => `<button type="button" class="choice" data-coach-voice="${v.id}" aria-pressed="false"><b>${esc(v.name)}</b><small>${esc(v.detail)}</small></button>`).join("")}</div>
      <label class="field"><span>Coaching</span><select class="input" data-coach-option="coachDetail"><option value="coach">Cues and form tips during rest</option><option value="cues">Essential cues only</option></select></label>
      <label class="field"><span>Pace</span><select class="input" data-coach-option="coachPace"><option value="steady">Steady</option><option value="brisk">Brisk</option></select></label>
      <p class="muted coach-note">The coach reads today's dose, set numbers and timer cues. Form tips fit into rests; you count your own reps. Radio gets quieter while the coach speaks.</p>
      <button type="button" class="btn" data-coach="unlock" hidden>Tap to enable audio</button>
    </div>
  </div>`);
  const panel = el.querySelector(".coach-panel");
  const toggle = el.querySelector(".coach-toggle");
  let disposed = false;
  let poll = null;
  let previewToken = 0;
  function setOpen(value) { if (!popup) return; panel.hidden = !value; toggle.setAttribute("aria-expanded", String(value)); }
  function sync(status) {
    if (disposed) return;
    const enabled = voiceEnabled();
    el.querySelector(".coach-status").textContent = status.message;
    const button = el.querySelector('[data-coach="enable"]');
    button.textContent = enabled ? "Turn coaching off" : "Turn coaching on";
    button.setAttribute("aria-pressed", String(enabled));
    button.disabled = !status.installed || status.installing;
    toggle?.classList.toggle("is-on", enabled && status.installed);
    toggle?.setAttribute("aria-label", `Voice coach, ${enabled && status.installed ? "on" : "off"}`);
    const install = el.querySelector('[data-coach="install"]');
    install.hidden = status.installed && !status.installing && !status.error;
    install.disabled = status.installing;
    install.textContent = status.installing ? "Downloading…" : status.error ? "Reinstall local voice" : "Download local voice";
    el.querySelector('[data-coach="download-info"]').hidden = status.installed && !status.installing;
    el.querySelector('[data-coach="preview"]').disabled = !status.installed || status.installing;
    el.querySelector('[data-coach="unlock"]').hidden = !status.blocked;
    for (const v of el.querySelectorAll("[data-coach-voice]")) v.setAttribute("aria-pressed", String(v.dataset.coachVoice === selectedVoice().id));
    for (const input of el.querySelectorAll("[data-coach-option]")) input.value = state.profile?.settings?.[input.dataset.coachOption] || (input.dataset.coachOption === "coachDetail" ? "coach" : "steady");
    clearTimeout(poll);
    if (status.installing) poll = setTimeout(() => refreshVoiceStatus(), 1500);
  }
  const unsubscribe = onVoice(sync);
  refreshVoiceStatus();
  toggle?.addEventListener("click", () => setOpen(panel.hidden));
  el.addEventListener("click", async (event) => {
    const voice = event.target.closest("[data-coach-voice]");
    if (voice) {
      cancelVoice(); previewToken += 1;
      updateProfile((p) => { p.settings ||= {}; p.settings.coachVoice = voice.dataset.coachVoice; }, { silent: true });
      sync(voiceStatus); onChange();
      return;
    }
    const action = event.target.closest("[data-coach]")?.dataset.coach;
    if (action === "close") { setOpen(false); toggle?.focus(); }
    if (action === "unlock") { await unlockVoice(); onChange(); }
    if (action === "enable") { setVoiceEnabled(!voiceEnabled()); onChange(); }
    if (action === "install") {
      try { await installVoice(); } catch (err) { el.querySelector(".coach-status").textContent = err.message; }
    }
    if (action === "preview") {
      unlockVoice(); cancelVoice();
      const token = ++previewToken;
      const button = el.querySelector('[data-coach="preview"]');
      button.disabled = true;
      el.querySelector(".coach-status").textContent = "Preparing the preview…";
      try {
        const manifest = await prepareVoice({ preview: true });
        if (disposed || token !== previewToken) return;
        await playVoice(manifest.preview, { wait: true, preview: true, expires: Date.now() + 60000 });
      } catch (err) { voiceStatus.message = err.message; }
      finally { if (!disposed && token === previewToken) sync(voiceStatus); }
    }
  });
  el.addEventListener("change", (event) => {
    const key = event.target.dataset.coachOption;
    if (!key) return;
    cancelVoice(); previewToken += 1;
    updateProfile((p) => { p.settings ||= {}; p.settings[key] = event.target.value; }, { silent: true });
    onChange();
  });
  const pointer = (event) => { if (popup && !el.contains(event.target)) setOpen(false); };
  const keydown = (event) => {
    if (popup && !panel.hidden && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.focus(); }
  };
  if (popup) { document.addEventListener("pointerdown", pointer); document.addEventListener("keydown", keydown, true); }
  return { el, close: () => setOpen(false), dispose() {
    disposed = true; previewToken += 1; clearTimeout(poll); unsubscribe();
    document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", keydown, true);
    cancelVoice(); el.remove();
  } };
}
