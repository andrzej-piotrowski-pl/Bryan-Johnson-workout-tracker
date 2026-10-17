// Animations for the upper-body exercises.
import { ANKLE_Y, anchor, ground, joints, stand } from "../poses.js";

// Linear blend of two points.
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

// One-sided clips (alternate: true) whose setup isn't symmetric put their second key at SWITCH,
// so the mirrored half starts with a clean one-frame cut instead of a morph across sides.
const SWITCH = 0.001;

// Turns a pose `deg` about the vertical axis through the origin, then shifts it
// (root, world IK targets and poles move with it).
function turn(p, deg, shift = [0, 0, 0]) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const dir = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  const pos = (v) => dir(v).map((x, i) => x + shift[i]);
  const rot = p.rot || [0, 0, 0];
  const out = { ...p, root: pos(p.root), rot: [rot[0], rot[1] + deg, rot[2]] };
  for (const k of ["footL", "footR"]) if (p[k]) out[k] = pos(p[k]);
  for (const k of ["kneeL", "kneeR"]) if (p[k]) out[k] = dir(p[k]);
  if (!p.handsIn || p.handsIn === "world") {
    for (const k of ["handL", "handR"]) if (p[k]) out[k] = pos(p[k]);
    for (const k of ["elbowL", "elbowR"]) if (p[k]) out[k] = dir(p[k]);
  }
  return out;
}

// ---------- push-up ----------
// Body straight from heels to head, pivoting on the toes; hands stay planted.
function pushBody(theta) {
  const p = { rot: [90 - theta, 0, 0], legL: [0, 4, 0, -22], legR: [0, 4, 0, -22], neck: [-6, 0] };
  return anchor(p, "toeL", [0, 0.0, -0.92], "yz");
}
const PUSH_TOP = pushBody(21);
const PUSH_HANDS = (() => {
  const J = joints(PUSH_TOP);
  return { L: [0.2, 0.035, J.shoulderL.z + 0.02], R: [-0.2, 0.035, J.shoulderR.z + 0.02] };
})();
function pushup(theta) {
  return { ...pushBody(theta), handsIn: "world", handL: PUSH_HANDS.L, handR: PUSH_HANDS.R, elbowL: [0.7, 0.35, -0.6], elbowR: [-0.7, 0.35, -0.6] };
}

// ---------- pull-up / chin-up ----------
const BAR_Y = 2.14;
const BAR_Z = 0.08;
function hang(lift, { grip = 0.27, lean = 0, elbows = [0.55, -1, 0.1] } = {}) {
  const p = { rot: [-lean, 0, 0], legL: [12, 4, 70, 25], legR: [12, 4, 70, 25], neck: [-lift * 16, 0] };
  const top = BAR_Y - 0.56 + lift;
  const placed = anchor(p, "neckBase", [0, top, BAR_Z - 0.02], "yz");
  return {
    ...placed,
    handsIn: "world",
    handL: [grip, BAR_Y - 0.035, BAR_Z],
    handR: [-grip, BAR_Y - 0.035, BAR_Z],
    elbowL: elbows,
    elbowR: [-elbows[0], elbows[1], elbows[2]],
  };
}

// ---------- one-arm dumbbell row ----------
// Left knee and left hand on the bench, right foot on the floor, dumbbell in the right hand.
// Only the rowing arm (and its shoulder blade) moves; the torso stays flat and square.
// Built facing +Z with the bench along Z, then turned to face +X: mirrored for the other arm the
// figure faces −X, so the bench stays put and the rowing arm always faces the camera.
// The bench ends just behind the kneeling shin, so that foot hangs off its end.
const ROW_H = 0.42;
const ROW_BENCH = { type: "bench", pos: [0, 0, -0.13], rotY: 90, w: 0.42, d: 1.05, h: ROW_H };
const ROW_BODY = anchor({ rot: [80, 0, 0], legL: [80, 2, 88, 40], neck: [-10, 0] }, "kneeL", [0.11, ROW_H + 0.05, 0], "yz");
const ROW_J = joints(ROW_BODY);
function row(pull) {
  const sh = ROW_J.shoulderR;
  const stretch = [sh.x - 0.015, sh.y - 0.575, sh.z + 0.03]; // arm long, shoulder blade dropped
  const atHip = [-0.215, sh.y - 0.13, sh.z - 0.255]; // dumbbell beside the lower ribs
  const p = {
    ...ROW_BODY,
    footR: [-0.27, ANKLE_Y, 0.04],
    kneeR: [-0.35, 0, 1],
    shrugR: [0, 0.03 - 0.05 * pull],
    handsIn: "world",
    handL: [ROW_J.shoulderL.x + 0.015, ROW_H + 0.05, ROW_J.shoulderL.z + 0.07],
    handR: mix(stretch, atHip, pull),
    elbowL: [0.4, 0.3, -1],
    elbowR: [-0.25, 1, -0.6],
  };
  return turn(p, 90, [-0.125, 0, 0]);
}

