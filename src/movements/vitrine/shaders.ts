/**
 * Vitrine — living matter.
 * A GPU particle simulation constrained to a crumpled implicit surface (a domain-warped sphere with
 * ridged folds). Particles flow along the surface (curl noise projected on the tangent plane), are
 * held in several shells for depth, and a loose fraction escapes as smoke. They are drawn as short
 * streaks along their motion — a combed, fibrous fabric — lit by the surface normal, with luminous
 * veins along the fold crests and wherever notes land.
 */

export const MAX_SOURCES = 16;

export const NOISE = /* glsl */ `
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
vec3 curl3(vec3 p) {
  const float e = 0.1;
  vec3 o1 = vec3(31.4, 0.0, 0.0), o2 = vec3(0.0, 47.2, 0.0);
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  float x0 = snoise3(p), y0 = snoise3(p + o1), z0 = snoise3(p + o2);
  return vec3((snoise3(p + o2 + dy) - z0) - (snoise3(p + o1 + dz) - y0),
              (snoise3(p + dz) - x0) - (snoise3(p + o2 + dx) - z0),
              (snoise3(p + o1 + dx) - y0) - (snoise3(p + dy) - x0)) / e;
}
float hh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

/** The crumpled form: a sphere displaced by domain-warped ridged noise (sharp folds). */
export const FIELD = /* glsl */ `
uniform float uTime;
uniform float uR;
uniform float uAmp;
uniform float uFreq;
uniform float uWarp;
uniform float uEvolve;
uniform vec3 uStretch;
uniform float uLobe;
uniform float uLobeScale;
uniform float uBend;
uniform float uBendFreq;

/** sideways displacement that bends the mass into a twisting, snaking body (depends on x only) */
vec3 bendOff(float x) {
  return vec3(0.0, sin(x * uBendFreq + uTime * uEvolve * 3.0) * uBend, cos(x * uBendFreq * 0.8 + 1.7 + uTime * uEvolve * 2.0) * uBend * 0.8);
}

