// Shared by the browser and local server. Speech follows the displayed dose.
import { personalize } from "../personalize.js";
import { EXERCISES } from "../data/exercises.js";

export const VOICES = [
  { id: "af_heart", sid: 3, name: "Heart", detail: "American woman · warm" },
  { id: "af_bella", sid: 2, name: "Bella", detail: "American woman · bright" },
  { id: "am_michael", sid: 16, name: "Michael", detail: "American man · clear" },
  { id: "am_puck", sid: 18, name: "Puck", detail: "American man · light" },
  { id: "bf_emma", sid: 21, name: "Emma", detail: "British woman · steady" },
];
export const PREVIEW = "Set two of three. Ten repetitions, with a slow, controlled movement on the way down.";
export const EFFORT = ["Leave five or more easy reps in reserve.", "Leave about four good reps in reserve.", "Leave two or three good reps in reserve.", "Leave one or two good reps in reserve on the main lifts."];
export const CLOCK = {
  ten: "Ten seconds left. Get ready for the next step.",
  workTen: "You have ten seconds left on this timer.",
  thirty: "You have thirty seconds left on this timer.",
  minute: "You have one minute left on this timer.",
  halfway: "You are halfway through this part of the workout.",
  restEnd: "Rest is over. Continue when you are ready.",
  done: "This timer is complete. You can log it now.",
  finish: "Your workout is complete. You can record how it felt in your notes.",
};

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
export function numberWords(value) {
  const [whole, decimal] = String(value).split(".");
  const n = Number(whole);
  let words = n < 20 ? ONES[n] : n < 100 ? `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}` : n < 1000 ? `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ""}` : n < 1000000 ? `${numberWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberWords(n % 1000)}` : ""}` : whole;
  if (decimal) words += ` point ${[...decimal].map((d) => ONES[Number(d)]).join(" ")}`;
  return words;
}

export function speechText(text, profile) {
  const shared = (text || "")
    .replace(/(\d+)\s*×\s*\{kg:[^}]+\}/g, "$1 weights at the weight shown on screen")
    .replace(/\{kg:[^}]+\}/g, "the weight shown on screen")
    .replace(/\{hr:[^}]+\}/g, "your prescribed heart-rate range");
  return personalize(shared, profile)
    .replace(/\{[^}]*\}/g, "")
    // A pair of weights is equipment, never another set prescription.
    .replace(/(\d+)\s*×\s*([\d.]+(?:[–-][\d.]+)?\s*(?:kg|lb))\b/g, "$1 weights of $2 each")
    .replace(/(\d+)\s*×\s*(\d+(?:[–-]\d+)?)(\s*(?:s\b|sec\b|min\b))?/g, (_, sets, reps, unit) => `${sets} ${sets === "1" ? "set" : "sets"} of ${reps}${unit || " reps"}`)
    .replace(/\/(side|leg|arm)\b/g, " each $1")
    .replace(/\bkg\b/g, "kilograms").replace(/\blb\b/g, "pounds")
    .replace(/\bbpm\b/g, "beats per minute").replace(/\bcm\b/g, "centimeters")
    .replace(/(\d)\s*in\b/g, "$1 inches")
    .replace(/\bmin\b/g, "minutes").replace(/\b(?:s|sec)\b/g, "seconds")
    .replace(/\bDB\b/gi, "dumbbell").replace(/\bRDL\b/g, "Romanian deadlift")
    .replace(/\bCARs\b/g, "controlled joint circles").replace(/\bROM\b/g, "range of motion")
    .replace(/\bATG\b/g, "A T G")
    .replace(/(\d)[–-](?=\d)/g, "$1 to ")
    .replace(/(\d)°/g, "$1 degrees").replace(/%/g, " percent")
    .replace(/[≈~]/g, "about ").replace(/@/g, " at ").replace(/\+/g, ", then ")
    .replace(/×/g, " by ").replace(/→/g, ", then ").replace(/[·;()/]/g, ", ")
    .replace(/[—–]/g, ", ").replace(/\b\d+(?:\.\d+)?\b/g, numberWords)
    .replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/(?:,\s*)+/g, ", ").trim().replace(/,\s*$/, "");
}

export function durationText(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return [mins ? `${numberWords(mins)} ${mins === 1 ? "minute" : "minutes"}` : "", secs ? `${numberWords(secs)} ${secs === 1 ? "second" : "seconds"}` : ""].filter(Boolean).join(" and ");
}

export function durationParts(seconds) {
  const mins = Math.floor(seconds / 60), secs = seconds % 60;
  return [mins ? `${numberWords(mins)} ${mins === 1 ? "minute" : "minutes"}` : "", mins && secs ? "and" : "", secs ? `${numberWords(secs)} ${secs === 1 ? "second" : "seconds"}` : ""].filter(Boolean);
}

export function restLine(seconds) {
  return `Rest for ${durationText(seconds)}. Continue when you are ready.`;
}

function levelText(text, level) {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => {
    if (/^At Returning and above/i.test(sentence)) return level >= 1;
    if (/^At New to training and Returning/i.test(sentence)) return level <= 1;
    if (/^At Returning\b/i.test(sentence)) return level === 1;
    if (/^At higher levels/i.test(sentence)) return level > 1;
    if (/^At Active\b/i.test(sentence)) return level === 2;
    if (/^(?:At )?Well trained\b/i.test(sentence)) return level === 3;
    const tag = sentence.match(/\((Returning|Active|Well trained)\):/);
    return !tag || ["", "Returning", "Active", "Well trained"][level] === tag[1];
  }).join(" ").replace(/^At (?:Returning and above|New to training and Returning|Returning|higher levels|Active|Well trained),?\s*/i, "").replace(/\((Returning|Active|Well trained)\):/g, ":");
}

// Keep clips short enough for the model and for the gap before a timer warning.
export function sentences(text) {
  return (text.match(/[^.!?]+(?:[.!?]+|$)/g) || []).map((s) => s.trim()).filter(Boolean)
    .flatMap((s) => s.length <= 280 ? [s] : s.split(/,\s+/)).filter(Boolean);
}

export function exerciseScript({ item, rx, profile, level, easier = false }) {
  const ex = EXERCISES[item.ex];
  const clean = (s) => speechText(levelText(s, level), profile);
  const name = speechText((item.label || ex.name).replace(/4\s*×\s*4/g, "four by four"), profile);
  const dose = speechText(rx, profile);
  const how = easier ? [] : (ex.how || []).map(clean).filter(Boolean).flatMap(sentences);
  const safety = [...new Set([...(ex.tips || []), ...(ex.how || [])].filter((s) => /\bstop\b|\bpain\b|dizziness|tingling/i.test(s)).map(clean).filter(Boolean).flatMap(sentences))];
  const match = /^(\d+)\s*×\s*(\d+(?:[–-]\d+)?)(\s*(?:s\b|min\b))?(\/(?:side|leg|arm))?/.exec(personalize(rx || "", profile));
  const setCount = match ? Number(match[1]) : null;
  const setDose = match ? speechText(`${match[2]}${match[3] || " reps"}${match[4] || ""}`, profile) : "";
  const sets = setCount ? Array.from({ length: setCount }, (_, index) => `Set ${numberWords(index + 1)} of ${numberWords(setCount)}. ${setDose}.`) : [];
  const intro = `${name}. ${dose}.`;
  return { name, intro: intro.length <= 280 ? [intro] : sentences(intro), safety, how, sets, setCount };
}

export function phaseLine(phase, type = "intervals", profile) {
  const duration = durationText(phase.sec);
  if (phase.kind === "ready") return "Get ready. Your timer will start in a few seconds.";
  if (type === "hold") return phase.kind === "rest" ? "Change sides. Get into position for the other side." : `${phase.label}. ${duration}. Breathe steadily throughout the hold.`;
  const name = phase.ex ? `${speechText(EXERCISES[phase.ex].name, profile)}. ` : "";
  const hr = phase.sec > 30 && phase.sub ? `${speechText(phase.sub, profile)}.` : "";
  if (type === "countdown") return `${speechText(phase.label, profile)}. ${duration}. ${hr}`.trim();
  if (phase.kind === "rest") return `Recover with easy marching. ${duration}. ${hr}`.trim();
  return `${name}${phase.round ? `Round ${numberWords(phase.round)} of ${numberWords(phase.total)}. ` : ""}${duration}. ${hr}`.trim();
}

export function clockKey(seconds, left, kind) {
  if (left === 10 && seconds >= 30) return kind === "rest" ? "ten" : "workTen";
  if (left === 30 && seconds >= 60 && kind === "work") return "thirty";
  if (left === 60 && seconds >= 180 && kind === "work") return "minute";
  if (left === Math.round(seconds / 2) && seconds >= 120 && kind === "work") return "halfway";
  return null;
}
