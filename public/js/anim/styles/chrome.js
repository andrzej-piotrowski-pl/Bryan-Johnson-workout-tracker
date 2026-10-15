// Liquid chrome: a mirror-finish figure that flows like liquid metal, ray-marched in
// one fragment shader on plain WebGL (no three.js). The body is a signed distance
// field: a rounded capsule per bone, melted together with a smooth minimum, so the
// joints blend like poured metal. Each pixel casts a ray into it, then a second ray
// for the reflection, so the figure reflects the studio's softboxes, the glossy
// floor, the props and itself. The props are distance fields too: boxes (benches,
// chairs, door frames…), a wedge (the slant board), mirror-metal bars and dumbbells,
// glossy bands. Soft shadows, contact occlusion, gold where the muscles work, filmic
// tone mapping and a little grain.

import { asLayer, isLit, litRegions, propParts } from "./flat.js";

const NBOX = 12, NDB = 3, NBAND = 4;
// Prop materials, by the kind flat.js gives each solid (the shader adds 10).
const KINDS = { prop: 0, propDark: 1, wood: 2, mat: 3, wall: 4, metal: 5, band: 6 };

const NSEG = 16;
// Capsules: [from joint, to joint, radius at from, radius at to, region].
const SEGS = [
  ["pelvis", "lumbar", 0.125, 0.115, "pelvis"],
  ["lumbar", "thoracic", 0.112, 0.13, "abdomen"],
  ["thoracic", "neckBase", 0.135, 0.085, "chest"],
  ["shoulderL", "shoulderR", 0.062, 0.062, "chest"],
  ["hipL", "hipR", 0.088, 0.088, "pelvis"],
  ["neckBase", "headJoint", 0.048, 0.044, "neck"],
  ["shoulderL", "elbowL", 0.052, 0.04, "upperArmL"],
  ["shoulderR", "elbowR", 0.052, 0.04, "upperArmR"],
  ["elbowL", "handL", 0.038, 0.03, "forearmL"],
  ["elbowR", "handR", 0.038, 0.03, "forearmR"],
  ["hipL", "kneeL", 0.082, 0.052, "thighL"],
  ["hipR", "kneeR", 0.082, 0.052, "thighR"],
  ["kneeL", "ankleL", 0.054, 0.036, "shinL"],
  ["kneeR", "ankleR", 0.054, 0.036, "shinR"],
  ["heelL", "ballL", 0.036, 0.03, "footL"],
  ["heelR", "ballR", 0.036, 0.03, "footR"],
];

const VERT = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
#define NSEG ${NSEG}
uniform vec2 uRes;
uniform mat4 uWorld;
uniform mat4 uInvProj;
uniform vec3 uCam;
uniform vec3 uA[NSEG];
uniform vec3 uB[NSEG];
uniform vec2 uR[NSEG];
uniform float uHl[NSEG];
uniform vec3 uHead;
uniform vec4 uBound;
#define NBOX ${NBOX}
#define NDB ${NDB}
#define NBAND ${NBAND}
uniform vec3 uBoxC[NBOX];
uniform vec3 uBoxH[NBOX];
uniform vec2 uBoxYK[NBOX];
uniform float uNumBox;
uniform vec4 uWedge;
uniform vec4 uWedgeCY;
uniform vec3 uDbC[NDB];
uniform vec4 uDbAS[NDB];
uniform float uNumDb;
uniform vec3 uBandA[NBAND];
uniform vec4 uBandBK[NBAND];
uniform float uNumBand;
uniform float uPulse;
uniform float uSeed;

const vec3 KEY = vec3(0.5427, 0.6783, 0.4955);

