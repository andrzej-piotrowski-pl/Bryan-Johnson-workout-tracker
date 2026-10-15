// The weekly program: phases, the six training days and their doses.
// rx arrays are [Phase 1, Phase 2, Phase 3]; "—" means skip it in that phase.
// Item ids are stable keys for your logs; change them only with care.

export const PROGRAM = {
  name: "Bryan Johnson–inspired home program",
  version: "v2 · October 2026",
  summary: "Strength Monday, Wednesday and Friday, short intervals Tuesday, the Norwegian 4×4 Thursday, easy Zone 2 Saturday, rest Sunday. Built from Bryan Johnson's public protocol and rebuilt for a home with bodyweight, adjustable dumbbells, a pull-up bar and bands.",
};

export const PHASES = [
  {
    name: "Re-entry",
    weeks: "Weeks 1–2",
    effort: "Effort 5–6 out of 10: stop each set with about 4 good reps left.",
    points: [
      "2 sets on main lifts, 1 set on Bryan’s high-rep accessories. Learn the positions.",
      "Jumps are landing drills only (snap-downs). Nordics are slow lowers only.",
      "Tuesday: 20 s brisk bursts with long recoveries. Thursday: 2 rounds in week 1 and 3 in week 2, controlled.",
      "Zone 2 20–25 min. Some muscle soreness is expected; joint pain is not. If you are still very sore after 48 hours, repeat the week.",
    ],
  },
  {
    name: "Build",
    weeks: "Weeks 3–6",
    effort: "Effort about 7 out of 10: 2–3 reps left in each set.",
    points: [
      "3 sets on most strength work. Real jumps start; stick every landing.",
      "Tuesday: 8 × 20 s hard. Thursday: 3 rounds of 4 min, then 4 rounds from week 5.",
      "Zone 2 25–35 min, plus short blocks on Monday.",
    ],
  },
  {
    name: "Blueprint",
    weeks: "Week 7 onward",
    effort: "Effort 8 out of 10 on the main lifts (1–2 reps left); Bryan’s 1 × 25-style accessories go close to fatigue.",
    points: [
      "Galpin-style heavy work on the big lifts, with jump contrast after Friday’s RDL.",
      "Tuesday: two blocks of 8 × 20 s all-out. Thursday: the full Norwegian 4×4 at {hr:85-95}.",
      "Saturday Zone 2 grows to 40 min; a weighted vest is optional.",
    ],
  },
];

export const RULES = [
  "Add weight only when you hit the top of the rep range on every set with clean form, two sessions in a row: about +{kg:1-2} per dumbbell for upper body, +{kg:2-4} for legs. Bryan’s protocol calls progressive overload the key, raised gradually.",
  "Injury prevention is Bryan’s priority #1. Swap to the easier variant (open the exercise) whenever a joint complains.",
  "The 4×4 is hard but controlled. If you can’t hold the pace in the last round, start slower next time.",
  "Rough week (bad sleep, stress, sickness): repeat the previous week instead of pushing on.",
  "If you have been inactive for a while, are over 50 or have any heart condition, get a basic check-up (blood pressure, resting ECG) before your first all-out intervals.",
];

// Heart-rate zones as % of max heart rate; bpm are computed from the user's profile.
export const ZONES = [
  { zone: "Zone 1", pct: [50, 60], feel: "Very easy: warm-ups, easy walking" },
  { zone: "Zone 2", pct: [60, 70], feel: "Full sentences possible: Bryan’s 150 min/week" },
  { zone: "Zone 3", pct: [70, 80], feel: "Short phrases only" },
  { zone: "Zone 4", pct: [80, 90], feel: "Hard; a few words" },
  {
    zone: "Zone 5",
    pct: [90, 100],
    feel: "Can’t talk: end of the 20 s bursts and of each 4×4 round",
  },
];

