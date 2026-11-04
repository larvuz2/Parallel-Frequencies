/**
 * Cuadro — raymarched living cloth.
 *
 * The body is a family of thin folded sheets: the zero-isosurface of a domain-warped 3D noise field,
 * thickened and clipped by a two-lobed envelope. That gives crumpled-cloth folds that overlap and
 * curl over themselves. A soft core sits inside, and light is gathered along each ray so the heart
 * glows through the gaps. Edges dissolve into a fine grainy dust.
 */
export const MAX_NOTES = 12;

const NOISE = /* glsl */ `
vec3 mod289v(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289v(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute4(vec4 x) { return mod289v(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise3(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v(i);
  vec4 p = permute4(permute4(permute4(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

export const RM_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 oColor;
${NOISE}

uniform vec2 uRes;
uniform float uTime;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform int uSteps;

// shape
uniform vec3 uLobeA; uniform vec3 uLobeB;
uniform float uRadA; uniform float uRadB;
uniform float uBridge;
uniform float uEnvNoise;
uniform float uSheetFreq;
uniform float uSheetTh;
uniform float uWarp;
uniform float uEvolve;
uniform float uLayers;
uniform float uCoreR;
uniform float uGrowth;
uniform float uSwell;
uniform float uTwist;

// look
uniform vec3 uOuter; uniform vec3 uInner; uniform vec3 uGlowCol; uniform vec3 uRimCol; uniform vec3 uSpeckCol; uniform vec3 uDustCol;
uniform float uDepthMix;
uniform vec3 uKeyDir; uniform vec3 uKeyCol;
uniform float uKey; uniform float uAmbient; uniform float uRim; uniform float uTrans; uniform float uGloss; uniform float uGrain;
uniform float uGlow; uniform float uHaze; uniform float uSpeck; uniform float uDust; uniform float uDustSize; uniform float uAO;

uniform int uNumNotes;
uniform vec4 uNoteP[${MAX_NOTES}];   // xyz, strength
uniform vec4 uNoteC[${MAX_NOTES}];   // rgb, radius

float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

/** the outer envelope: two lobes joined by a soft bridge, roughened by low-frequency noise */
float envelope(vec3 p) {
  float g = mix(0.18, 1.0, uGrowth);
  vec3 sA = vec3(1.0, 0.86, 0.78), sB = vec3(1.0, 0.9, 0.8);
  float a = length((p - uLobeA) / sA) - uRadA * g;
  float b = length((p - uLobeB) / sB) - uRadB * g;
  float e = smin(a, b, uBridge);
  e += snoise3(p * 0.55 + vec3(0.0, uTime * uEvolve * 0.3, 1.7)) * uEnvNoise * g;
  return e;
}

vec3 twist(vec3 p) {
  float a = p.x * uTwist;
  float c = cos(a), s = sin(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

float noteSwell(vec3 p) {
  float s = 0.0;
  for (int i = 0; i < ${MAX_NOTES}; i++) {
    if (i >= uNumNotes) break;
    vec3 d = p - uNoteP[i].xyz;
    s += uNoteP[i].w * exp(-dot(d, d) / (uNoteC[i].w * uNoteC[i].w));
  }
  return s;
}

/** returns distance (x), depth inside the envelope (y) and material: 0 sheet, 1 core (z) */
vec3 map(vec3 p) {
  float env = envelope(p);
  vec3 q = twist(p) * uSheetFreq;
  float t = uTime * uEvolve;
  vec3 w = vec3(snoise3(q * 0.45 + vec3(1.7, t, 0.0)), snoise3(q * 0.45 + vec3(9.2, 0.0, t)), snoise3(q * 0.45 + vec3(t, 4.4, 0.0)));
  vec3 qw = q + w * uWarp;
  float n = snoise3(qw + vec3(0.0, t * 0.6, 0.0));
  // several nested sheet families: the isosurfaces n = k / layers
  float nl = n * uLayers;
  float sheet = abs(nl - floor(nl + 0.5)) / uLayers;
  float th = uSheetTh * (1.0 + uSwell * noteSwell(p));
  float sd = (sheet - th) / (uSheetFreq * 1.9) ;
  // sheets fade out (thin away) toward the envelope, so the mass has a soft, frayed boundary
  float d = max(sd, env);
  // the core: a shrunk envelope inside
  float core = envelope(p * (1.0 / max(uCoreR, 0.05))) * uCoreR + 0.05;
  float mat = 0.0;
  if (core < d) { d = smin(d, core, 0.12); mat = 1.0; }
  return vec3(d * 0.75, -env, mat);
}

vec3 normalAt(vec3 p, float t) {
  float e = max(0.0015, t * 0.0012);
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x + k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 v = uInvProj * vec4(ndc, 1.0, 1.0);
  v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.0)).xyz);
  vec3 ro = uCamPos;
  float jitter = hash12(gl_FragCoord.xy + fract(uTime * 7.13) * 91.0);

  // bounding: the envelope fits inside a box; skip empty space quickly
  float t = 0.0;
  float tMax = 30.0;
  {
    vec3 bmin = min(uLobeA - uRadA * 1.6, uLobeB - uRadB * 1.6), bmax = max(uLobeA + uRadA * 1.6, uLobeB + uRadB * 1.6);
    vec3 inv = 1.0 / rd;
    vec3 t0 = (bmin - ro) * inv, t1 = (bmax - ro) * inv;
    vec3 tn = min(t0, t1), tf = max(t0, t1);
    float tin = max(max(tn.x, tn.y), tn.z), tout = min(min(tf.x, tf.y), tf.z);
    if (tout < max(tin, 0.0)) { oColor = vec4(0.0, 0.0, 0.0, 1e4); return; }
    t = max(tin, 0.0);
    tMax = tout;
  }

  bool hit = false;
  vec3 res = vec3(1.0);
  float glow = 0.0;
  vec3 noteGlow = vec3(0.0);
  float nearest = 1e9;
  for (int i = 0; i < 220; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * t;
    res = map(p);
    float d = res.x;
    nearest = min(nearest, d);
    // light gathered in the air between the folds, strongest deep inside (the glowing heart)
    float depth = clamp(res.y * 1.2, 0.0, 1.0);
    float stepLen = clamp(d, 0.02, 0.25);
    glow += exp(-max(d, 0.0) * 9.0) * depth * stepLen;
    for (int k = 0; k < ${MAX_NOTES}; k++) {
      if (k >= uNumNotes) break;
      vec3 dd = p - uNoteP[k].xyz;
      float r = uNoteC[k].w;
      noteGlow += uNoteC[k].rgb * uNoteP[k].w * exp(-dot(dd, dd) / (r * r)) * stepLen * 0.6;
    }
    if (d < 0.0012 * t) { hit = true; break; }
    t += d * (0.85 + 0.15 * jitter);
    if (t > tMax) break;
  }

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p, t);
    vec3 V = -rd;
    vec3 L = normalize(uKeyDir);
    float depth = clamp(res.y * uDepthMix, 0.0, 1.0);
    // colour: outer folds emerald, deeper inside rose; the core is fully inner
    vec3 base = mix(uOuter, uInner, res.z > 0.5 ? 1.0 : smoothstep(0.0, 1.0, depth));
    // velvet light
    float w = max(dot(n, L) * 0.5 + 0.5, 0.0);
    float ao = 1.0;
    if (uAO > 0.0) {
      float occ = 0.0;
      for (int k = 1; k <= 3; k++) { float hh = 0.06 * float(k); occ += (hh - map(p + n * hh).x); }
      ao = clamp(1.0 - occ * 3.5 * uAO, 0.25, 1.0);
    }
    float fres = pow(1.0 - abs(dot(n, V)), 2.4);
    col = base * (uAmbient + pow(w, 1.5) * uKey * uKeyCol) * ao;
    col += mix(base * 2.4, uRimCol, 0.5) * fres * uRim * (0.4 + 0.6 * w);
    float spec = pow(max(dot(n, normalize(L + V)), 0.0), 20.0);
    col += mix(vec3(1.0, 0.94, 0.9), base, 0.4) * spec * uGloss * uKey * ao;
    // light passing through thin sheets
    float back = pow(max(dot(-n, L), 0.0), 1.5) + pow(max(dot(rd, L), 0.0), 3.0) * 0.5;
    col += base * back * uTrans * (0.4 + fres);
    // fine velvet grain and copper specks
    float g1 = snoise3(p * 140.0), g2 = snoise3(p * 37.0 + 3.0);
    col *= 1.0 + (g1 * 0.5 + g2 * 0.5) * uGrain * 0.35;
    float speck = smoothstep(0.55, 0.95, snoise3(p * 60.0)) * smoothstep(0.1, 0.6, snoise3(p * 1.3 + 7.0));
    col += uSpeckCol * speck * uSpeck;
    alpha = 1.0;
  }
  // the glowing heart, between the folds
  col += uGlowCol * glow * uGlow * 0.6;
  col += noteGlow;
  // fine grainy dust where rays graze the body (soft frayed edges and haze)
  float halo = exp(-max(nearest, 0.0) * (14.0 / max(uDustSize, 0.05)));
  float grain = step(0.72, hash12(floor(gl_FragCoord.xy) + floor(uTime * 12.0) * 13.0));
  col += uDustCol * halo * (grain * 0.9 + 0.15) * uDust * (hit ? 0.25 : 1.0);
  col += uDustCol * halo * uHaze * 0.25;

  oColor = vec4(max(col, 0.0), hit ? t : 1e4);
}
`;

export const UPSCALE_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uSharpen;
void main() {
  vec3 c = texture(uSrc, vUv).rgb;
  vec3 b = (texture(uSrc, vUv + vec2(uTexel.x, 0.0)).rgb + texture(uSrc, vUv - vec2(uTexel.x, 0.0)).rgb +
            texture(uSrc, vUv + vec2(0.0, uTexel.y)).rgb + texture(uSrc, vUv - vec2(0.0, uTexel.y)).rgb) * 0.25;
  oColor = vec4(max(c + (c - b) * uSharpen, 0.0), 1.0);
}
`;