float noise(vec2 p) {
  return fract(sin(dot(p + uSeed, vec2(12.9898, 78.233))) * 43758.5453);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float capsule(vec3 p, vec3 a, vec3 b, vec2 r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h) - mix(r.x, r.y, h);
}
float figure(vec3 p) {
  float outside = length(p - uBound.xyz) - uBound.w;
  if (outside > 0.15) return outside;
  float d = length((p - uHead) * vec3(1.0, 0.86, 0.95)) - 0.1;
  for (int i = 0; i < NSEG; i++) d = smin(d, capsule(p, uA[i], uB[i], uR[i]), 0.05);
  return d;
}
// How gold the metal is at p: the highlight of the nearest bones, blended like the shape.
float figureGold(vec3 p) {
  float d = length((p - uHead) * vec3(1.0, 0.86, 0.95)) - 0.1;
  float g = 0.0;
  for (int i = 0; i < NSEG; i++) {
    float c = capsule(p, uA[i], uB[i], uR[i]);
    float h = clamp(0.5 + 0.5 * (d - c) / 0.05, 0.0, 1.0);
    g = mix(g, uHl[i], h);
    d = mix(d, c, h) - 0.05 * h * (1.0 - h);
  }
  return g;
}
// p in the frame of a prop centred at c and turned by yaw.
vec3 local(vec3 p, vec3 c, float yaw) {
  vec3 q = p - c;
  float co = cos(yaw), si = sin(yaw);
  q.xz = mat2(co, si, -si, co) * q.xz;
  return q;
}
float sdBox(vec3 q, vec3 h) {
  float r = min(0.012, min(h.x, min(h.y, h.z)) * 0.8);
  vec3 d = abs(q) - (h - r);
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0) - r;
}
float sdCylinder(vec3 p, vec3 a, vec3 b, float r) {
  vec3 ba = b - a, pa = p - a;
  float baba = dot(ba, ba), paba = dot(pa, ba);
  float x = length(pa * baba - ba * paba) - r * baba;
  float y = abs(paba - baba * 0.5) - baba * 0.5;
  float x2 = x * x, y2 = y * y * baba;
  float d = (max(x, y) < 0.0) ? -min(x2, y2) : (((x > 0.0) ? x2 : 0.0) + ((y > 0.0) ? y2 : 0.0));
  return sign(d) * sqrt(abs(d)) / baba;
}
// Everything that isn't the figure, and its material (10 + the prop's kind).
vec2 props(vec3 p) {
  vec2 r = vec2(1e5, 0.0);
  for (int i = 0; i < NBOX; i++) {
    if (float(i) >= uNumBox) break;
    float d = sdBox(local(p, uBoxC[i], uBoxYK[i].x), uBoxH[i]);
    if (d < r.x) r = vec2(d, 10.0 + uBoxYK[i].y);
  }
  if (uWedge.w > 0.5) {
    vec3 q = local(p, uWedgeCY.xyz, uWedgeCY.w);
    vec3 n = normalize(vec3(0.0, uWedge.y, uWedge.z));
    float d = max(sdBox(q - vec3(0.0, uWedge.z * 0.5, 0.0), vec3(uWedge.x, uWedge.z, uWedge.y) * 0.5), dot(q - vec3(0.0, 0.0, uWedge.y * 0.5), n));
    if (d < r.x) r = vec2(d, 12.0);
  }
  for (int i = 0; i < NDB; i++) {
    if (float(i) >= uNumDb) break;
    vec3 c = uDbC[i], ax = uDbAS[i].xyz;
    float s = uDbAS[i].w, o = 0.07 + 0.035 * s, hl = 0.035 * s;
    float d = min(sdCylinder(p, c + ax * (o - hl), c + ax * (o + hl), 0.056 * s), sdCylinder(p, c - ax * (o - hl), c - ax * (o + hl), 0.056 * s));
    d = min(d, capsule(p, c - ax * o, c + ax * o, vec2(0.016)));
    if (d < r.x) r = vec2(d, 15.0);
  }
  for (int i = 0; i < NBAND; i++) {
    if (float(i) >= uNumBand) break;
    float d = capsule(p, uBandA[i], uBandBK[i].xyz, vec2(uBandBK[i].w > 16.5 ? 0.006 : 0.01));
    if (d < r.x) r = vec2(d, uBandBK[i].w);
  }
  return r;
}
vec2 map(vec3 p) {
  vec2 r = vec2(figure(p), 1.0);
  vec2 q = props(p);
  return q.x < r.x ? q : r;
}
vec2 march(vec3 ro, vec3 rd, float tmax, int steps) {
  float t = 0.0;
  for (int i = 0; i < 120; i++) {
    if (i >= steps) break;
    vec2 h = map(ro + rd * t);
    if (h.x < 0.0008 * (1.0 + t)) return vec2(t, h.y);
    t += h.x * 0.9;
    if (t > tmax) break;
  }
  return vec2(t, 0.0);
}
vec3 normalAt(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0012;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}
// Soft shadow. The figure is only marched where the ray crosses its bounding sphere,
// with exact distances (the bound's own distance would cast a shadow of its own); the
// start is dithered per pixel, so the penumbra shows no banding.
float penumbra(float h, float t, inout float ph) {
  float y = h * h / (2.0 * ph);
  float d = sqrt(max(h * h - y * y, 0.0));
  ph = h;
  return 8.0 * d / max(0.0001, t - y);
}
float softShadow(vec3 ro, vec3 rd, float jitter) {
  float res = 1.0;
  vec3 oc = ro - uBound.xyz;
  float b = dot(oc, rd);
  float disc = b * b - (dot(oc, oc) - uBound.w * uBound.w);
  if (disc > 0.0) {
    float t = max(-b - sqrt(disc), 0.012 + 0.02 * jitter), t1 = -b + sqrt(disc), ph = 1e10;
    for (int i = 0; i < 56; i++) {
      float h = figure(ro + rd * t);
      res = min(res, penumbra(h, t, ph));
      t += clamp(h, 0.01, 0.15);
      if (res < 0.003 || t > t1) break;
    }
  }
  {
    float t = 0.012 + 0.02 * jitter, ph = 1e10;
    for (int i = 0; i < 32; i++) {
      float h = props(ro + rd * t).x;
      res = min(res, penumbra(h, t, ph));
      t += clamp(h, 0.01, 0.3);
      if (res < 0.003 || t > 3.0) break;
    }
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}
float occlusion(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.025 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= 0.62;
  }
  return clamp(1.0 - 3.0 * o, 0.0, 1.0);
}