float crestOf(vec3 p) {
  vec3 q = p * uFreq + vec3(0.0, uTime * uEvolve, uTime * uEvolve * 0.6);
  vec3 w = vec3(snoise3(q * 0.5 + 1.7), snoise3(q * 0.5 + 9.2), snoise3(q * 0.5 + 4.4)) * uWarp;
  return 1.0 - abs(snoise3(q + w));
}
float disp(vec3 p) {
  vec3 q = p * uFreq + vec3(0.0, uTime * uEvolve, uTime * uEvolve * 0.6);
  vec3 w = vec3(snoise3(q * 0.5 + 1.7), snoise3(q * 0.5 + 9.2), snoise3(q * 0.5 + 4.4)) * uWarp;
  float r0 = snoise3(q + w);
  float r1 = 1.0 - sqrt(r0 * r0 + 0.03);             // rounded crests: billows, not spikes
  float r2 = snoise3(q * 2.3 + w * 1.6) * 0.3;
  // large lobes give the mass an irregular, cloud-like silhouette
  // large lobes — the mass is a pile of folded billows, not a ball
  vec3 lp = p * uLobeScale + vec3(11.3, 2.1, 5.7) + vec3(0.0, uTime * uEvolve * 0.4, 0.0);
  float big = snoise3(lp * 0.3);
  float mid = snoise3(lp * 0.72 + 4.0);
  float bulge = smoothstep(-0.35, 0.75, snoise3(lp * 0.55 + 9.0));   // rounded protrusions
  float lobe = big * 0.55 + mid * 0.4 + bulge * 0.55 - 0.2;
  return (r1 * r1 - 0.45 + r2) * uAmp + lobe * uLobe;
}
float field(vec3 p) {
  p -= bendOff(p.x);
  vec3 s = p / uStretch;
  return length(s) - uR - disp(p);
}
`;

export const NORMAL_SHADER = /* glsl */ `
${NOISE}
${FIELD}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 p = texture2D(texturePosition, uv).xyz;
  const float e = 0.03;
  float f = field(p);
  vec3 n = vec3(field(p + vec3(e, 0.0, 0.0)) - f, field(p + vec3(0.0, e, 0.0)) - f, field(p + vec3(0.0, 0.0, e)) - f);
  n = normalize(n + 1e-6);
  gl_FragColor = vec4(n, crestOf(p - bendOff(p.x)));
}
`;

export const VELOCITY_SHADER = /* glsl */ `
uniform float uDt;
uniform float uFlow;
uniform float uFlowScale;
uniform float uDamping;
uniform float uWisps;
uniform int uNumSrc;
uniform vec4 uSrcPos[${MAX_SOURCES}];
uniform vec4 uSrcForce[${MAX_SOURCES}];
${NOISE}
uniform float uTime;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);
  if (pos.w < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 n = texture2D(textureNormal, uv).xyz;
  bool wisp = hh(uv * 97.1 + 5.0) < uWisps;
  // the flow: a slow curl-noise current, combed along the surface for the body of the matter
  vec3 cu = curl3(pos.xyz * uFlowScale + vec3(uTime * 0.04, 0.0, uTime * 0.02));
  vec3 want = (wisp ? cu * 0.6 + n * 0.15 + vec3(0.0, 0.12, 0.0) : cu - n * dot(cu, n)) * uFlow;
  for (int i = 0; i < ${MAX_SOURCES}; i++) {
    if (i >= uNumSrc) break;
    vec3 d = pos.xyz - uSrcPos[i].xyz;
    float r = uSrcForce[i].z;
    want += n * uSrcForce[i].x * exp(-dot(d, d) / (r * r)) * 0.8;   // the surface swells under a note
  }
  vec3 v = mix(vel.xyz, want, 1.0 - exp(-uDamping * uDt));
  gl_FragColor = vec4(v, 1.0);
}
`;

export const POSITION_SHADER = /* glsl */ `
uniform float uDt;
uniform float uSpawned;
uniform vec3 uBirth;
uniform float uBirthSpread;
uniform float uScatter;
uniform float uStick;
uniform float uThick;
uniform float uWisps;
uniform float uWispReach;
${NOISE}
${FIELD}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  float rank = hh(uv * 733.1 + 0.37);
  if (rank >= uSpawned) { pos.w = 0.0; gl_FragColor = pos; return; }
  if (pos.w < 0.5) {
    // born where the music lands (or, for a share of the matter, anywhere on the form)
    vec3 r = vec3(hh(uv * 13.1), hh(uv * 71.7), hh(uv * 29.3)) - 0.5;
    if (hh(uv * 19.7 + 2.0) < uScatter) {
      float z = r.x * 2.0, ang = r.y * 6.2831853 + 3.14159;
      float sxy = sqrt(max(1.0 - z * z, 0.0));
      vec3 bp = vec3(sxy * cos(ang), z, sxy * sin(ang)) * uStretch * (uR + 0.3);
      gl_FragColor = vec4(bp + bendOff(bp.x), 1.0);
    } else {
      gl_FragColor = vec4(uBirth + r * uBirthSpread, 1.0);
    }
    return;
  }
  vec3 n = texture2D(textureNormal, uv).xyz;
  float a = hh(uv * 311.7), c = hh(uv * 53.3 + 9.0);
  bool wisp = hh(uv * 97.1 + 5.0) < uWisps;
  // each particle lives in its own shell: deeper layers give the matter its thickness
  float stream = smoothstep(0.05, 0.6, snoise3(normalize(pos.xyz) * 1.4 + 7.7));
  float layer = wisp ? 0.04 + c * c * uWispReach * (0.15 + 1.6 * stream) : 0.004 + uThick * 0.12 * a;
  float f = field(pos.xyz);
  pos.xyz += vel * uDt;
  // constraint toward the shell (no spring, so the fibres comb along the surface instead of bouncing)
  pos.xyz -= n * (f - layer) * min(1.0, uStick * uDt * (wisp ? 0.08 : 1.0));
  gl_FragColor = pos;
}
`;

export const GLOW_SHADER = /* glsl */ `
uniform float uDt;
uniform float uDecay;
uniform int uNumSrc;
uniform vec4 uSrcPos[${MAX_SOURCES}];
uniform vec4 uSrcForce[${MAX_SOURCES}];
uniform vec4 uSrcCol[${MAX_SOURCES}];
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 g = texture2D(textureGlow, uv);
  vec4 pos = texture2D(texturePosition, uv);
  g.rgb *= exp(-uDt / max(uDecay, 0.05));
  if (pos.w > 0.5) {
    for (int i = 0; i < ${MAX_SOURCES}; i++) {
      if (i >= uNumSrc) break;
      vec3 d = pos.xyz - uSrcPos[i].xyz;
      float r = uSrcForce[i].z * 1.3;
      float fall = exp(-dot(d, d) / (r * r));
      g.rgb += uSrcCol[i].rgb * uSrcCol[i].a * fall * uDt * 3.0;
    }
  } else {
    g = vec4(0.0);
  }
  g.rgb = min(g.rgb, vec3(1.2));
  gl_FragColor = g;
}
`;

/** Streaks and dots. `END` marks the tail vertex of a streak; DOTS renders one point per particle. */
export const FIBRE_VERT = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tNrm;
uniform sampler2D tGlow;
uniform float uSegLen;
uniform float uSpawned;
uniform vec3 uKeyDir;
uniform float uKey;
uniform float uAmbient;
uniform float uRim;
uniform vec3 uAlbedo;
uniform float uSheen;
uniform float uCrestGlow;
uniform vec3 uVeinA;
uniform vec3 uVeinB;
uniform vec3 uVeinC;
uniform float uWisps;
uniform float uThick;
uniform float uOpacity;
uniform float uDotSize;
uniform float uTime;
attribute vec2 ref;
attribute float aEnd;
varying vec3 vCol;
varying float vA;
varying float vSoft;
float hq(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec4 pos = texture2D(tPos, ref);
  if (pos.w < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
  vec3 vel = texture2D(tVel, ref).xyz;
  vec4 nc = texture2D(tNrm, ref);
  vec3 glow = texture2D(tGlow, ref).rgb;
  vec3 n = nc.xyz;
  float crest = nc.w;
  float a = hq(ref * 311.7), b = hq(ref * 97.1 + 5.0), c = hq(ref * 53.3 + 9.0);
  bool wisp = b < uWisps;

  vec3 tv = wisp ? vel : vel - n * dot(vel, n);
  float sp = length(tv);
  vec3 dir = sp > 1e-4 ? tv / sp : vec3(0.0, 1.0, 0.0);
  float len = uSegLen * (0.6 + 0.8 * a) * clamp(sp * 4.0, 0.5, 1.8);
  vec3 p = pos.xyz - dir * len * aEnd;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  #ifdef DOTS
  // smoke is soft and large; dust on the body is fine
  gl_PointSize = wisp ? uDotSize * (16.0 + 36.0 * c) * 9.0 / max(-mv.z, 0.5) : uDotSize * (0.6 + c) * 9.0 / max(-mv.z, 0.5);
  vSoft = wisp ? 1.0 : 0.0;
  #else
  vSoft = 0.0;
  #endif

  // lighting: soft wrapped key, sheen of combed fibres, cool rim
  vec3 V = normalize(-mv.xyz);
  vec3 Nv = normalize((viewMatrix * vec4(n, 0.0)).xyz);
  vec3 Lv = normalize((viewMatrix * vec4(uKeyDir, 0.0)).xyz);
  float wrap = max(dot(Nv, Lv) * 0.6 + 0.4, 0.0);
  float diff = wrap * wrap;
  vec3 Tv = normalize((viewMatrix * vec4(dir, 0.0)).xyz);
  float th = dot(Tv, normalize(Lv + V));
  float sheen = pow(sqrt(max(1.0 - th * th, 0.0)), 24.0) * uSheen;           // anisotropic, like hair
  float rim = pow(1.0 - abs(dot(Nv, V)), 3.0) * uRim;
  float layer = wisp ? 1.0 : 1.0 - a * a;
  float ao = mix(0.3, 1.0, layer) * mix(0.55, 1.0, crest);
  vec3 body = uAlbedo * (uAmbient + diff * uKey) * ao + vec3(sheen) * uKey * 0.25 * ao + vec3(0.55, 0.6, 0.7) * rim * 0.15;

  // veins of light along the fold crests, coloured by region
  float region = hq(floor(pos.xz * 1.3 + pos.y * 0.7) + 3.1);
  float rr = fract(region + snoiseless(pos.xyz));
  vec3 vein = rr < 0.45 ? uVeinA : rr < 0.75 ? uVeinB : uVeinC;
  float crestLine = smoothstep(0.9, 0.995, crest) * (0.5 + 0.5 * sin(uTime * 0.4 + region * 20.0));
  vec3 emis = vein * crestLine * uCrestGlow * 0.15 + glow * 0.22;

  float alpha = uOpacity * (wisp ? 0.08 : 0.7);
  if (wisp) alpha *= 0.15 + 0.85 * smoothstep(0.35, 1.2, length(pos.xyz) - 1.0);
  #ifndef DOTS
  if (wisp) alpha = 0.0;   // smoke is drawn as soft sprites only
  #endif
  // particles fade in as they are born and out as the cloud dissolves
  float rank = hq(ref * 733.1 + 0.37);
  alpha *= smoothstep(uSpawned, uSpawned - 0.015, rank);
  if (wisp) body = mix(vec3(0.15, 0.16, 0.18), mix(uVeinC, uVeinB, c) * 0.35, 0.18);
  vCol = body * alpha + emis * alpha * 1.5;
  vA = alpha;
}
`.replace(
  'float rr = fract(region + snoiseless(pos.xyz));',
  'float rr = fract(region + sin(dot(pos.xyz, vec3(1.7, 2.3, 1.1))) * 0.35);',
);

export const FIBRE_FRAG = /* glsl */ `
varying vec3 vCol;
varying float vA;
varying float vSoft;
void main() {
  float k = 1.0;
  #ifdef DOTS
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  if (r2 > 1.0) discard;
  k = vSoft > 0.5 ? exp(-r2 * 2.5) * (1.0 - r2) : 1.0;
  #endif
  gl_FragColor = vec4(vCol * k, vA * k);
}
`;
