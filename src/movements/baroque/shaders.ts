/**
 * Baroque — a raymarched signed-distance world.
 *
 * The whole scene is evaluated per pixel: a fractal architecture (KIFS ornament, Mandelbox organ,
 * Apollonian vault or a canopy on twisted Solomonic columns) lit in chiaroscuro by one window light
 * with soft shadows, ambient occlusion and god rays — and by the notes themselves, which are moving
 * candle-lights that illuminate the gilded surfaces near them and glow in the air.
 */

export const MAX_LIGHTS = 24;
export const PIPES = 29;

export const RAYMARCH_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 oColor;

uniform vec2 uRes;
uniform float uTime;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform float uNear;

uniform int uForm;
uniform int uIter;
uniform int uSteps;
uniform vec4 uMorph;
uniform mat3 uRot;
uniform float uScale;
uniform float uFloorY;
uniform float uFloorOn;

uniform vec3 uKeyDir;
uniform vec3 uKeyCol;
uniform float uKeyPow;
uniform vec3 uFillCol;
uniform float uAmbient;
uniform float uGod;
uniform float uFog;
uniform float uShadowK;
uniform float uAO;
uniform vec4 uMat;        // roughness, metalness, trap contrast, floor gloss
uniform vec3 uAlbedoA;
uniform vec3 uAlbedoB;
uniform vec3 uStone;
uniform int uBg;
uniform vec3 uBgA;
uniform vec3 uBgB;

uniform int uNumLights;
uniform vec4 uLP[${MAX_LIGHTS}];   // xyz position, w = size
uniform vec4 uLC[${MAX_LIGHTS}];   // rgb colour, w = intensity
uniform float uFalloff;
uniform float uHalo;
uniform float uPipe[${PIPES}];

/* ------------------------------------------------------------------ forms */

float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdCyl(vec3 p, float h, float r) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdTorusZ(vec3 p, float R, float r) { return length(vec2(length(p.xy) - R, p.z)) - r; }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

vec2 monstrance(vec3 p) {
  // the Baroque monstrance: a golden sunburst around a crystal lunette, on a baluster stem.
  // uMorph.x: ray length (dynamics) · uMorph.y: flame waviness (tension) · uMorph.z: slow turn
  float trap = 1.0;
  // foot and stem
  float d = sdCyl(p - vec3(0.0, -2.08, 0.0), 0.05, 0.95) - 0.03;
  d = smin(d, sdCyl(p - vec3(0.0, -1.95, 0.0), 0.07, 0.68) - 0.04, 0.08);
  d = smin(d, sdTorusZ((p - vec3(0.0, -1.86, 0.0)).xzy, 0.55, 0.06), 0.05);
  float y = clamp(p.y, -1.85, -0.3);
  float baluster = 0.09 + 0.07 * smoothstep(-1.85, -1.4, y) * (1.0 - smoothstep(-1.4, -0.9, y)) + 0.05 * exp(-pow((y + 0.55) * 6.0, 2.0));
  float stem = max(length(p.xz) - baluster, abs(p.y + 1.08) - 0.78);
  d = smin(d, stem, 0.06);
  d = min(d, length(p - vec3(0.0, -0.95, 0.0)) - 0.2);                     // the knop
  d = min(d, sdTorusZ((p - vec3(0.0, -0.95, 0.0)).xzy, 0.2, 0.05));
  // the sun
  vec3 q = p - vec3(0.0, 0.7, 0.0);
  float ca = cos(uMorph.z), sa = sin(uMorph.z);
  q.xy = mat2(ca, -sa, sa, ca) * q.xy;
  float ring = sdTorusZ(q, 0.46, 0.07);
  float ring2 = sdTorusZ(q, 0.6, 0.035);
  // beads around the lunette
  float ab = atan(q.y, q.x);
  float sb = 6.2831853 / 24.0;
  float ib = floor(ab / sb + 0.5);
  float rb = ab - ib * sb;
  vec2 pb = length(q.xy) * vec2(cos(rb), sin(rb));
  float beads = length(vec3(pb.x - 0.71, pb.y, q.z)) - 0.04;
  // rays: alternating straight blades and wavy flames
  float N = 36.0;
  float sector = 6.2831853 / N;
  float a = atan(q.y, q.x);
  float ai = floor(a / sector + 0.5);
  float ar = a - ai * sector;
  vec2 pr = length(q.xy) * vec2(cos(ar), sin(ar));
  bool flame = mod(ai, 2.0) > 0.5;
  float len = (flame ? 0.95 : 1.35) * (0.7 + 0.6 * uMorph.x);
  float rx = pr.x - 0.66;
  float t01 = clamp(rx / len, 0.0, 1.0);
  float wave = flame ? sin(rx * 16.0 - uTime * 1.5) * 0.035 * (0.4 + uMorph.y) * t01 : 0.0;
  float hw = mix(flame ? 0.045 : 0.03, 0.004, pow(t01, 0.8));
  float ray = max(abs(pr.y + wave) - hw, max(-rx, rx - len));
  ray = max(ray, abs(q.z) - (0.035 * (1.0 - t01) + 0.008));
  float sun = min(min(ring, ring2), min(beads, ray * 0.8));
  // the cross above
  vec3 c = p - vec3(0.0, 0.7 + 0.78 + len * 0.8, 0.0);
  float cross = min(sdBox(c, vec3(0.035, 0.22, 0.035)), sdBox(c - vec3(0.0, 0.07, 0.0), vec3(0.14, 0.035, 0.035)));
  d = min(d, min(sun, cross));
  // crystal lunette (emissive): flagged with trap < -1.5
  float disc = max(length(q.xy) - 0.42, abs(q.z) - 0.025);
  if (disc < d) return vec2(disc, -2.0);
  trap = clamp(length(q.xy) * 0.6, 0.0, 4.0);
  return vec2(d, trap);
}