export const DAYS = [
  {
    key: "mon",
    name: "Monday",
    short: "Mon",
    tag: "Lift A",
    title: "Strength A · Squat, push, pull + knees",
    focus: "Day 1 of Bryan’s template (squat, push-up, row, swing, plank) with his Knees-Over-Toes step-up, tibialis and calf work, and a few jumps from his 2026 training.",
    blocks: [
      {
        name: "Warm-up",
        mins: [9, 9, 10],
        note: "Bryan’s official warm-up: a few minutes of easy movement, then dynamic moves. Hops and balance come from his bone protocol and his five pillars.",
        items: [
          {
            id: "mon-warm-up-backwalk",
            ex: "backwalk",
            rx: [
              "2 min, bodyweight",
              "2 min holding 2 × {kg:8-10}",
              "2–3 min holding 2 × {kg:12-16} or band-resisted",
            ],
            bryan: "Bryan: backward sled ≈2 min",
          },
          { id: "mon-warm-up-dynamic", ex: "dynamic", rx: ["≈4 min, full series", "≈4 min", "≈4 min"] },
          {
            id: "mon-warm-up-pogo",
            ex: "pogo",
            rx: ["2 × 10, low", "2 × 20", "3 × 20"],
            bryan: "Bone protocol: hops 4–7×/wk",
          },
          {
            id: "mon-warm-up-balance",
            ex: "balance",
            rx: [
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
        ],
      },
      {
        name: "Jumps",
        mins: [3, 4, 4],
        note: "Max intent, 45–60 s rest. Stop the set if landings get loud.",
        items: [
          {
            id: "mon-jumps-jumps",
            ex: "jumps",
            label: "Jumps",
            rx: [
              "Snap-downs 2 × 5",
              "Squat jumps 3 × 3, stick each landing",
              "Countermovement jumps 3 × 3, stick each landing",
            ],
            bryan: "Bryan 2026: jumps for fast-twitch power",
          },
        ],
      },
      {
        name: "Strength",
        mins: [22, 28, 30],
        note: "Rest 60–90 s between sets. Pair push-ups with rows to save time.",
        items: [
          {
            id: "mon-strength-gobletsquat",
            ex: "gobletsquat",
            rx: [
              "2 × 10 @ {kg:10-14}, 3 s down",
              "3 × 8–10 @ {kg:14-20}",
              "3 × 6–8, heaviest dumbbell, 3 s down",
            ],
            bryan: "Official 3 × 10–15; Bryan 2 × 5–8",
          },
          {
            id: "mon-strength-pushup",
            ex: "pushup",
            rx: ["3 × 8–10, hands raised if needed", "3 × 10–12", "3 × 12–15, 3 s down, or feet raised"],
            bryan: "Official: 3 × 8–12",
          },
          {
            id: "mon-strength-row",
            ex: "row",
            rx: ["2 × 10/side @ {kg:14-16}", "3 × 10/side @ {kg:18-20}", "3 × 8–10/side, heaviest dumbbell"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "mon-strength-poliquin",
            ex: "poliquin",
            rx: [
              "2 × 10/leg, {cm:10-15} step",
              "3 × 10/leg",
              "3 × 10/leg, {cm:20} step or holding 2 × {kg:6-8}",
            ],
            bryan: "Bryan: 3 × 10/leg",
          },
          {
            id: "mon-strength-swing",
            ex: "swing",
            rx: ["2 × 10 @ {kg:12-16}", "3 × 12 @ {kg:16-20}", "3 × 15 @ {kg:20-24}"],
            bryan: "Official: 3 × 30 s",
          },
        ],
      },
      {
        name: "Core & knees",
        mins: [6, 8, 8],
        note: "Back to back, minimal rest.",
        items: [
          {
            id: "mon-core-knees-tibraise",
            ex: "tibraise",
            rx: ["1 × 15–20", "1 × 25", "1 × 25 + 1 × 10/leg single-leg"],
            bryan: "Bryan: 1 × 25",
          },
          {
            id: "mon-core-knees-calf",
            ex: "calf",
            label: "Seated dumbbell calf raise",
            rx: ["1 × 15 @ 2 × {kg:10}", "1 × 20 @ 2 × {kg:14}", "1 × 25 @ 2 × {kg:16-20}"],
            bryan: "Bryan: 1 × 25",
          },
          {
            id: "mon-core-knees-plank",
            ex: "plank",
            rx: ["2 × 20–30 s", "3 × 30 s", "3 × 45 s"],
            bryan: "Official: 3 × 20–30 s",
          },
          {
            id: "mon-core-knees-legraise",
            ex: "legraise",
            rx: [
              "2 × 8 knee raises",
              "2 × 12 knee raises",
              "Straight legs: 30–50 reps in as few sets as possible",
            ],
            bryan: "Bryan: 1 × 50",
          },
        ],
      },
      {
        name: "Zone 2",
        mins: [0, 8, 10],
        items: [
          {
            id: "mon-zone-2-zone2",
            ex: "zone2",
            label: "Step-ups or marching at {hr:60-70}",
            rx: ["—", "8 min", "10 min"],
            bryan: "Official Day 1 adds 25 min",
          },
        ],
      },
      {
        name: "Cool-down",
        mins: 3,
        items: [
          { id: "mon-cool-down-couch", ex: "couch", rx: ["30 s/side", "30 s/side", "45 s/side"] },
          { id: "mon-cool-down-shin", ex: "shin", rx: ["30 s", "30 s", "30 s"] },
        ],
      },
    ],
  },
  {
    key: "tue",
    name: "Tuesday",
    short: "Tue",
    tag: "Bursts",
    title: "Intervals 1 · 20-second bursts + Zone 2 + back & core",
    focus: "Tuesday of Bryan’s template: short hard bursts, then steady Zone 2. Finished with the back and oblique work from his list and the Pallof press from his Galpin session.",
    blocks: [
      {
        name: "Warm-up",
        mins: [9, 9, 10],
        note: "Bryan’s official warm-up: a few minutes of easy movement, then dynamic moves. Hops and balance come from his bone protocol and his five pillars.",
        items: [
          {
            id: "tue-warm-up-backwalk",
            ex: "backwalk",
            rx: [
              "2 min, bodyweight",
              "2 min holding 2 × {kg:8-10}",
              "2–3 min holding 2 × {kg:12-16} or band-resisted",
            ],
            bryan: "Bryan: backward sled ≈2 min",
          },
          { id: "tue-warm-up-dynamic", ex: "dynamic", rx: ["≈4 min, full series", "≈4 min", "≈4 min"] },
          {
            id: "tue-warm-up-pogo",
            ex: "pogo",
            rx: ["2 × 10, low", "2 × 20", "3 × 20"],
            bryan: "Bone protocol: hops 4–7×/wk",
          },
          {
            id: "tue-warm-up-balance",
            ex: "balance",
            rx: [
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
        ],
      },
      {
        name: "Short intervals",
        mins: [7, 9, 14],
        note: "Use the indoor interval moves. Quiet options exist for every move.",
        items: [
          {
            id: "tue-short-intervals-shortint",
            ex: "shortint",
            rx: [
              "6 × (20 s brisk / 40 s easy)",
              "8 × (20 s hard / 40 s easy)",
              "2 × [8 × (20 s all-out / 20 s easy)], 3 min easy between",
            ],
            bryan: "Newest template: 8 × 20 s",
            timer: [
              [{ label: "6 rounds", rounds: 6, work: 20, rest: 40 }],
              [{ label: "8 rounds", rounds: 8, work: 20, rest: 40 }],
              [{ label: "2 blocks of 8", blocks: 2, rounds: 8, work: 20, rest: 20, blockRest: 180 }],
            ],
          },
          {
            id: "tue-short-intervals-indoorhiit",
            ex: "indoorhiit",
            label: "Moves: step-ups, high knees, climbers, jacks, burpees",
            rx: ["Pick 1–2", "Pick 2", "Pick 2–3"],
          },
        ],
      },
      {
        name: "Zone 2",
        mins: [20, 28, 30],
        items: [
          {
            id: "tue-zone-2-zone2",
            ex: "zone2",
            rx: ["20 min @ {hr:60-70}", "25–30 min", "30 min"],
            bryan: "Bryan: 150 min/week",
          },
        ],
      },
      {
        name: "Back & core",
        mins: [6, 8, 9],
        items: [
          {
            id: "tue-back-core-backext",
            ex: "backext",
            rx: ["1 × 12, 2 s hold at top", "1 × 20", "1 × 25, holding {kg:5-10} when easy"],
            bryan: "Bryan: 1 × 25 + 20 kg plate",
          },
          {
            id: "tue-back-core-sidebend",
            ex: "sidebend",
            rx: ["1 × 12/side @ {kg:10-12}", "1 × 20/side", "1 × 25/side @ {kg:16-20}"],
            bryan: "Bryan: 1 × 25",
          },
          {
            id: "tue-back-core-pallof",
            ex: "pallof",
            rx: ["2 × 8/side, 2 s hold", "2 × 10/side", "2 × 12/side, 3 s hold"],
            bryan: "Bryan 2025 (Galpin)",
          },
        ],
      },
      {
        name: "Cool-down",
        mins: 3,
        items: [
          { id: "tue-cool-down-hipflexor", ex: "hipflexor", rx: ["30 s/side", "30 s/side", "45 s/side"] },
          { id: "tue-cool-down-hamstring", ex: "hamstring", rx: ["30 s/side", "30 s/side", "45 s/side"] },
        ],
      },
    ],
  },
  {
    key: "wed",
    name: "Wednesday",
    short: "Wed",
    tag: "Lift B",
    title: "Strength B · Pull, knees & mobility",
    focus: "Built exactly like Bryan’s mobility strength day (10 min dynamic, 30 min strength, 15 min yoga and balance, 5 min stretching), with his pulling, Knees-Over-Toes and high-rep arm work. First posture-strength day.",
    blocks: [
      {
        name: "Dynamic mobility",
        mins: 10,
        note: "Bryan’s official list: arm circles, wall slides, thread the needle, hip CARs.",
        items: [
          { id: "wed-dynamic-mobility-backwalk", ex: "backwalk", rx: ["2 min", "2 min", "2 min"] },
          {
            id: "wed-dynamic-mobility-dynamic",
            ex: "dynamic",
            label: "Arm circles + hip CARs",
            rx: ["2 min", "2 min", "2 min"],
          },
          { id: "wed-dynamic-mobility-wallslide", ex: "wallslide", rx: ["1 × 10", "1 × 10", "1 × 10"] },
          { id: "wed-dynamic-mobility-thread", ex: "thread", rx: ["5/side", "5/side", "5/side"] },
          { id: "wed-dynamic-mobility-pogo", ex: "pogo", rx: ["2 × 10", "2 × 20", "2 × 20"] },
        ],
      },
      {
        name: "Strength",
        mins: [24, 28, 30],
        note: "Rest 60–90 s on the first three, 30–45 s on the rest.",
        items: [
          {
            id: "wed-strength-chinup",
            ex: "chinup",
            label: "Pull-ups (palms away)",
            rx: ["3 × 3–5 band-assisted or 5 s negatives", "3 × 5–6", "3 × 6–8; add a loaded backpack at 3 × 8"],
            bryan: "Bryan 2025: 2 × 5–8",
          },
          {
            id: "wed-strength-atg",
            ex: "atg",
            rx: ["2 × 6/leg, hand on a chair", "3 × 8/leg, full depth", "3 × 8–10/leg holding 2 × {kg:8-14}"],
            bryan: "Bryan: 3 × 10",
          },
          {
            id: "wed-strength-nordic",
            ex: "nordic",
            rx: ["2 × 3–4 slow lowers", "2 × 4–6", "2 × 5–8"],
            bryan: "Bryan: 1 × 10 → 2 × 5–8",
          },
          {
            id: "wed-strength-revnordic",
            ex: "revnordic",
            rx: ["1 × 6, small range", "1 × 8–10", "1 × 10, full range"],
            bryan: "Bryan: 1 × 10",
          },
          {
            id: "wed-strength-triceps",
            ex: "triceps",
            rx: ["1 × 15 @ {kg:4}", "1 × 20 @ {kg:4.5}", "1 × 25 @ {kg:4.5-6}, 1 s hold at top"],
            bryan: "Bryan: 1 × 25 @ 4.5 kg",
          },
          {
            id: "wed-strength-curl",
            ex: "curl",
            rx: ["1 × 12 @ {kg:6-8}", "1 × 15 @ {kg:8}", "1 × 15–20 @ {kg:8-10}"],
            bryan: "On Bryan’s list",
          },
          {
            id: "wed-strength-fly",
            ex: "fly",
            rx: ["1 × 15, light band", "1 × 15", "1 × 15, 1 s squeeze"],
            bryan: "Bryan: 1 × 15",
          },
          {
            id: "wed-strength-farmer",
            ex: "farmer",
            rx: ["2 × 30 s @ 2 × {kg:12-16}", "3 × 30 s @ 2 × {kg:18-20}", "3 × 40 s, heaviest pair"],
            bryan: "Official: 3 × 30 s",
          },
        ],
      },
      {
        name: "Beginner yoga & balance",
        mins: 10,
        note: "Bryan’s official list: cat-cow, cobbler’s pose, tree pose, cobra. Stay longer when you have time (his version is 15 min).",
        items: [
          {
            id: "wed-beginner-yoga-balance-catcow",
            ex: "catcow",
            rx: ["10 breaths", "10 breaths", "10 breaths"],
          },
          { id: "wed-beginner-yoga-balance-butterfly", ex: "butterfly", rx: ["60 s", "90 s", "90 s"] },
          {
            id: "wed-beginner-yoga-balance-tree",
            ex: "tree",
            rx: ["2 × 30 s/side", "2 × 30 s/side", "2 × 30 s/side, eyes closed"],
          },
          {
            id: "wed-beginner-yoga-balance-balance",
            ex: "balance",
            rx: [
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
          { id: "wed-beginner-yoga-balance-cobra", ex: "cobra", rx: ["3 × 15 s", "3 × 20 s", "3 × 20 s"] },
        ],
      },
      {
        name: "Static stretching",
        mins: 5,
        items: [
          { id: "wed-static-stretching-couch", ex: "couch", rx: ["45 s/side", "45 s/side", "45 s/side"] },
          {
            id: "wed-static-stretching-hamstring",
            ex: "hamstring",
            rx: ["45 s/side", "45 s/side", "45 s/side"],
          },
          { id: "wed-static-stretching-bigtoe", ex: "bigtoe", rx: ["30 s", "45 s", "45 s"] },
        ],
      },
    ],
  },
  {
    key: "thu",
    name: "Thursday",
    short: "Thu",
    tag: "4×4",
    title: "Intervals 2 · Norwegian 4×4 + stability",
    focus: "Thursday of Bryan’s template: the Norwegian 4×4, done indoors, then his official stability menu.",
    blocks: [
      {
        name: "Warm-up",
        mins: 10,
        items: [
          {
            id: "thu-warm-up-zone2",
            ex: "zone2",
            label: "Easy step-ups or marching, building to {hr:~71}",
            rx: ["8 min", "8 min", "8 min"],
          },
          {
            id: "thu-warm-up-dynamic",
            ex: "dynamic",
            label: "Leg swings + hip CARs",
            rx: ["2 min", "2 min", "2 min"],
          },
        ],
      },
      {
        name: "Norwegian 4×4",
        mins: [15, 25, 25],
        note: "Hard but controlled. Rotate the indoor moves every minute.",
        items: [
          {
            id: "thu-norwegian-4-4-norwegian",
            ex: "norwegian",
            rx: [
              "Week 1: 2 rounds, week 2: 3 rounds of (3 min @ {hr:80-85} / 3 min easy)",
              "Weeks 3–4: 3 × (4 min / 3 min); weeks 5–6: 4 × (4 min / 3 min) @ {hr:82-91}",
              "4 × (4 min @ {hr:85-95} / 3 min @ {hr:60-70})",
            ],
            bryan: "Newest template: Thursday",
            timer: [
              [
                {
                  label: "Week 1: 2 rounds",
                  rounds: 2,
                  work: 180,
                  rest: 180,
                  workHr: [80, 85],
                  restHr: [60, 70],
                },
                {
                  label: "Week 2: 3 rounds",
                  rounds: 3,
                  work: 180,
                  rest: 180,
                  workHr: [80, 85],
                  restHr: [60, 70],
                },
              ],
              [
                {
                  label: "Weeks 3–4: 3 rounds",
                  rounds: 3,
                  work: 240,
                  rest: 180,
                  workHr: [82, 91],
                  restHr: [60, 70],
                },
                {
                  label: "Weeks 5–6: 4 rounds",
                  rounds: 4,
                  work: 240,
                  rest: 180,
                  workHr: [82, 91],
                  restHr: [60, 70],
                },
              ],
              [{ label: "4 rounds", rounds: 4, work: 240, rest: 180, workHr: [85, 95], restHr: [60, 70] }],
            ],
          },
          {
            id: "thu-norwegian-4-4-indoorhiit",
            ex: "indoorhiit",
            label: "Moves: step-ups → high knees → jacks → climbers",
            rx: ["1 min each, repeat", "1 min each, repeat", "1 min each, repeat"],
          },
        ],
      },
      {
        name: "Cool-down",
        mins: 5,
        items: [
          {
            id: "thu-cool-down-zone2",
            ex: "zone2",
            label: "Easy marching",
            rx: ["5 min", "5 min", "5 min"],
          },
        ],
      },
      {
        name: "Stability",
        mins: [11, 13, 14],
        note: "Bryan’s official stability menu.",
        items: [
          {
            id: "thu-stability-slrdl",
            ex: "slrdl",
            rx: ["2 × 6/leg, hand on a wall", "2 × 8/leg", "2 × 10/leg, slow"],
          },
          {
            id: "thu-stability-birddog",
            ex: "birddog",
            rx: ["2 × 6/side, 2 s hold", "2 × 8/side", "2 × 10/side"],
          },
          { id: "thu-stability-deadbug", ex: "deadbug", rx: ["2 × 6/side", "2 × 8/side", "2 × 10/side"] },
          {
            id: "thu-stability-shouldertap",
            ex: "shouldertap",
            rx: ["2 × 8/side, wide feet", "2 × 10/side", "2 × 12/side"],
          },
          { id: "thu-stability-shin", ex: "shin", rx: ["45 s", "45 s", "45 s"] },
        ],
      },
    ],
  },
  {
    key: "fri",
    name: "Friday",
    short: "Fri",
    tag: "Lift C",
    title: "Strength C · Power, lunge, press + tendons",
    focus: "Friday of Bryan’s template (lunge, overhead press, chest press, step-up, side plank), preceded by power work in the order Galpin uses and his 2026 heavy-hinge-then-jumps pairing.",
    blocks: [
      {
        name: "Warm-up",
        mins: [9, 9, 10],
        note: "Bryan’s official warm-up: a few minutes of easy movement, then dynamic moves. Hops and balance come from his bone protocol and his five pillars.",
        items: [
          {
            id: "fri-warm-up-backwalk",
            ex: "backwalk",
            rx: [
              "2 min, bodyweight",
              "2 min holding 2 × {kg:8-10}",
              "2–3 min holding 2 × {kg:12-16} or band-resisted",
            ],
            bryan: "Bryan: backward sled ≈2 min",
          },
          { id: "fri-warm-up-dynamic", ex: "dynamic", rx: ["≈4 min, full series", "≈4 min", "≈4 min"] },
          {
            id: "fri-warm-up-pogo",
            ex: "pogo",
            rx: ["2 × 10, low", "2 × 20", "3 × 20"],
            bryan: "Bone protocol: hops 4–7×/wk",
          },
          {
            id: "fri-warm-up-balance",
            ex: "balance",
            rx: [
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
        ],
      },
      {
        name: "Speed & power",
        mins: [5, 7, 8],
        note: "Max intent, 30–60 s rest. Quality over quantity.",
        items: [
          {
            id: "fri-speed-power-powerskip",
            ex: "powerskip",
            rx: ["—", "2 × 5/leg", "2 × 5/leg"],
            bryan: "Bryan 2025: 2 × 5",
          },
          {
            id: "fri-speed-power-heidens",
            ex: "heidens",
            rx: ["2 × 5/side, step and stick, no hop", "2 × 4/side, stick", "2 × 5/side, stick"],
            bryan: "Bryan 2025: 2 × 5",
          },
          {
            id: "fri-speed-power-woodchop",
            ex: "woodchop",
            rx: ["2 × 8/side, controlled", "2 × 5/side, fast", "3 × 5/side, max speed"],
            bryan: "Bryan 2025: rotational power",
          },
        ],
      },
      {
        name: "Strength",
        mins: [24, 30, 33],
        note: "Pair floor press with chin-ups and the overhead press with step-ups; rest about 60 s after each pair.",
        items: [
          {
            id: "fri-strength-rdl",
            ex: "rdl",
            rx: [
              "2 × 10 @ 2 × {kg:12-16}",
              "3 × 8 @ 2 × {kg:18-22}",
              "3 × 6–8, heaviest pair; 20–30 s after each set, 3 countermovement jumps",
            ],
            bryan: "Bryan 2026: heavy pull → jumps",
          },
          {
            id: "fri-strength-lunge",
            ex: "lunge",
            rx: ["2 × 8/leg, bodyweight", "3 × 10/leg @ 2 × {kg:8-10}", "3 × 10–12/leg @ 2 × {kg:12-16}"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "fri-strength-floorpress",
            ex: "floorpress",
            rx: ["2 × 10 @ 2 × {kg:10-12}", "3 × 10 @ 2 × {kg:14-16}", "3 × 8–10, heaviest pair"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "fri-strength-chinup",
            ex: "chinup",
            label: "Chin-ups (palms facing you)",
            rx: ["2 × 3–5 band-assisted", "3 × 5", "3 × 6–8"],
            bryan: "Bryan does both grips",
          },
          {
            id: "fri-strength-ohpress",
            ex: "ohpress",
            rx: ["2 × 10 @ 2 × {kg:6-8}", "3 × 10 @ 2 × {kg:8-12}", "3 × 8–10 @ 2 × {kg:12-16}"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "fri-strength-stepup",
            ex: "stepup",
            rx: ["2 × 6/leg, {cm:30}", "2 × 8/leg, knee height", "3 × 8/leg holding 2 × {kg:8-12}, fast up"],
            bryan: "Official: 3 × 10/leg",
          },
        ],
      },
      {
        name: "Side plank & tendons",
        mins: [7, 8, 9],
        items: [
          {
            id: "fri-side-plank-tendons-sideplank",
            ex: "sideplank",
            rx: ["2 × 20 s/side, knees down is fine", "2 × 30 s/side", "2 × 45 s/side"],
            bryan: "Official: 20–30 s/side",
          },
          {
            id: "fri-side-plank-tendons-jefferson",
            ex: "jefferson",
            rx: ["2 × 5, no weight, on the floor", "2 × 5 @ {kg:2-4} on a step", "2 × 5 @ {kg:4-10} on a step"],
            bryan: "Bryan 2025: flexibility set",
          },
          {
            id: "fri-side-plank-tendons-calf",
            ex: "calf",
            label: "Single-leg calf raise, slow",
            rx: ["1 × 10/leg", "1 × 12/leg", "1 × 15/leg"],
          },
          { id: "fri-side-plank-tendons-tibraise", ex: "tibraise", rx: ["1 × 15", "1 × 20", "1 × 25"] },
        ],
      },
      {
        name: "Cool-down",
        mins: 3,
        items: [
          { id: "fri-cool-down-hipflexor", ex: "hipflexor", rx: ["30 s/side", "30 s/side", "45 s/side"] },
          { id: "fri-cool-down-butterfly", ex: "butterfly", rx: ["30 s", "45 s", "45 s"] },
        ],
      },
    ],
  },
  {
    key: "sat",
    name: "Saturday",
    short: "Sat",
    tag: "Zone 2",
    title: "Zone 2 + long stretch",
    focus: "Bryan keeps weekends for easy, enjoyable movement (he hikes, bikes, climbs, plays pickleball). Your indoor version: a long Zone 2 block and 20 min of stretching. Second posture-strength day.",
    note: "When you feel like going outside, swap the Zone 2 block for a brisk walk, hike or bike ride of the same length or longer.",
    blocks: [
      {
        name: "Warm-up",
        mins: 5,
        items: [
          {
            id: "sat-warm-up-dynamic",
            ex: "dynamic",
            label: "Marching, leg swings, hip CARs",
            rx: ["5 min", "5 min", "5 min"],
          },
        ],
      },
      {
        name: "Zone 2",
        mins: [25, 33, 40],
        items: [
          {
            id: "sat-zone-2-zone2",
            ex: "zone2",
            rx: ["25 min @ {hr:60-70}", "30–35 min", "40 min; weighted vest optional"],
            bryan: "Bryan: 150 min/week",
          },
        ],
      },
      {
        name: "Long stretch",
        mins: 20,
        note: "Bryan’s official light day: 20–30 min of gentle yoga or stretching.",
        items: [
          { id: "sat-long-stretch-catcow", ex: "catcow", rx: ["10 breaths", "10 breaths", "10 breaths"] },
          { id: "sat-long-stretch-thread", ex: "thread", rx: ["5/side", "5/side", "5/side"] },
          { id: "sat-long-stretch-couch", ex: "couch", rx: ["60 s/side", "60 s/side", "60 s/side"] },
          {
            id: "sat-long-stretch-hipflexor",
            ex: "hipflexor",
            rx: ["45 s/side", "45 s/side", "45 s/side"],
          },
          {
            id: "sat-long-stretch-hamstring",
            ex: "hamstring",
            rx: ["45 s/side", "45 s/side", "45 s/side"],
          },
          { id: "sat-long-stretch-butterfly", ex: "butterfly", rx: ["60 s", "60 s", "60 s"] },
          { id: "sat-long-stretch-shin", ex: "shin", rx: ["45 s", "45 s", "45 s"] },
          { id: "sat-long-stretch-bigtoe", ex: "bigtoe", rx: ["30 s", "45 s", "45 s"] },
          { id: "sat-long-stretch-cobra", ex: "cobra", rx: ["3 × 20 s", "3 × 20 s", "3 × 20 s"] },
        ],
      },
    ],
  },
  {
    key: "sun",
    name: "Sunday",
    short: "Sun",
    tag: "Rest",
    title: "Rest",
    focus: "No training. Keep the posture habits; the daily posture block and an easy walk are optional.",
    blocks: [],
  },
];

export const TARGETS = [
  ["ok", "About 6.1 h of training a week; his protocol recommends about 6."],
  [
    "ok",
    "Strength Mon/Wed/Fri, short intervals Tue, Norwegian 4×4 Thu, easy Saturday, Sunday off: the layout of his newest template.",
  ],
  [
    "ok",
    "About 10 min near max a week (Tuesday’s 20 s bursts plus the end of each 4-min round), his stated target.",
  ],
  ["ok", "Hops in 4 warm-ups and power work twice a week (bone protocol: 4–7 and 2)."],
  [
    "ok",
    "Balance or stability on 5 days, stretching every day, posture every day with his two physical-therapist exercises to fatigue twice a week.",
  ],
  [
    "part",
    "Zone 2: about 100 min inside the plan against his 150. Add about 50 min a week of brisk walking at {hr:60-70} (log it as extra activity; a desk treadmill counts), or count outdoor walks, hikes and rides.",
  ],
  [
    "part",
    "Hard cardio: about 30 min of intervals against his 75. The intervals in his own sample week add up to about the same; jumps, dense strength work and outdoor activity cover part of the rest. Leave the gap while you rebuild.",
  ],
];

export const EQUIPMENT = {
  have: [
    {
      i: "Adjustable dumbbells",
      d: "Ideally up to 20–24 kg each, so the RDL, goblet squat and carries keep progressing.",
    },
    { i: "Doorway pull-up bar", d: "Pull-ups, chin-ups, hanging leg raises." },
  ],
  add: [
    {
      i: "Resistance bands + door anchor",
      d: "Light, medium and heavy. Face pulls, pull-aparts, butterfly, Pallof press, woodchop and pull-up assistance.",
    },
    { i: "Exercise mat", d: "For kneeling work, stretches and quieter landings." },
    {
      i: "Slant board or 2 small plates",
      d: "A foldable slant board (about 40 × 40 cm) or 2.5–5 kg plates under the heels: squats and Poliquin step-ups.",
    },
    {
      i: "A sturdy step and a knee-height box or chair",
      d: "A stair or 15–25 cm platform for step-up cardio, calf raises and Jefferson curls; a 30–45 cm box or solid chair for Friday’s step-ups.",
    },
    {
      i: "Nordic anchor",
      d: "A heavy sofa or bed you can hook your heels under, or a door Nordic strap.",
    },
  ],
  optional: [
    { i: "Jump rope", d: "Only if your ceiling and neighbours allow it." },
    { i: "Weighted vest", d: "For Zone 2 from Phase 3 (Bryan’s bone protocol)." },
  ],
};

export const SWAPS = [
  ["Backward sled drag", "Backward walk indoors, then holding dumbbells or band-resisted"],
  ["Sled push-pull (power)", "Stationary power skips, skater bounds"],
  ["Slant-board goblet squat", "Heels-elevated goblet squat on a slant board or plates"],
  ["Poliquin step-up on a slant", "Same, on a stair with the heel on a plate or book"],
  ["Leg extension / reverse Nordic bench", "Reverse Nordic on a mat"],
  ["Nordic bench", "Heels under a sofa or a door strap"],
  ["Tib bar, IsoTib", "Wall tibialis raises"],
  ["Seated calf machine", "Seated dumbbell calf raise + single-leg calf raise on a step"],
  ["45° back extension with plate", "Floor back extension"],
  ["Obliques on the hyperextension", "Dumbbell side bends"],
  ["Captain’s chair leg raises", "Hanging knee and leg raises on the bar"],
  ["Cable face pulls, Pallof press", "Band versions on a door anchor"],
  ["Bench press", "Dumbbell floor press"],
  ["Heavy deadlift (2026 dunk training)", "Heavy dumbbell Romanian deadlift + jumps"],
  ["Kettlebell swing", "Dumbbell swing"],
  ["Medicine-ball rotational throws", "Fast band woodchop"],
  [
    "Bike, elliptical or running intervals",
    "Step-ups, high knees, jacks, mountain climbers, burpees without push-up",
  ],
  [
    "Weekend hike, bike or pickleball",
    "Indoor Zone 2 + long stretch on Saturday; go outside when you can",
  ],
];

export const TIMELINE = [
  {
    d: "Jul 2023",
    t: "Daily workout protocol",
    s: "About 25 exercises in 45–60 min: backward sled, posture work, Knees-Over-Toes leg work, high-rep accessories (1 × 25), 10-min HIIT three times a week.",
  },
  {
    d: "Oct 2024",
    t: "Posture thread",
    s: "He said an MRI showed his posture was restricting blood flow out of his brain. Five habits plus two physical-therapist exercises, done to fatigue twice a week.",
  },
  {
    d: "Dec 2024",
    t: "Official exercise protocol + 4×4",
    s: "A 7-day longevity plan (strength days, interval days, a mobility day, Norwegian 4×4, a light day). On X: 4 min all-out, 4 min rest, four times.",
  },
  {
    d: "2025",
    t: "Session rebuilt with Dr. Andy Galpin",
    s: "Warm-up → speed & power (2 × 5) → strength (2 × 5–8) → posture → conditioning → flexibility (5 × 30 s). Feb 2025: VO2 max personal best 64.29.",
  },
  {
    d: "Jan 2026",
    t: "Updated protocol",
    s: "6 h a week: 3 strength + 3 cardio sessions, 150 min Zone 2, 75 min vigorous, plus flexibility, balance and mobility. At minimum, 20 min a day.",
  },
  {
    d: "Mar–Apr 2026",
    t: "Posture guide, morning routine, bone density, squat breaks",
    s: "Posture guide updated. His day: 90 min of cardio, strength, balance and stretching, HIIT twice a week, active weekends. Bone protocol: jumping in warm-ups 4–7×/week, power training 2×/week. 9 Apr: 10 squats every 45 min of sitting.",
  },
  {
    d: "May 2026",
    t: "“Everyone Is Wrong About Exercise”",
    s: "His five pillars: strength, Zone 2, high-intensity cardio, mobility & flexibility, balance.",
  },
  {
    d: "Jul–Sep 2026",
    t: "Training to dunk at 49",
    s: "Front squat 245 lb (1 Sep) and deadlift 385 lb (4 Sep) PRs, with jumps between sets, coached in the Knees-Over-Toes style. His own weak points: little fast-twitch muscle, slow force development, stiff tendons, limited ankle dorsiflexion, Achilles risk.",
  },
  {
    d: "Sep 2026",
    t: "4 protocols after 40",
    s: "Strength, cardio, balance and flexibility; move 5–10 min after meals; stand up every 30 min at the desk.",
  },
  {
    d: "4 Oct 2026",
    t: "Newest weekly template (exercise newsletter)",
    s: "Strength Mon/Wed/Fri with progressive overload, short intervals Tue, Norwegian 4×4 Thu (start with 2–3 rounds, hard but controlled), easy outdoor or social activity Sat, recovery Sun. At least 150 min Zone 2 and 75 min hard cardio, about 10 of them near max.",
  },
];

export const TAKEAWAYS = [
  "The week follows Bryan’s newest template: strength Mon/Wed/Fri, short intervals Tue, Norwegian 4×4 Thu, easy Zone 2 Sat, rest Sun. Everything is indoors.",
  "Strength days take the template’s basics (squat, push-up, row, swing, lunge, presses, step-up, carry, planks) and add his signature Knees-Over-Toes and high-rep posture work.",
  "From his 2026 training: hops in every warm-up, a few jumps, a heavy hinge followed by jumps, and ankle and Achilles work, because he named those as his own weak points.",
  "His official stability menu and balance work run through the week, and flexibility closes every session.",
  "Posture uses his 5 habits, his 10-squat tip and his posture exercises, plus chin tucks and a doorway stretch as classic extras.",
];

export const CHANGES = [
  "Week reorganised to Bryan’s newest template (4 Oct 2026 newsletter), with every session indoors.",
  "Strength days now include the template’s basics (lunge, overhead press, floor press, step-up, swing, carries) next to his signature moves.",
  "Added his official stability menu (single-leg RDL/toe touch, bird dog, dead bug, plank shoulder taps) and the Pallof press from his Galpin session.",
  "Exercise links now jump to the minute where Bryan does the move in his own videos (where one exists), plus his May 2026 exercise video.",
  "Posture block: added shoulder external rotation from his routine, his April 2026 squat-break tip, and chin tucks and a doorway stretch (marked as not Bryan’s).",
  "4×4 advice from the newsletter: hard but controlled, starting with 2–3 rounds.",
];

export const SOURCES = [
  {
    g: "Bryan Johnson: official pages",
    items: [
      {
        t: "My Exercise Protocol, exercise newsletter (4 Oct 2026), archived copy. Cited by two of the other reports; I couldn’t open it from here",
        u: "https://milled.com/blueprint.bryanjohnson.com/my-exercise-protocol-iDTE0JjdPa191ocK",
      },
      {
        t: "Bryan Johnson’s Protocol (updated 23 Jan 2026)",
        u: "https://blueprint.bryanjohnson.com/blogs/news/bryan-johnsons-protocol",
      },
      { t: "Don’t Die protocol site", u: "https://protocol.bryanjohnson.com/" },
      {
        t: "Exercise and Fitness Protocol for Longevity (10 Dec 2024)",
        u: "https://blueprint.bryanjohnson.com/blogs/news/exercise-and-fitness-protocol-for-longevity",
      },
      {
        t: "My Morning Routine (2026), 22 Apr 2026",
        u: "https://blueprint.bryanjohnson.com/blogs/news/morning-routine",
      },
      {
        t: "Bone Density for Longevity (13 Apr 2026)",
        u: "https://blueprint.bryanjohnson.com/blogs/news/bone-health-protocol",
      },
      {
        t: "How to Fix Your Posture: 5 Habits (updated Mar 2026)",
        u: "https://blueprint.bryanjohnson.com/blogs/news/youre-likely-reading-this-with-poor-posture",
      },
      {
        t: "Is Sitting Really That Bad for You?",
        u: "https://blueprint.bryanjohnson.com/blogs/news/is-sitting-really-that-bad-for-you",
      },
      {
        t: "Test Your Biological Age for $0 (balance test)",
        u: "https://blueprint.bryanjohnson.com/blogs/news/test-your-biological-age-for-0",
      },
      {
        t: "Blueprint fitness articles, incl. “4 Protocols to Follow After 40” (23 Sep 2026)",
        u: "https://blueprint.bryanjohnson.com/blogs/news/tagged/fitness",
      },
    ],
  },
  {
    g: "Bryan Johnson: videos",
    items: [
      {
        t: "Everyone Is Wrong About Exercise (26 May 2026)",
        u: "https://www.youtube.com/watch?v=JNuORofHhrk",
      },
      {
        t: "Exercise Scientist Dismantles My Longevity Workout, with Dr. Andy Galpin (2025)",
        u: "https://www.youtube.com/watch?v=QhL4VBHRBJY",
      },
      {
        t: "My Complete Anti-Aging Workout (Jul 2023)",
        u: "https://www.youtube.com/watch?v=sYyVi-H-ozI",
      },
      {
        t: "How I Fixed My Terrible Posture – 5 Habits (Jun 2023)",
        u: "https://www.youtube.com/watch?v=in9ubCilsT8",
      },
      {
        t: "A 20-Minute Call with My Posture Coach",
        u: "https://www.youtube.com/watch?v=cYGlj8Ryij8",
      },
      {
        t: "My posture nearly killed me. Here’s why…",
        u: "https://www.youtube.com/watch?v=k5nexY_nHI8",
      },
    ],
  },
  {
    g: "Bryan Johnson: posts on X",
    items: [
      {
        t: "My daily workout protocol (25 Jul 2023)",
        u: "https://x.com/bryan_johnson/status/1683855033425866755",
      },
      {
        t: "Posture thread: five habits (10 Oct 2024)",
        u: "https://x.com/bryan_johnson/status/1844454193572216969",
      },
      {
        t: "Posture thread: the two PT exercises (10 Oct 2024)",
        u: "https://x.com/bryan_johnson/status/1844454212333076616",
      },
      { t: "4×4 HIIT (23 Dec 2024)", u: "https://x.com/bryan_johnson/status/1871278967984185599" },
      {
        t: "VO2 max 64.29 (19 Feb 2025)",
        u: "https://x.com/bryan_johnson/status/1892287231521673528",
      },
      {
        t: "Rotating sitting and standing (30 Jun 2025)",
        u: "https://x.com/bryan_johnson/status/1939806415649935751",
      },
      {
        t: "Grip strength predicts longevity (9 Sep 2025)",
        u: "https://x.com/bryan_johnson/status/1965204330145087854",
      },
      {
        t: "10 squats every 45 minutes of sitting (9 Apr 2026)",
        u: "https://x.com/bryan_johnson/status/2042049389880045815",
      },
      {
        t: "Training to dunk: the targets (25 Jul 2026)",
        u: "https://x.com/bryan_johnson/status/2081071661466689637",
      },
      {
        t: "Training to dunk: what’s good, what’s bad (31 Jul 2026)",
        u: "https://x.com/bryan_johnson/status/2083240664209474046",
      },
      {
        t: "365 lb for 2 reps (28 Aug 2026)",
        u: "https://x.com/bryan_johnson/status/2093391998229402099",
      },
      {
        t: "Front squat PR (1 Sep 2026)",
        u: "https://x.com/bryan_johnson/status/2094836868747759751",
      },
      {
        t: "A jump in between sets (4 Sep 2026)",
        u: "https://x.com/bryan_johnson/status/2096020664268583215",
      },
      {
        t: "Jefferson, Ben Patrick and the dunk (11 Sep 2026)",
        u: "https://x.com/bryan_johnson/status/2098458369208332556",
      },
    ],
  },
  {
    g: "People who studied his training",
    items: [
      {
        t: "Dr. Andy Galpin on the 2025 session (Biomolecular Athlete)",
        u: "https://www.biomolecularathlete.com/content/bryan-johnson-exercise-scientist-dismantles-my-longevity-workout",
      },
      {
        t: "Nucleus: breakdown of his session (warm-up, power, strength, posture, conditioning, flexibility)",
        u: "https://mynucleus.com/blog/bryan-johnson-workout-routine",
      },
      {
        t: "Generation Iron: the 2023 routine with sets and reps",
        u: "https://generationiron.com/bryan-johnson-workout/",
      },
      {
        t: "NAD: Bryan Johnson’s guide to fixing terrible posture",
        u: "https://www.nad.com/news/bryan-johnsons-free-guide-to-fixing-terrible-posture",
      },
      {
        t: "BodyBuildingBros: Bryan’s five pillars of exercise",
        u: "https://www.bodybuildingbros.com/news/bryan-johnson-reveals-the-five-pillars-of-exercise-for-longevity/",
      },
      {
        t: "Will Wayland: How I’d train Bryan Johnson to vertical jump (Sep 2026)",
        u: "https://x.com/WSWayland/article/2100144371341443159",
      },
    ],
  },
];
