// Animations for the core & stability exercises.
import { anchor, ground, joints, LEG, translate } from "../poses.js";

const MAT_Y = 0.012; // top of the exercise mat

// World point at a local offset from `origin`, in the rotation frame R of joints() (Rp, Rc…).
function at(R, origin, [x, y, z]) {
  const e = R.elements; // column-major: the frame's X, Y, Z axes in world space
  return [origin.x + e[0] * x + e[4] * y + e[8] * z, origin.y + e[1] * x + e[5] * y + e[9] * z, origin.z + e[2] * x + e[6] * y + e[10] * z];
}

// ---------- forearm plank ----------
function plankBody(theta, breath = 0) {
  const p = { rot: [90 - theta, 0, 0], spine: [-1 + breath, 0, 0], legL: [0, 4, 0, -22], legR: [0, 4, 0, -22], neck: [-4, 0] };
  return anchor(p, "toeL", [0, 0, -0.95], "yz");
}
function plank(theta, breath = 0) {
  const body = plankBody(theta, breath);
  const J = joints(plankBody(9));
  const zEl = J.shoulderL.z + 0.02;
  return { ...body, handsIn: "world", handL: [0.1, 0.035, zEl + 0.25], handR: [-0.1, 0.035, zEl + 0.25], elbowL: [0.25, -1, -0.2], elbowR: [-0.25, -1, -0.2] };
}

// ---------- quadruped (bird dog base) ----------
function quad(o = {}) {
  const p = { rot: [78, 0, 0], legL: [78, 4, 90, 80], legR: [78, 4, 90, 80], armL: [78, 4, 0, 0], armR: [78, 4, 0, 0], neck: [-8, 0], ...o };
  return ground(p, ["kneeL", "kneeR", "handL", "handR"]);
}

// ---------- supine (dead bug base) ----------
function supine(o = {}) {
  const p = { rot: [-90, 0, 0], legL: [90, 4, 90, 10], legR: [90, 4, 90, 10], armL: [90, 6, 0, 0], armR: [90, 6, 0, 0], neck: [6, 0], ...o };
  return ground(p, ["pelvis", "thoracic", "head"]);
}

// ---------- hanging knee / leg raise ----------
// Active hang (shoulders pulled down) with straight arms on the door-frame bar.
// hip/knee: leg angles; curl: posterior pelvic tilt at the top; lean: torso pitch that
// keeps the centre of mass under the bar (no swinging); back: shoulders drift behind the bar.
const BAR_Y = 2.14;
const BAR_Z = 0.08;
const GRIP = 0.25;
const DOORFRAME = { type: "doorframe", pos: [0, 0, 0], w: 0.9, h: 2.05, bar: true, barH: BAR_Y, barZ: BAR_Z };
function legRaise({ hip = 4, knee = 6, curl = 0, lean = 0, back = 0, plantar = 22 } = {}) {
  const p = {
    rot: [lean - curl, 0, 0],
    spine: [curl, 0, 0],
    legL: [hip, 2, knee, plantar],
    legR: [hip, 2, knee, plantar],
    shrugL: [-0.03, 0],
    shrugR: [-0.03, 0],
    neck: [4, 0],
  };
  // Shoulders sit exactly one (straight) arm length below the hands.
  const dx = GRIP - joints(p).shoulderL.x;
  const dz = 0.02 + back;
  const shoulderY = BAR_Y - 0.035 - Math.sqrt(0.548 ** 2 - dx * dx - dz * dz);
  return {
    ...anchor(p, "shoulderL", [0, shoulderY, BAR_Z - dz], "yz"),
    handsIn: "world",
    handL: [GRIP, BAR_Y - 0.035, BAR_Z],
    handR: [-GRIP, BAR_Y - 0.035, BAR_Z],
    elbowL: [0.6, -1, 0.1],
    elbowR: [-0.6, -1, 0.1],
  };
}
const HANG = legRaise();
const KNEES_UP = legRaise({ hip: 92, knee: 105, curl: 4, lean: 12, back: 0.04 });
const KNEES_CURL = legRaise({ hip: 106, knee: 115, curl: 20, lean: 16, back: 0.05 });
const LEGS_UP = legRaise({ hip: 84, knee: 3, curl: 4, lean: 14, back: 0.07 });
const LEGS_CURL = legRaise({ hip: 88, knee: 3, curl: 15, lean: 15, back: 0.08 });

// ---------- floor back extension ----------
// Face down on the mat, fingertips at the temples; lift = spine extension in degrees.
function backExt(lift = 0) {
  const p = {
    rot: [88, 0, 0],
    spine: [-lift, 0, 0],
    neck: [lift * 0.25, 0],
    legL: [6, 3, 6, 72],
    legR: [6, 3, 6, 72],
    handsIn: "chest",
    handL: [0.18, 0.17, 0.05],
    handR: [-0.18, 0.17, 0.05],
    elbowL: [1, 0, 0.2],
    elbowR: [-1, 0, 0.2],
  };
  return ground(p, ["pelvis", "kneeL", "kneeR"], MAT_Y + 0.006);
}