vec2 kifs(vec3 p) {
  // kaleidoscopic IFS (Menger-type fold with rotation) — a reliquary of folded, pierced ornament
  float sc = uMorph.x;
  vec3 C = uMorph.yzw;
  float s = 1.0;
  float trap = 1e9;
  for (int i = 0; i < 12; i++) {
    if (i >= uIter) break;
    p = abs(p);
    if (p.x < p.y) p.xy = p.yx;
    if (p.x < p.z) p.xz = p.zx;
    if (p.y < p.z) p.yz = p.zy;
    p = uRot * p;
    p.x = sc * p.x - C.x * (sc - 1.0);
    p.y = sc * p.y - C.y * (sc - 1.0);
    p.z = sc * p.z;
    if (p.z > 0.5 * C.z * (sc - 1.0)) p.z -= C.z * (sc - 1.0);
    s *= sc;
    trap = min(trap, dot(p, p));
  }
  // rounded end shape: softer, carved-looking ornament
  return vec2((sdBox(p, vec3(0.82)) - 0.18) / s, trap);
}

vec2 mandelbox(vec3 p) {
  // the organ: box folds and sphere inversions
  float scale = -1.6 - uMorph.x * 0.6;
  vec3 z = p;
  float dr = 1.0;
  float trap = 1e9;
  for (int i = 0; i < 12; i++) {
    if (i >= uIter) break;
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    float r2 = dot(z, z);
    trap = min(trap, r2);
    float minR = 0.2 + uMorph.y * 0.15;
    if (r2 < minR) { z *= 1.0 / minR; dr *= 1.0 / minR; }
    else if (r2 < 1.0) { z /= r2; dr /= r2; }
    z = uRot * z;
    z = z * scale + p;
    dr = dr * abs(scale) + 1.0;
  }
  return vec2(length(z) / abs(dr), trap);
}

vec2 apollonian(vec3 p) {
  // gilded vaults: Apollonian packing of spheres, cut to a reliquary sphere
  vec3 q = p;
  float s = 1.15 + uMorph.x * 0.25;
  float scale = 1.0;
  float trap = 1e9;
  q = uRot * q;
  for (int i = 0; i < 12; i++) {
    if (i >= uIter) break;
    q = -1.0 + 2.0 * fract(0.5 * q + 0.5);
    float r2 = dot(q, q);
    trap = min(trap, r2);
    float k = s / r2;
    q *= k;
    scale *= k;
  }
  float d = 0.25 * abs(q.y) / scale;
  return vec2(max(d, sdBox(p - vec3(0.0, -0.35, 0.0), vec3(1.9, 1.75, 1.9))), trap);
}

