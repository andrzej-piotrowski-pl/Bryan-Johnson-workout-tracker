// Expand old combined prescriptions without changing their total dose.
const FULL_WARMUP = ["armcircles", "legswingfront", "legswingside", "highknees", "laterallunge", "hipcars", "lungetwist"];
const WARMUP_RX = ["10 forward, 10 backward", "10/leg", "10/leg", "20 s, light and quiet", "5/side", "3 circles/leg each way", "5/side"];

export function splitItems(items) {
  return items.flatMap((item) => {
    if (item.ex === "indoorhiit") return [];
    if (item.ex === "tibraise") return [
      { ...item, id: `${item.id}-tibdouble`, ex: "tibdouble", legacyId: item.id, legacyEx: item.ex, rx: item.rx.map((rx) => rx.split(" + ")[0]) },
      { id: `${item.id}-tibsingle`, ex: "tibsingle", legacyId: item.id, legacyEx: item.ex, rx: item.rx.map((rx) => rx.includes(" + ") ? rx.split(" + ")[1] : "—") },
    ];
    if (item.ex === "dynamic") {
      let ids = FULL_WARMUP, doses = WARMUP_RX;
      if (item.label?.startsWith("Arm circles")) { ids = ["armcircles", "hipcars"]; doses = ["1 min, forward then backward", "1 min, both legs and directions"]; }
      else if (item.label?.startsWith("Leg swings")) { ids = ["legswingfront", "legswingside", "hipcars"]; doses = ["30 s total, both legs", "30 s total, both legs", "1 min, both legs and directions"]; }
      else if (item.label?.startsWith("Marching")) { ids = ["marching", "legswingfront", "legswingside", "hipcars"]; doses = ["1 min, easy", "1 min total, both legs", "1 min total, both legs", "2 min, both legs and directions"]; }
      return ids.map((ex, i) => ({ id: `${item.id}-${ex}`, ex, legacyId: item.id, legacyEx: item.ex, group: "Dynamic warm-up · once through", rx: item.rx.map((rx) => rx === "—" ? rx : doses[i]) }));
    }
    const choices = item.rx.map((rx, level) => {
      switch (item.ex) {
        case "backwalk": return level === 0 || /bodyweight/.test(rx) || rx === "2 min" ? "backwalkplain" : "backwalkloaded";
        case "heeldrop": return "heeldrops";
        case "jumps": return item.id === "bone-jumps" || level < 2 ? "snapdown" : level === 2 ? "squatjump" : "cmjump";
        case "calf": return item.label?.startsWith("Seated") ? "calfseated" : "calfsingle";
        case "stepup": return level === 3 ? "stepuploaded" : "stepuplain";
        case "chinup": return /dead hang/.test(rx) ? "hangpassive" : item.label?.startsWith("Pull-ups") ? "pullup" : "chinuppalms";
        case "legraise": return level === 3 ? "straightlegraise" : "kneeraise";
        case "slrdl": return level < 2 ? "toetouch" : "singlelegrdl";
        case "extrot": return "rotationknee";
        case "neck": return /slow|fatigue/.test(rx) ? "neckslow" : "neckhold";
        default: return item.ex;
      }
    });
    if (item.ex === "deadhang") {
      return ["hangpassive", "hangactive"].map((ex, i) => ({ ...item, ex, id: `${item.id}-${ex}`, legacyId: item.id, legacyEx: item.ex, label: undefined, group: "Hangs · alternate passive and active sets", pair: "hangs", rx: item.rx.map((rx) => rx.replace(/^(\d+) ×/, (_, n) => `${i === 0 ? Math.ceil(Number(n) / 2) : Math.floor(Number(n) / 2)} ×`)) }));
    }
    if (choices.every((ex) => ex === item.ex)) return [item];
    return [...new Set(choices)].map((ex) => ({ ...item, ex, id: `${item.id}-${ex}`, legacyId: item.id, legacyEx: item.ex, label: undefined,
      alternative: item.ex === "chinup" && ex === "hangpassive" && item.rx[0].includes(", or ") ? { ex: "pullup", rx: [item.rx[0].split(", or ")[1], "—", "—", "—"] } : undefined,
      rx: item.rx.map((rx, level) => choices[level] === ex ? (ex === "hangpassive" ? rx.split(", or ")[0] : rx) : "—") }));
  });
}