// ---------- side plank ----------
// Lying on the right side along X (head toward −X), facing +Z, on the right forearm.
// tilt: body angle off the floor; bend: waist side bend; legTilt: legs vs. pelvis; feet stacked.
const SIDE_FOOT = [0.8, 0.058 + MAT_Y, 0]; // bottom ankle, foot on its outer edge
function sideBody({ tilt, bend = 0, legTilt = 0, breath = 0 }) {
  const p = {
    rot: [0, 0, 90 - tilt],
    spine: [breath, -bend, 0],
    legL: [0, legTilt - 3, 2, 6],
    legR: [0, -legTilt - 3, 2, 6],
    neck: [0, 0],
  };
  return anchor(p, "ankleR", SIDE_FOOT);
}
// Hips lifted: body in one straight line, bottom elbow straight under the shoulder.
const SIDE_UP = { tilt: 16.75 };
// Hips resting on the mat, propped on the forearm (bend solved so the shoulder stays
// one upper-arm length from the planted elbow).
const SIDE_DOWN = { tilt: 10, legTilt: 5.7, bend: 39.1 };
// The planted forearm: elbow on the mat under the lifted shoulder, forearm pointing forward.
const SIDE_ELBOW = (() => {
  const s = joints(sideBody(SIDE_UP)).shoulderR;
  return [s.x, s.y - 0.29, s.z];
})();
const SIDE_WRIST = [SIDE_ELBOW[0], 0.037 + MAT_Y, SIDE_ELBOW[2] + 0.26];
function sidePlank(o) {
  const body = sideBody(o);
  const J = joints(body);
  const S = J.shoulderR;
  return {
    ...body,
    handsIn: "world",
    handR: SIDE_WRIST,
    elbowR: [SIDE_ELBOW[0] - S.x, SIDE_ELBOW[1] - S.y, SIDE_ELBOW[2] - S.z], // pole through the planted elbow
    handL: at(J.Rp, J.pelvis, [0.2, 0.06, 0.03]), // top hand resting on the hip
    elbowL: [0, 0.6, -1],
  };
}

// ---------- high plank (shoulder taps) ----------
// Straight body on the hands, feet a bit wider than the hips; hands planted under the shoulders.
const TAP_BODY = anchor(
  { rot: [90 - 19, 0, 0], spine: [-1, 0, 0], legL: [0, 6, 0, -24], legR: [0, 6, 0, -24], neck: [-6, 0] },
  "toeL",
  [0, 0.006 + MAT_Y, -0.95],
  "yz"
);
const TAP_J = joints(TAP_BODY);
const TAP_HANDS = { L: [0.21, 0.09 + MAT_Y, TAP_J.shoulderL.z + 0.02], R: [-0.21, 0.09 + MAT_Y, TAP_J.shoulderR.z + 0.02] };
// Right hand touching the front of the left shoulder.
const TAP_TARGET = at(TAP_J.Rc, TAP_J.shoulderL, [-0.06, 0.06, 0.05]);
function shoulderTap(reach = 0) {
  const handR = TAP_HANDS.R.map((v, i) => v + (TAP_TARGET[i] - v) * reach);
  return { ...TAP_BODY, handsIn: "world", handL: TAP_HANDS.L, handR, elbowL: [0.6, 0.2, -0.6], elbowR: [-1, -0.2, -0.4] };
}