vec2 baldacchino(vec3 p) {
  // four Solomonic (twisted) columns under a canopy — Bernini at St Peter's
  float trap = 1e9;
  vec3 c = p;
  c.xz = abs(c.xz) - vec2(1.05);
  float tw = 2.6 + uMorph.y * 2.0;
  float a = atan(c.z, c.x);
  vec2 axis = vec2(cos(c.y * tw), sin(c.y * tw)) * 0.11;
  float flutes = 7.0 + floor(uMorph.z * 6.0);
  float r = 0.2 + 0.025 * sin(a * flutes + c.y * tw * 3.0) + 0.02 * sin(c.y * 9.0);
  float col = length(c.xz - axis) - r;
  col = max(col, abs(c.y) - 1.25);
  float base = sdBox(c - vec3(0.0, -1.33, 0.0), vec3(0.3, 0.09, 0.3));
  float cap = sdBox(c - vec3(0.0, 1.33, 0.0), vec3(0.28, 0.08, 0.28));
  float d = min(col, min(base, cap));
  // canopy with a KIFS crest
  float canopy = sdBox(p - vec3(0.0, 1.55, 0.0), vec3(1.45, 0.12, 1.45));
  vec3 k = (p - vec3(0.0, 2.05, 0.0)) * 2.2;
  float s = 1.0;
  for (int i = 0; i < 5; i++) {
    k = abs(k);
    if (k.x < k.z) k.xz = k.zx;
    k = uRot * k;
    k = k * 1.9 - vec3(1.0, 0.6 + uMorph.x * 0.4, 1.0) * 0.9;
    s *= 1.9;
    trap = min(trap, dot(k, k));
  }
  float crest = sdBox(k, vec3(1.0)) / s / 2.2;
  crest = max(crest, abs(p.y - 2.05) - 0.5);
  d = min(d, min(canopy, crest));
  trap = min(trap, abs(c.y) * 2.0);
  return vec2(d * 0.7, trap);
}

float pipeHeight(float i) {
  // three towers: tall centre, two flanking towers, flats between
  float a = abs(i);
  float centre = 1.25 * exp(-a * a / 6.0);
  float side = 0.95 * exp(-pow(a - 10.5, 2.0) / 3.0);
  return 0.85 + centre + side - 0.025 * a;
}

vec2 organ(vec3 p) {
  // Bach's instrument: a façade of pipes in towers on a carved case; each note lights its pipe
  float sp = 0.15;
  float i = clamp(floor(p.x / sp + 0.5), -14.0, 14.0);
  vec3 q = p - vec3(i * sp, 0.0, 0.0);
  float h = pipeHeight(i);
  float r = 0.048 + 0.012 * (h - 0.8);
  float zc = 0.08 * cos(i * 0.21);                  // a gently curved front
  q.z -= zc;
  float bottom = -1.15;
  float body = max(length(q.xz) - r, max(bottom - q.y, q.y - (bottom + h)));
  // conical foot
  float foot = max(length(q.xz) - mix(0.012, r, smoothstep(bottom - 0.28, bottom, q.y)), max(q.y - bottom, bottom - 0.28 - q.y));
  float pipe = min(body, foot);
  // the mouth: a notch cut into the front of the pipe
  float mouth = sdBox(q - vec3(0.0, bottom + 0.12, r), vec3(r * 0.6, 0.045, r * 0.6));
  pipe = max(pipe, -mouth);
  // case, impost and cornice
  float caseD = sdBox(p - vec3(0.0, -1.83, -0.05), vec3(2.3, 0.4, 0.45));
  caseD = min(caseD, sdBox(p - vec3(0.0, -1.42, -0.02), vec3(2.38, 0.05, 0.5)));
  float panels = sdBox(vec3(mod(p.x + 0.3, 0.6) - 0.3, p.y + 1.85, p.z - 0.4), vec3(0.24, 0.26, 0.02));
  caseD = max(caseD, -panels * 1.0 + 0.0);
  float back = sdBox(p - vec3(0.0, 0.0, -0.32), vec3(2.25, 1.6, 0.06));
  // ornament crests above the towers (small kaleidoscopic carvings)
  float crest = 1e9;
  for (int t = -1; t <= 1; t++) {
    float cx = float(t) * 10.5 * sp;
    float top = bottom + pipeHeight(float(t) * 10.5) + 0.25;
    vec3 k = (p - vec3(cx, top, 0.0)) * 3.0;
    float s = 1.0;
    for (int j = 0; j < 4; j++) {
      k = abs(k);
      if (k.x < k.y) k.xy = k.yx;
      k = uRot * k;
      k = k * 2.0 - vec3(0.8, 0.5, 0.2);
      s *= 2.0;
    }
    crest = min(crest, max((length(k) - 0.9) / s / 3.0, length(p - vec3(cx, top, 0.0)) - 0.32));
  }
  float d = min(min(pipe, caseD), min(back, crest));
  float trap = pipe <= d + 1e-4 ? 10.0 + i + 14.0 : 1.5;
  return vec2(d * 0.85, trap);
}

