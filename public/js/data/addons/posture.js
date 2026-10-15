// Optional add-on: the daily posture block (tech neck, forward shoulders).
// Same tracking as the main session. See addons/index.js for how add-ons work.

export default {
  id: "posture",
  name: "Posture correction",
  short: "Posture",
  icon: "posture",
  color: "violet",
  description: "8–10 minutes after each session for tech neck and forward shoulders: Bryan's posture habits and exercises (string cue, band pull-aparts, face pulls, external rotation, his two physical-therapist exercises twice a week), plus chin tucks and a doorway stretch.",
  // Which variant to show on each day ("optional" = shown, but not expected).
  schedule: { mon: "daily", tue: "daily", wed: "strength", thu: "daily", fri: "daily", sat: "strength", sun: "optional" },
  variants: {
    daily: {
      name: "Daily posture block",
      mins: 8,
      note: "Gentle effort; quality over load. Chin tucks and the doorway stretch are classics, not Bryan's.",
      items: [
        { id: "posture-string", ex: "string", rx: ["30 s", "30 s", "30 s", "30 s"] },
        {
          id: "posture-chintuck",
          ex: "chintuck",
          rx: ["1 × 6, 3 s hold", "1 × 8, 3 s hold", "2 × 8, 3 s hold", "2 × 10, 3 s hold"],
          bryan: "Classic (not Bryan)",
        },
        { id: "posture-wallslide", ex: "wallslide", rx: ["1 × 8 slow", "1 × 10 slow", "1 × 10 slow", "1 × 12 slow"] },
        {
          id: "posture-pullapart",
          ex: "pullapart",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20"],
          bryan: "Bryan: 1 × 15",
        },
        {
          id: "posture-facepull",
          ex: "facepull",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20–25"],
          bryan: "Bryan: 1 × 15–25",
        },
        {
          id: "posture-extrot",
          ex: "extrot",
          rx: ["1 × 10/arm @ {kg:1-2}", "1 × 10/arm @ {kg:1-2}", "1 × 12/arm @ {kg:2-3}", "1 × 15/arm @ {kg:3-4}"],
          bryan: "In Bryan’s routine",
        },
        {
          id: "posture-neck-gentle",
          ex: "neck",
          label: "Neck: forehead resistance, gentle",
          rx: ["3 × 10 s holds", "5 × 10 s holds", "5 × 10 s holds", "5 × 10 s holds"],
        },
        {
          id: "posture-doorway",
          ex: "doorway",
          rx: ["30 s/side", "30 s/side", "30 s/side", "45 s/side"],
          bryan: "Classic (not Bryan)",
        },
      ],
    },
    strength: {
      name: "Posture block, strength version",
      mins: 10,
      note: "Bryan's two physical-therapist exercises go to fatigue today (he does them twice a week).",
      items: [
        { id: "posture-string", ex: "string", rx: ["30 s", "30 s", "30 s", "30 s"] },
        {
          id: "posture-chintuck",
          ex: "chintuck",
          rx: ["1 × 6, 3 s hold", "1 × 8, 3 s hold", "2 × 8, 3 s hold", "2 × 10, 3 s hold"],
          bryan: "Classic (not Bryan)",
        },
        { id: "posture-wallslide", ex: "wallslide", rx: ["1 × 8 slow", "1 × 10 slow", "1 × 10 slow", "1 × 12 slow"] },
        {
          id: "posture-pullapart",
          ex: "pullapart",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20"],
          bryan: "Bryan: 1 × 15",
        },
        {
          id: "posture-facepull",
          ex: "facepull",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20–25"],
          bryan: "Bryan: 1 × 15–25",
        },
        {
          id: "posture-extrot",
          ex: "extrot",
          rx: ["1 × 10/arm @ {kg:1-2}", "1 × 10/arm @ {kg:1-2}", "1 × 12/arm @ {kg:2-3}", "1 × 15/arm @ {kg:3-4}"],
          bryan: "In Bryan’s routine",
        },
        {
          id: "posture-doorway",
          ex: "doorway",
          rx: ["30 s/side", "30 s/side", "30 s/side", "45 s/side"],
          bryan: "Classic (not Bryan)",
        },
        {
          id: "posture-levator",
          ex: "levator",
          rx: [
            "1 × 10 @ 2 × {kg:3.5-4}, stop well before fatigue",
            "1 set to fatigue @ 2 × {kg:3.5-4}",
            "1 set to fatigue @ 2 × {kg:5-6}",
            "1 set to fatigue @ 2 × {kg:6-9}",
          ],
          bryan: "Bryan: 1 set to fatigue, 2×/wk",
        },
        {
          id: "posture-neck-fatigue",
          ex: "neck",
          label: "Neck: forehead resistance to fatigue",
          rx: ["1 × 5 slow holds, stop well before fatigue", "1 set to fatigue, slow and patient", "1 set to fatigue", "1 set to fatigue"],
          bryan: "Bryan: to fatigue, 2×/wk",
        },
      ],
    },
  },
  // Extra things tracked once per day for this add-on.
  metrics: [
    { id: "stiffness", type: "scale", min: 0, max: 10, label: "Neck and upper-back stiffness today", low: "none", high: "very stiff" },
  ],
  // Reminders that come back every N days.
  periodic: [
    { id: "photo", every: 14, label: "Side photo in the same spot: is your ear over your shoulder?" },
    { id: "wall", every: 14, label: "Wall check: heels 5 cm from the wall, can the back of your head touch it with your eyes level?" },
  ],
  habits: [
  {
    h: "String cue",
    d: "Every time you sit down or stand up, imagine the string pulling the crown of your head up.",
  },
  {
    h: "Phone at eye level",
    d: "Bryan calls the phone the worst trigger for bad posture. Lift it to eye level instead of looking down; put the top of your monitor at eye level too.",
  },
  {
    h: "Move every 30 minutes",
    d: "Get up for 2–3 minutes every 30 minutes and rotate between sitting and standing, as Bryan does at his desk. An under-desk treadmill is ideal for this.",
  },
  {
    h: "10 squats every ~45 minutes",
    d: "Bryan’s April 2026 tip for long sitting days, from a study where it beat one 30-minute walk for blood sugar. He stressed that breaking up the sitting is what matters.",
  },
  {
    h: "Two strength exercises, twice a week",
    d: "Shoulders up and out + neck forehead resistance, 1 set to fatigue each, on Wednesday and Saturday.",
  },
  {
    h: "Expect soreness",
    d: "Bryan’s guide: holding good posture takes muscle, and feeling sore at first is normal. Keep going. Sharp pain, tingling or headaches are different: stop and get it checked.",
  },
],
  checks: [
  "Every 2 weeks, take a relaxed side photo in the same spot. The ear should sit over the shoulder, not in front of it.",
  "Wall check: heels about 5 cm from a wall, buttocks and shoulder blades touching. The back of your head should reach the wall with your eyes level, without straining.",
  "Each evening, rate neck and upper-back stiffness from 0 to 10.",
  "When the photo and wall check look right and stiffness stays at 2 or below for 4 weeks, switch to maintenance: keep the two strength exercises twice a week and the habits (that is what Bryan keeps doing), and cut the daily block to 2–3 times a week.",
],
};