// ---------- standing dumbbell overhead press ----------
// Hands in the chest frame: rack at the shoulders (palms in, elbows a bit forward) → straight arms.
function ohpress(up) {
  const rack = [0.255, -0.02, 0.135];
  const top = [0.215, 0.52, -0.005];
  const h = mix(rack, top, up);
  return {
    ...stand({ root: [0, 0.935, 0] }),
    shrugL: [0.02 * up, 0],
    shrugR: [0.02 * up, 0],
    handsIn: "chest",
    handL: h,
    handR: [-h[0], h[1], h[2]],
    elbowL: [0.4, -1, 0.5],
    elbowR: [-0.4, -1, 0.5],
  };
}

// ---------- dumbbell floor press ----------
// Lying on the back, knees bent, feet flat. Upper arms 45° from the body; forearms vertical.
const FP_BODY = ground({ rot: [-90, 0, 0], neck: [-4, 0] }, ["pelvis", "thoracic", "head"]);
const FP_J = joints(FP_BODY);
function floorpress(up) {
  const sh = FP_J.shoulderL;
  const elbowDown = [sh.x + 0.2, 0.045, sh.z + 0.2]; // upper arm resting on the floor
  const bottom = [elbowDown[0], elbowDown[1] + 0.26, elbowDown[2]];
  const top = [sh.x + 0.015, sh.y + 0.545, sh.z + 0.03];
  const h = mix(bottom, top, up);
  return {
    ...FP_BODY,
    footL: [0.13, ANKLE_Y, 0.5],
    footR: [-0.13, ANKLE_Y, 0.5],
    kneeL: [0.15, 1, 0],
    kneeR: [-0.15, 1, 0],
    handsIn: "world",
    handL: h,
    handR: [-h[0], h[1], h[2]],
    elbowL: [0.7, -0.2, 0.7],
    elbowR: [-0.7, -0.2, 0.7],
  };
}

// ---------- overhead dumbbell triceps extension ----------
// Upper arms fixed beside the head (elbows forward); only the elbows bend. The small inward
// rotation keeps both hands on the one dumbbell all the way down behind the head.
const TRI = {
  top: [168, -11, 12, -17],
  high: [168, -11, 50, -14],
  low: [168, -11, 88, -18],
  bottom: [168, -11, 124, -31],
};
function triceps(arm) {
  return { ...stand({ root: [0, 0.938, 0] }), neck: [5, 0], shrugL: [0.015, 0], shrugR: [0.015, 0], armL: arm, armR: arm };
}

// ---------- dumbbell biceps curl ----------
// Upper arms hang still at the sides; the forearms angle slightly out so the dumbbells clear the thighs.
function curl(up) {
  const arm = [4 + 3 * up, 10, 18 + 122 * up, 22 - 10 * up];
  return { ...stand({ root: [0, 0.938, 0] }), shrugL: [-0.005, -0.01], shrugR: [-0.005, -0.01], armL: arm, armR: arm };
}

