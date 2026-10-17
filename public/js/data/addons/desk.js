// Optional add-on: gentle reminders for long sitting days, from Bryan's posture
// habits. It is deliberately separate from the posture block so it can be turned
// on and off on its own. The countdown and the daily count live on Today.

export default {
  id: "desk",
  name: "Desk breaks",
  short: "Desk",
  icon: "clock",
  description: "Two gentle reminders from Bryan's posture habits: stand and move for 2–3 minutes every 30 minutes, and 10 squats every 45 minutes. Separate from the workout; log each break on Today.",
  schedule: { mon: "daily", tue: "daily", wed: "daily", thu: "daily", fri: "daily", sat: "daily", sun: "optional" },
  variants: {
    daily: {
      name: "Desk breaks",
      mins: 0,
      note: "Off by default. Turn it on here and use the two countdowns on Today.",
      items: [],
    },
  },
};