export default {
  plank: {
    clips: [
      {
        title: "Forearm plank",
        highlight: ["core", "shoulders"],
        camera: { view: [1, 0.4, 0.3], target: [0, 0.25, -0.15], dist: 3.9 },
        keys: [
          { t: 0, p: plank(9, 0), cue: "Elbows under shoulders, glutes squeezed" },
          { t: 2, p: plank(9.6, 2), cue: "Brace the abs, breathe normally" },
          { t: 4, p: plank(9, 0) },
        ],
      },
    ],
  },

  birddog: {
    clips: [
      {
        title: "Bird dog",
        highlight: ["core", "lowerBack", "glutes"],
        camera: { view: [1, 0.38, 0.35], target: [0, 0.42, -0.12], dist: 3.9 },
        alternate: true,
        keys: [
          { t: 0, p: quad(), cue: "Hands under shoulders, knees under hips" },
          { t: 0.4, p: quad(), cue: "Reach one arm forward and the opposite leg back" },
          { t: 1.8, p: quad({ armL: [172, 6, 0, 0], legR: [0, 3, 2, 30] }), cue: "Hold 2 s, hips level" },
          { t: 3.3, p: quad({ armL: [172, 6, 0, 0], legR: [0, 3, 2, 30] }), cue: "Return slowly, switch sides" },
          { t: 4.5, p: quad() },
        ],
      },
    ],
  },

  deadbug: {
    clips: [
      {
        title: "Dead bug",
        highlight: ["core"],
        camera: { view: [1, 0.55, -0.15], target: [0, 0.3, -0.3], dist: 3.2 },
        alternate: true,
        keys: [
          { t: 0, p: supine(), cue: "Arms up, knees over hips, lower back pressed down" },
          { t: 0.4, p: supine(), cue: "Lower one arm and the opposite leg slowly" },
          { t: 2.2, p: supine({ armL: [168, 6, 0, 0], legR: [18, 4, 4, 15] }) },
          { t: 2.7, p: supine({ armL: [168, 6, 0, 0], legR: [18, 4, 4, 15] }), cue: "Return, breathe out, switch sides" },
          { t: 4.2, p: supine() },
        ],
      },
    ],
  },

  legraise: {
    clips: [
      {
        title: "Hanging knee raise",
        props: [DOORFRAME],
        highlight: ["core", "hips", "grip"],
        camera: { view: [1, 0.2, 0.9], target: [0, 1.12, 0.1], dist: 4.5 },
        keys: [
          { t: 0, p: HANG, cue: "Active hang: shoulders pulled down" },
          { t: 0.4, p: HANG, cue: "Raise the knees toward your chest" },
          { t: 1.6, p: KNEES_UP, cue: "Curl the pelvis up; no swinging" },
          { t: 2.1, p: KNEES_CURL },
          { t: 2.5, p: KNEES_CURL, cue: "Lower slowly" },
          { t: 5.0, p: HANG },
        ],
      },
      {
        title: "Hanging straight-leg raise",
        props: [DOORFRAME],
        highlight: ["core", "hips", "grip"],
        camera: { view: [1, 0.2, 0.9], target: [0, 1.12, 0.15], dist: 4.5 },
        keys: [
          { t: 0, p: HANG, cue: "Active hang, legs straight" },
          { t: 0.4, p: HANG, cue: "Raise straight legs to hip height" },
          { t: 1.8, p: LEGS_UP, cue: "Curl the pelvis up; no swinging" },
          { t: 2.3, p: LEGS_CURL },
          { t: 2.7, p: LEGS_CURL, cue: "Lower slowly" },
          { t: 5.4, p: HANG },
        ],
      },
    ],
  },

  backext: {
    clips: [
      {
        title: "Floor back extension",
        props: [{ type: "mat", pos: [0, 0, -0.1], w: 0.62, d: 2.0 }],
        highlight: ["back", "lowerBack", "glutes"],
        camera: { view: [1, 0.32, 0.22], target: [0, 0.2, -0.08], dist: 4.0 },
        keys: [
          { t: 0, p: backExt(0), cue: "Face down, fingertips lightly at your temples" },
          { t: 0.8, p: backExt(0), cue: "Squeeze your glutes, lift your chest a few cm" },
          { t: 2.2, p: backExt(19), cue: "Hold 1–2 s, eyes on the floor" },
          { t: 3.7, p: backExt(19), cue: "Lower slowly" },
          { t: 5.7, p: backExt(0) },
        ],
      },
    ],
  },

  sideplank: {
    clips: [
      {
        title: "Side plank",
        props: [{ type: "mat", pos: [0, 0, 0.05], w: 0.62, d: 1.9, rotY: 90 }],
        highlight: ["obliques", "glutes", "shoulders"],
        camera: { view: [0.15, 0.3, 1], target: [0, 0.28, 0], dist: 3.7 },
        alternate: true,
        keys: [
          { t: 0, p: sidePlank(SIDE_DOWN), cue: "On one forearm, elbow under the shoulder" },
          // 1 ms "hold" segment: switching sides is an instant cut, not a flip through the air.
          { t: 0.001, p: sidePlank(SIDE_DOWN), e: "hold", cue: "On one forearm, elbow under the shoulder" },
          { t: 0.6, p: sidePlank(SIDE_DOWN), cue: "Lift the hips into a straight line" },
          { t: 2.0, p: sidePlank(SIDE_UP), cue: "Hold and breathe, feet stacked" },
          { t: 3.6, p: sidePlank({ ...SIDE_UP, breath: 2 }) },
          { t: 5.2, p: sidePlank(SIDE_UP), cue: "Lower with control, then switch sides" },
          { t: 6.6, p: sidePlank(SIDE_DOWN) },
        ],
      },
    ],
  },

  shouldertap: {
    clips: [
      {
        title: "Plank shoulder taps",
        props: [{ type: "mat", pos: [0, 0, -0.25], w: 0.62, d: 1.85 }],
        highlight: ["core", "shoulders"],
        camera: { view: [0.45, 0.32, 1], target: [0, 0.32, -0.28], dist: 3.5 },
        alternate: true,
        keys: [
          { t: 0, p: shoulderTap(0), cue: "High plank, feet a bit wider than the hips" },
          { t: 0.5, p: shoulderTap(0), cue: "Tap the opposite shoulder" },
          { t: 1.4, p: shoulderTap(1), cue: "Keep the hips still" },
          { t: 1.8, p: shoulderTap(1), cue: "Hand down, then the other side" },
          { t: 2.7, p: shoulderTap(0) },
        ],
      },
    ],
  },
};