// ---------- band chest fly ----------
// Bands anchored at chest height on the door frame behind. The arms sweep horizontally
// (flexion 87°, abduction 95° → 2°) with a fixed, soft elbow bend.
const FLY_DOOR = { type: "door", pos: [0, 0, -0.6], w: 0.86 };
const FLY_ANCHORS = [[0.46, 1.28, -0.55], [-0.46, 1.28, -0.55]];
function fly(close) {
  const arm = [87, 95 - 93 * close, 22 + 10 * close, -90];
  return {
    ...stand({ root: [0, 0.932, 0.03] }),
    rot: [4, 0, 0],
    spine: [2, 0, 0],
    shrugL: [0, 0.025 * close],
    shrugR: [0, 0.025 * close],
    armL: arm,
    armR: arm,
  };
}

// ---------- farmer's carry ----------
// Walking in place while the floor grid scrolls: each stance foot slides back at walking
// speed (so it stays put on the moving floor) while the other foot swings through.
// One stride (two steps) per loop, sampled into evenly spaced linear keys.
const WALK = { T: 1.4, half: 0.27, lift: 0.08, keys: 10 };
const HEEL = 0.06, BALL = 0.1368; // ankle → heel / ball of the foot, along the sole
// Ankle target and foot pitch for one foot; its heel strikes at phase 0.
function walkFoot(ph) {
  const { half, lift } = WALK;
  const stance = 0.6;
  // Ankle [y, z] with the heel / ball of the foot on the floor; c = flat-foot ankle z, a = pitch.
  const onHeel = (c, a) => [-HEEL * Math.sin(a) + ANKLE_Y * Math.cos(a), c - HEEL + HEEL * Math.cos(a) + ANKLE_Y * Math.sin(a)];
  const onBall = (c, a) => [BALL * Math.sin(a) + ANKLE_Y * Math.cos(a), c + BALL - BALL * Math.cos(a) + ANKLE_Y * Math.sin(a)];
  const D2R = Math.PI / 180;
  if (ph < stance) {
    const c = half - (ph / stance) * 2 * half; // ankle z with the foot flat
    if (ph < 0.1) {
      // heel strike: the foot rolls down onto the heel
      const a = -16 * (1 - ph / 0.1);
      const [y, z] = onHeel(c, a * D2R);
      return { y, z, toe: a };
    }
    if (ph < 0.42) return { y: ANKLE_Y, z: c, toe: 0 }; // foot flat
    // push-off: the heel rises and the foot rolls over the ball
    const a = 34 * ((ph - 0.42) / (stance - 0.42)) ** 1.3;
    const [y, z] = onBall(c, a * D2R);
    return { y, z, toe: a };
  }
  // swing: from toe-off behind to the next heel strike in front, lifted in between
  const s = (ph - stance) / (1 - stance);
  const [y0, z0] = onBall(-half, 34 * D2R);
  const [y1, z1] = onHeel(half, -16 * D2R);
  const sm = 0.5 - 0.5 * Math.cos(Math.PI * s);
  return { y: y0 + (y1 - y0) * s + lift * Math.sin(Math.PI * s), z: z0 + (z1 - z0) * sm, toe: 34 - 50 * sm };
}
function farmer(ph) {
  const L = walkFoot(ph), R = walkFoot((ph + 0.5) % 1);
  const c = Math.cos(2 * Math.PI * ph);
  const bob = 0.5 + 0.5 * Math.cos(4 * Math.PI * (ph - 0.05)); // 1 at double support
  const swing = -3 * c; // arms barely swing with heavy dumbbells
  return {
    root: [0.018 * Math.sin(2 * Math.PI * (ph - 0.05)), 0.94 - 0.024 * bob, 0],
    rot: [2, -4 * c, 0],
    spine: [0, 0, 3 * c],
    footL: [0.11, L.y, L.z],
    footR: [-0.11, R.y, R.z],
    toeL: L.toe,
    toeR: R.toe,
    shrugL: [-0.012, -0.01],
    shrugR: [-0.012, -0.01],
    armL: [swing, 9, 6, 0],
    armR: [-swing, 9, 6, 0],
  };
}
// Evenly spaced linear keys over one stride (the last equals the first, so the loop is seamless).
function walkKeys(cues) {
  const { T, keys } = WALK;
  return Array.from({ length: keys + 1 }, (_, i) => ({ t: +((T * i) / keys).toFixed(3), p: farmer((i % keys) / keys), e: "lin", ...(cues[i] ? { cue: cues[i] } : {}) }));
}