vec2 mapForm(vec3 p) {
  p /= uScale;
  vec2 r;
  if (uForm == 0) r = kifs(p * 0.85) / vec2(0.85, 1.0);
  else if (uForm == 1) r = mandelbox(p * 1.55) / vec2(1.55, 1.0);
  else if (uForm == 2) r = apollonian(p * 1.0);
  else if (uForm == 3) r = baldacchino(p + vec3(0.0, 0.75, 0.0));
  else if (uForm == 4) r = monstrance(p);
  else r = organ(p);
  r.x *= uScale;
  return r;
}

vec2 map(vec3 p) {
  vec2 d = mapForm(p);
  if (uFloorOn > 0.5) {
    float f = p.y - uFloorY;
    if (f < d.x) d = vec2(f, -1.0);
  }
  return d;
}

vec3 normalAt(vec3 p, float t) {
  float e = max(0.0008, t * 0.0015);
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x + k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0;
  float t = 0.02;
  for (int i = 0; i < 28; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, k * h / t);
    t += clamp(h, 0.02, 0.4);
    if (res < 0.002 || t > 9.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float w = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.03 + 0.07 * float(i);
    occ += (h - map(p + n * h).x) * w;
    w *= 0.7;
  }
  return clamp(1.0 - occ * 2.2, 0.0, 1.0);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 background(vec3 rd, vec2 uv) {
  float up = rd.y * 0.5 + 0.5;
  vec2 q = uv - 0.5;
  float r = length(q * vec2(uRes.x / uRes.y, 1.0));
  vec3 c = mix(uBgA, uBgB, smoothstep(0.0, 1.0, up));
  if (uBg == 2) {
    // chapel: a soft high window glowing on the dark wall
    float win = exp(-pow(length((uv - vec2(0.22, 0.82)) * vec2(2.2, 1.0)) * 3.2, 2.0));
    c += uKeyCol * win * 0.25 * uKeyPow;
  }
  c *= 1.0 - smoothstep(0.3, 1.1, r) * 0.6;
  return c;
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 v = uInvProj * vec4(ndc, 1.0, 1.0);
  v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.0)).xyz);
  vec3 ro = uCamPos;
  float jitter = hash(gl_FragCoord.xy + fract(uTime) * 61.0);

  // ---- march (from a near distance so the camera can glide through ornament)
  float t = uNear;
  float trap = 0.0;
  bool hit = false;
  float tMax = 40.0;
  for (int i = 0; i < 256; i++) {
    if (i >= uSteps) break;
    vec2 d = map(ro + rd * t);
    if (abs(d.x) < 0.0006 * t) { hit = true; trap = d.y; break; }
    t += abs(d.x) * 0.9;
    if (t > tMax) break;
  }

  vec3 bg = background(rd, vUv);
  vec3 col;
  vec3 L = normalize(uKeyDir);
  float tHit = hit ? t : tMax;

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p, t);
    bool isCrystal = trap < -1.5;
    bool isPipe = trap >= 9.5;
    float pipeIdx = trap - 10.0;
    bool isFloor = trap < -0.5 && !isCrystal;
    float ao = mix(1.0, ambientOcclusion(p, n), uAO);
    vec3 albedo;
    float rough = uMat.x;
    float metal = uMat.y;
    if (isCrystal) {
      albedo = mix(uAlbedoB, vec3(1.0), 0.6);
      rough = 0.05;
      metal = 0.0;
    } else if (isFloor) {
      albedo = uStone;
      rough = 0.35 - uMat.w * 0.25;
      metal = 0.0;
    } else {
      float tt = isPipe ? 0.85 : clamp(pow(clamp(trap, 0.0, 4.0) * 0.25, uMat.z), 0.0, 1.0);
      albedo = mix(uAlbedoA, uAlbedoB, tt);
    }
    vec3 V = -rd;
    float shin = mix(180.0, 8.0, rough);
    vec3 F0 = mix(vec3(0.04), albedo, metal);
    vec3 kd = albedo * (1.0 - metal);

    // key light — the Caravaggio window
    float sh = uKeyPow > 0.001 ? softShadow(p + n * 0.003, L, uShadowK) : 0.0;
    float dif = max(dot(n, L), 0.0) * sh;
    vec3 H = normalize(L + V);
    float fres = pow(1.0 - max(dot(n, V), 0.0), 5.0);
    vec3 spec = (F0 + (1.0 - F0) * fres) * pow(max(dot(n, H), 0.0), shin) * (shin + 8.0) / 25.0;
    col = (kd * dif + spec * dif) * uKeyCol * uKeyPow;

    // note lights — candles moving among the forms
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (i >= uNumLights) break;
      vec3 l = uLP[i].xyz - p;
      float d2 = dot(l, l);
      vec3 ld = l * inversesqrt(d2);
      float att = uLC[i].w / (1.0 + d2 * uFalloff);
      float nd = max(dot(n, ld), 0.0);
      vec3 hh = normalize(ld + V);
      col += uLC[i].rgb * att * (kd * nd + (F0 + (1.0 - F0) * fres) * pow(max(dot(n, hh), 0.0), shin) * nd * (shin + 8.0) / 25.0);
    }

    // what polished metal reflects: the dim room, and the glow of the window
    vec3 Rf = reflect(rd, n);
    vec3 env = background(Rf, vUv) * 1.5 + uFillCol * uAmbient * 0.6
             + uKeyCol * uKeyPow * (0.08 * pow(max(dot(Rf, L), 0.0), 3.0) + 0.6 * pow(max(dot(Rf, L), 0.0), 40.0));
    float envOcc = mix(1.0, softShadow(p + n * 0.004, Rf, 6.0), 0.6) * ao;
    col += env * (F0 + (1.0 - F0) * fres) * envOcc * mix(1.0, 0.35, rough);

    // a little fill so the shadows are deep but not dead
    col += kd * uFillCol * uAmbient * ao * (0.5 + 0.5 * n.y);
    col += F0 * uFillCol * uAmbient * 0.3 * ao * fres;

    // the crystal lunette glows from within, brighter with the music
    if (isCrystal) col += uKeyCol * (0.6 + uMorph.x * 1.4) * (0.5 + 0.5 * pow(1.0 - abs(dot(n, V)), 2.0));

    // the organ speaks: a sounding pipe glows at its mouth and warms along its body
    if (isPipe) {
      int pi = int(pipeIdx + 0.5);
      float g = 0.0;
      for (int k = 0; k < ${PIPES}; k++) if (k == pi) g = uPipe[k];
      float mouthY = -1.15 + 0.12;
      float band = exp(-pow((p.y - mouthY) * 14.0, 2.0)) * 3.0 + 0.25 * smoothstep(mouthY + 1.5, mouthY, p.y);
      col += uKeyCol * g * band * 2.5;
    }

    // atmospheric depth
    float fogAmt = 1.0 - exp(-t * uFog * 0.06);
    col = mix(col, bg, fogAmt);
  } else {
    col = bg;
  }

  // ---- god rays: light scattered in the dusty air of the chapel
  if (uGod > 0.001 && uKeyPow > 0.001) {
    float span = min(tHit, 14.0);
    const int GS = 14;
    float acc = 0.0;
    float g = 0.55;
    float cosT = dot(rd, L);
    float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosT, 1.5);
    for (int i = 0; i < GS; i++) {
      float s = (float(i) + jitter) / float(GS) * span;
      vec3 q = ro + rd * s;
      // a cheap hard shadow toward the window
      float vis = 1.0;
      float tt = 0.05;
      for (int j = 0; j < 10; j++) {
        float h = map(q + L * tt).x;
        if (h < 0.004) { vis = 0.0; break; }
        tt += max(h, 0.08);
        if (tt > 8.0) break;
      }
      acc += vis;
    }
    acc /= float(GS);
    col += uKeyCol * uKeyPow * acc * min(phase, 6.0) * uGod * 0.006 * span * (0.4 + uFog);
  }

  // ---- halos of the note lights in the air (occluded by what is in front)
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uNumLights) break;
    vec3 lp = uLP[i].xyz;
    float tl = clamp(dot(lp - ro, rd), 0.0, tHit);
    vec3 cp = ro + rd * tl;
    float d = length(cp - lp);
    float sz = uLP[i].w;
    float core = sz * sz / (d * d + sz * sz * 0.02);
    float halo = exp(-d * d / (sz * sz * 9.0));
    col += uLC[i].rgb * uLC[i].w * (core * 0.05 + halo * 0.12 * uHalo) * (0.5 + uFog);
  }

  // alpha carries the hit distance so the dust can be hidden behind the architecture
  oColor = vec4(max(col, 0.0), hit ? t : 1e4);
}
`;

/** Bilinear upscale of the half-resolution raymarch with a touch of sharpening. */
export const UPSCALE_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uSharpen;
void main() {
  vec4 c4 = texture(uSrc, vUv);
  vec3 c = c4.rgb;
  vec3 b = (texture(uSrc, vUv + vec2(uTexel.x, 0.0)).rgb + texture(uSrc, vUv - vec2(uTexel.x, 0.0)).rgb +
            texture(uSrc, vUv + vec2(0.0, uTexel.y)).rgb + texture(uSrc, vUv - vec2(0.0, uTexel.y)).rgb) * 0.25;
  oColor = vec4(max(c + (c - b) * uSharpen, 0.0), 1.0);
}
`;