// The studio: a dark cyclorama lit by softboxes, a rim strip, a teal accent strip and a
// bright horizon line, so the metal has something to mirror.
float softbox(vec3 d, vec3 L, vec3 T, vec2 size) {
  float c = dot(d, L);
  if (c <= 0.0) return 0.0;
  vec3 B = normalize(cross(L, T));
  vec2 q = abs(vec2(dot(d, T), dot(d, B)) / c) - size;
  return 1.0 - smoothstep(0.0, 0.03, max(q.x, q.y));
}
vec3 env(vec3 d) {
  float y = d.y;
  vec3 col = mix(vec3(0.02, 0.021, 0.025), vec3(0.3, 0.31, 0.34), smoothstep(-0.3, 0.04, y));
  col = mix(col, vec3(0.1, 0.105, 0.12), smoothstep(0.04, 0.8, y));
  col += vec3(0.9, 0.92, 1.0) * exp(-abs(y - 0.02) * 60.0) * 0.9;
  col += vec3(0.8, 0.85, 0.95) * 0.9 * softbox(d, normalize(vec3(0.72, 0.12, 0.68)), normalize(vec3(-0.69, 0.0, 0.73)), vec2(0.9, 0.35));
  col += vec3(1.0, 0.95, 0.88) * 5.0 * softbox(d, KEY, normalize(vec3(-0.67, 0.0, 0.74)), vec2(0.55, 0.32));
  col += vec3(0.75, 0.85, 1.0) * 1.6 * softbox(d, normalize(vec3(-0.85, 0.3, 0.42)), normalize(vec3(0.44, 0.0, 0.9)), vec2(0.18, 0.55));
  col += vec3(1.0) * 3.5 * softbox(d, normalize(vec3(-0.25, 0.25, -0.94)), normalize(vec3(0.97, 0.0, -0.26)), vec2(0.04, 0.75));
  col += vec3(0.2, 0.95, 0.85) * 1.8 * softbox(d, normalize(vec3(0.95, 0.12, -0.3)), normalize(vec3(0.3, 0.0, 0.95)), vec2(0.03, 0.6));
  col += vec3(1.0) * 2.0 * softbox(d, vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), vec2(0.7, 0.05));
  return col;
}
vec3 backdrop(vec3 d) {
  vec3 col = mix(vec3(0.02, 0.022, 0.028), vec3(0.075, 0.08, 0.095), smoothstep(-0.2, 0.15, d.y));
  return mix(col, vec3(0.02, 0.022, 0.03), smoothstep(0.15, 0.8, d.y));
}
vec3 floorColor(vec3 p) {
  float sh = softShadow(p + vec3(0.0, 0.002, 0.0), KEY, noise(p.xz * 400.0));
  float spot = exp(-dot(p.xz, p.xz) * 0.55);
  vec3 col = vec3(0.05, 0.053, 0.06) * (0.25 + 1.6 * spot * mix(0.18, 1.0, sh));
  return col * mix(0.55, 1.0, occlusion(p, vec3(0.0, 1.0, 0.0)));
}
// A prop's surface, by material: matte charcoal, dark, wood, the teal mat, the wall,
// mirror metal (bars, dumbbells), glossy orange bands, a blue string.
vec3 propColor(vec3 p, vec3 n, vec3 rd, float m) {
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  if (m > 14.5 && m < 15.5) return env(reflect(rd, n)) * vec3(0.72, 0.74, 0.78) * mix(0.6, 1.0, occlusion(p, n));
  vec3 base = m < 10.5 ? vec3(0.032, 0.034, 0.04) : m < 11.5 ? vec3(0.018, 0.019, 0.022) : m < 12.5 ? vec3(0.1, 0.06, 0.032) : m < 13.5 ? vec3(0.018, 0.085, 0.07) : m < 14.5 ? vec3(0.04, 0.042, 0.048) : m < 16.5 ? vec3(0.95, 0.3, 0.05) : vec3(0.15, 0.35, 0.95);
  float dif = max(dot(n, KEY), 0.0) * mix(0.3, 1.0, softShadow(p + n * 0.003, KEY, 0.5));
  vec3 col = base * (0.4 + 2.4 * dif) * occlusion(p, n);
  return col + env(reflect(rd, n)) * ((m > 15.5 ? 0.12 : 0.04) + 0.3 * fres);
}
vec3 metal(float gold) {
  return mix(vec3(0.93, 0.95, 0.98), vec3(1.0, 0.72, 0.3) * (1.0 + 0.25 * uPulse), gold);
}
// What a reflected ray sees: one level deep, no further reflections. sky: how much of
// the studio's lights it sees when it hits nothing (the floor mirrors only the dark
// backdrop, so the softboxes don't show up as slabs of light on it).
vec3 trace(vec3 ro, vec3 rd, float sky) {
  float tf = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;
  vec2 h = march(ro, rd, min(tf, 8.0), 64);
  if (h.y > 0.5) {
    vec3 p = ro + rd * h.x;
    vec3 n = normalAt(p);
    if (h.y < 1.5) return env(reflect(rd, n)) * metal(figureGold(p)) * 0.85;
    return propColor(p, n, rd, h.y);
  }
  if (tf < 1e8) return floorColor(ro + rd * tf);
  return mix(backdrop(rd), env(rd), sky);
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize((uWorld * vec4(normalize(v.xyz / v.w), 0.0)).xyz);
  vec3 ro = uCam;
  float tf = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;
  vec2 h = march(ro, rd, min(tf, 24.0), 120);
  vec3 col;
  if (h.y > 0.5) {
    vec3 p = ro + rd * h.x;
    vec3 n = normalAt(p);
    if (h.y < 1.5) {
      vec3 refl = trace(p + n * 0.004, reflect(rd, n), 1.0);
      float fres = mix(0.72, 1.0, pow(1.0 - max(dot(n, -rd), 0.0), 4.0));
      col = refl * metal(figureGold(p)) * fres * mix(0.5, 1.0, occlusion(p, n));
    } else {
      col = propColor(p, n, rd, h.y);
    }
  } else if (tf < 1e8) {
    vec3 p = ro + rd * tf;
    float fres = 0.08 + 0.5 * pow(1.0 - abs(rd.y), 5.0);
    col = floorColor(p) + trace(p + vec3(0.0, 0.001, 0.0), reflect(rd, vec3(0.0, 1.0, 0.0)), 0.0) * fres;
    col = mix(col, backdrop(rd), smoothstep(3.0, 7.0, length(p.xz)));
  } else {
    col = backdrop(rd);
  }
  col = aces(col * 1.1);
  col = pow(col, vec3(1.0 / 2.2));
  col *= 1.0 - 0.38 * dot(uv - 0.5, uv - 0.5) * 2.0;
  col += (noise(gl_FragCoord.xy) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error("Chrome shader: " + gl.getShaderInfoLog(sh));
  return sh;
}

export function createFigure() {
  const canvas = asLayer(document.createElement("canvas"), "chrome");
  canvas.style.background = "#060708";
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("Chrome shader: " + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one triangle covers the screen
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ["uRes", "uWorld", "uInvProj", "uCam", "uA", "uB", "uR", "uHl", "uHead", "uBound", "uBoxC", "uBoxH", "uBoxYK", "uNumBox", "uWedge", "uWedgeCY", "uDbC", "uDbAS", "uNumDb", "uBandA", "uBandBK", "uNumBand", "uPulse", "uSeed"]) U[n] = gl.getUniformLocation(prog, n);
  const BC = new Float32Array(NBOX * 3), BH = new Float32Array(NBOX * 3), BYK = new Float32Array(NBOX * 2);
  const DC = new Float32Array(NDB * 3), DAS = new Float32Array(NDB * 4), NA = new Float32Array(NBAND * 3), NBK = new Float32Array(NBAND * 4);

  const A = new Float32Array(NSEG * 3), B = new Float32Array(NSEG * 3), R = new Float32Array(NSEG * 2), HL = new Float32Array(NSEG);
  SEGS.forEach(([, , r0, r1], i) => R.set([r0, r1], i * 2));
  let J = null;
  let lit = new Set();
  let pulse = 0.5;
  let still = false;
  // Rendering scale (pixels per CSS pixel): lowered while frames come in slowly.
  let scale = Math.min(window.devicePixelRatio || 1, 1.25);
  let last = 0, slow = 0;

  function draw(view) {
    const now = performance.now();
    if (!still && last) {
      const dt = now - last;
      slow = slow * 0.9 + (dt > 40 ? 1 : 0) * 0.1;
      if (slow > 0.6 && scale > 0.4) (scale *= 0.85), (slow = 0);
    }
    last = now;
    const s = still ? Math.min(window.devicePixelRatio || 1, 1.5) : scale;
    const W = Math.max(1, Math.round(view.width * s)), H = Math.max(1, Math.round(view.height * s));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    gl.viewport(0, 0, W, H);
    if (!J) return;
    let cx = 0, cy = 0, cz = 0;
    SEGS.forEach(([a, b, , , region], i) => {
      A.set([J[a].x, J[a].y, J[a].z], i * 3);
      B.set([J[b].x, J[b].y, J[b].z], i * 3);
      HL[i] = isLit(lit, region) ? 1 : 0;
      cx += J[a].x + J[b].x;
      cy += J[a].y + J[b].y;
      cz += J[a].z + J[b].z;
    });
    const n = SEGS.length * 2;
    const c = [cx / n, cy / n, cz / n];
    let rad = 0;
    for (const k of ["head", "handL", "handR", "toeL", "toeR", "heelL", "heelR", "kneeL", "kneeR", "elbowL", "elbowR"]) {
      rad = Math.max(rad, Math.hypot(J[k].x - c[0], J[k].y - c[1], J[k].z - c[2]));
    }
    gl.uniform2f(U.uRes, W, H);
    gl.uniformMatrix4fv(U.uWorld, false, view.camera.world);
    gl.uniformMatrix4fv(U.uInvProj, false, view.camera.invProj);
    gl.uniform3fv(U.uCam, view.camera.pos);
    gl.uniform3fv(U.uA, A);
    gl.uniform3fv(U.uB, B);
    gl.uniform2fv(U.uR, R);
    gl.uniform1fv(U.uHl, HL);
    gl.uniform3f(U.uHead, J.head.x, J.head.y, J.head.z);
    gl.uniform4f(U.uBound, c[0], c[1], c[2], rad + 0.16);
    // The props as boxes and a wedge; what the hands hold as dumbbells and bands.
    let nb = 0, wedge = null;
    for (const part of view.props.flatMap(propParts)) {
      if (part.wedge) wedge = part;
      else if (nb < NBOX) {
        BC.set(part.c, nb * 3);
        BH.set(part.h, nb * 3);
        BYK.set([part.yaw, KINDS[part.kind] ?? 0], nb * 2);
        nb++;
      }
    }
    gl.uniform3fv(U.uBoxC, BC);
    gl.uniform3fv(U.uBoxH, BH);
    gl.uniform2fv(U.uBoxYK, BYK);
    gl.uniform1f(U.uNumBox, nb);
    gl.uniform4f(U.uWedge, ...(wedge ? [...wedge.wedge, 1] : [0, 0, 0, 0]));
    gl.uniform4f(U.uWedgeCY, ...(wedge ? [...wedge.c, wedge.yaw] : [0, 0, 0, 0]));
    const at = view.attachments;
    const dbs = at.dumbbells.slice(0, NDB);
    dbs.forEach((db, i) => {
      DC.set([db.c.x, db.c.y, db.c.z], i * 3);
      DAS.set([db.axis.x, db.axis.y, db.axis.z, db.size], i * 4);
    });
    gl.uniform3fv(U.uDbC, DC);
    gl.uniform4fv(U.uDbAS, DAS);
    gl.uniform1f(U.uNumDb, dbs.length);
    const lines = [...at.bands.map((b) => [...b, 16]), ...(at.string ? [[...at.string, 17]] : [])].slice(0, NBAND);
    lines.forEach(([a, b, m], i) => {
      NA.set([a.x, a.y, a.z], i * 3);
      NBK.set([b.x, b.y, b.z, m], i * 4);
    });
    gl.uniform3fv(U.uBandA, NA);
    gl.uniform4fv(U.uBandBK, NBK);
    gl.uniform1f(U.uNumBand, lines.length);
    gl.uniform1f(U.uPulse, pulse);
    gl.uniform1f(U.uSeed, still ? 0 : (now % 1000) / 10);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    dom: canvas,
    update(joints, info = {}) {
      J = joints;
      still = !!info.still;
    },
    draw,
    setHighlight(groups) {
      lit = litRegions(groups);
    },
    setPulse(v) {
      pulse = v;
    },
    setTheme() {},
    // Read right after draw(), in the same task, while the frame is still in the buffer.
    snapshot: () => canvas.toDataURL("image/png"),
    dispose() {
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      canvas.remove();
    },
  };
}