export default {
  pushup: {
    clips: [
      {
        title: "Push-up",
        highlight: ["chest", "triceps", "shoulders", "core"],
        camera: { view: [1, 0.42, 0.28], target: [0, 0.28, -0.12], dist: 3.9 },
        keys: [
          { t: 0, p: pushup(21), cue: "Plank: body in one straight line" },
          { t: 0.5, p: pushup(21), cue: "Lower until your chest is a fist above the floor" },
          { t: 2.2, p: pushup(5) },
          { t: 2.5, p: pushup(5), cue: "Press up until your arms are straight" },
          { t: 3.5, p: pushup(21) },
        ],
      },
    ],
  },

  chinup: {
    clips: [
      {
        title: "Pull-up (palms away)",
        props: [{ type: "doorframe", pos: [0, 0, 0], w: 0.9, h: 2.05, bar: true, barH: BAR_Y, barZ: BAR_Z }],
        highlight: ["back", "biceps", "grip"],
        camera: { view: [0.75, 0.15, 1], target: [0, 1.45, 0], dist: 4.2 },
        keys: [
          { t: 0, p: hang(0), cue: "Full hang, shoulders active" },
          { t: 0.5, p: hang(0), cue: "Chest to the bar, elbows down to the ribs" },
          { t: 2, p: hang(0.4, { lean: 8 }) },
          { t: 2.4, p: hang(0.4, { lean: 8 }), cue: "Lower in 2–3 s to a full hang" },
          { t: 4.6, p: hang(0) },
        ],
      },
      {
        title: "Chin-up (palms facing you)",
        props: [{ type: "doorframe", pos: [0, 0, 0], w: 0.9, h: 2.05, bar: true, barH: BAR_Y, barZ: BAR_Z }],
        highlight: ["back", "biceps", "grip"],
        camera: { view: [0.75, 0.15, 1], target: [0, 1.45, 0], dist: 4.2 },
        keys: [
          { t: 0, p: hang(0, { grip: 0.17, elbows: [0.25, -1, 0.45] }), cue: "Shoulder-width grip, palms toward you" },
          { t: 0.5, p: hang(0, { grip: 0.17, elbows: [0.25, -1, 0.45] }), cue: "Pull until your chin clears the bar" },
          { t: 2, p: hang(0.4, { grip: 0.17, lean: 6, elbows: [0.25, -1, 0.45] }) },
          { t: 2.4, p: hang(0.4, { grip: 0.17, lean: 6, elbows: [0.25, -1, 0.45] }), cue: "Slow lowering, 2–3 s" },
          { t: 4.6, p: hang(0, { grip: 0.17, elbows: [0.25, -1, 0.45] }) },
        ],
      },
    ],
  },

  row: {
    clips: [
      {
        title: "One-arm dumbbell row",
        props: [ROW_BENCH],
        hold: { R: true, axis: "wx" },
        highlight: ["back", "upperBack", "biceps", "grip"],
        camera: { view: [0, 0.32, 1], target: [0, 0.6, 0], dist: 3.5 },
        alternate: true,
        keys: [
          { t: 0, p: row(0), cue: "Hand and knee on the bench, back flat" },
          { t: SWITCH, p: row(0) },
          { t: 0.6, p: row(0), cue: "Pull the dumbbell toward your hip" },
          { t: 1.6, p: row(1), cue: "Squeeze 1 s, elbow close to your side" },
          { t: 2.6, p: row(1), cue: "Lower to a full stretch, no twisting" },
          { t: 4.6, p: row(0), cue: "Switch sides" },
        ],
      },
    ],
  },

  ohpress: {
    clips: [
      {
        title: "Standing dumbbell overhead press",
        hold: { L: true, R: true, axis: "z" },
        highlight: ["shoulders", "triceps", "core"],
        camera: { view: "three", target: [0, 1.08, 0], dist: 4.4 },
        keys: [
          { t: 0, p: ohpress(0), cue: "Dumbbells at your shoulders, palms facing in" },
          { t: 0.5, p: ohpress(0), cue: "Brace your abs and glutes, then press straight up" },
          { t: 1.6, p: ohpress(1), cue: "Arms straight overhead" },
          { t: 2.0, p: ohpress(1), cue: "Lower in 2 s, don't lean back" },
          { t: 4.0, p: ohpress(0) },
        ],
      },
    ],
  },

  floorpress: {
    clips: [
      {
        title: "Dumbbell floor press",
        hold: { L: true, R: true, axis: "x" },
        highlight: ["chest", "triceps", "shoulders"],
        camera: { view: [0.55, 0.75, -0.7], target: [0, 0.25, -0.15], dist: 3.3 },
        keys: [
          { t: 0, p: floorpress(0), cue: "Upper arms on the floor at 45°: pause 1 s" },
          { t: 1.0, p: floorpress(0), cue: "Press up until the arms are straight" },
          { t: 2.1, p: floorpress(1) },
          { t: 2.4, p: floorpress(1), cue: "Lower until the upper arms touch the floor" },
          { t: 4.4, p: floorpress(0) },
        ],
      },
    ],
  },

  triceps: {
    clips: [
      {
        title: "Overhead dumbbell triceps extension",
        hold: { goblet: true },
        highlight: ["triceps"],
        camera: { view: [1, 0.12, -0.45], target: [0, 1.12, 0], dist: 4.5 },
        keys: [
          { t: 0, p: triceps(TRI.top), cue: "Arms straight, elbows forward: hold 1 s" },
          { t: 1.0, p: triceps(TRI.top), cue: "Lower it behind your head, upper arms still" },
          { t: 1.76, p: triceps(TRI.high), e: "in" },
          { t: 2.24, p: triceps(TRI.low), e: "lin" },
          { t: 3.0, p: triceps(TRI.bottom), e: "out", cue: "Straighten your arms and keep your ribs down" },
          { t: 3.45, p: triceps(TRI.low), e: "in" },
          { t: 3.74, p: triceps(TRI.high), e: "lin" },
          { t: 4.2, p: triceps(TRI.top), e: "out" },
        ],
      },
    ],
  },

  curl: {
    clips: [
      {
        title: "Dumbbell biceps curl",
        hold: { L: true, R: true, axis: "x" },
        highlight: ["biceps", "grip"],
        camera: { view: [1, 0.2, 0.6], target: [0, 1.0, 0], dist: 4.0 },
        keys: [
          { t: 0, p: curl(0), cue: "Stand tall, elbows pinned at your sides" },
          { t: 0.4, p: curl(0), cue: "Curl up, palms turning up" },
          { t: 1.4, p: curl(1), cue: "Squeeze at the top" },
          { t: 1.9, p: curl(1), cue: "Lower in 2–3 s, no swinging" },
          { t: 4.4, p: curl(0) },
        ],
      },
    ],
  },

  fly: {
    clips: [
      {
        title: "Band chest fly",
        props: [FLY_DOOR],
        bands: [{ a: FLY_ANCHORS[0], b: "handL" }, { a: FLY_ANCHORS[1], b: "handR" }],
        highlight: ["chest", "shoulders"],
        camera: { view: [0.4, 0.72, 1], target: [0, 1.0, -0.1], dist: 4.2 },
        keys: [
          { t: 0, p: fly(0), cue: "Band behind you at chest height, arms wide" },
          { t: 0.4, p: fly(0), cue: "Bring your hands together in front of your chest, as if hugging a tree" },
          { t: 1.6, p: fly(1), cue: "Squeeze 1 s" },
          { t: 2.6, p: fly(1), cue: "Return slowly, elbows slightly bent" },
          { t: 4.6, p: fly(0) },
        ],
      },
    ],
  },

  farmer: {
    clips: [
      {
        title: "Farmer's carry",
        hold: { L: true, R: true, axis: "z" },
        highlight: ["grip", "upperBack", "core"],
        camera: { view: [1, 0.2, 0.45], target: [0, 0.92, 0], dist: 4.0 },
        floorScroll: -1.0,
        effects: ["string"],
        keys: walkKeys({ 0: "Heavy dumbbells at your sides, stand tall", 5: "Slow, steady steps; shoulders down and back" }),
      },
    ],
  },
};
