/**
 * Symbolism — GPGPU particle visions.
 * Positions, velocities and colours of every particle live in float textures and are simulated on
 * the GPU each frame (GPUComputationRenderer). Particles are drawn toward a "vision" (an eye, a
 * flower, a halo, a galaxy, a knot…), stirred by 3D curl noise, burst apart and swirled by notes,
 * and dyed in Scriabin's colours.
 */

export const MAX_SOURCES = 16;

const NOISE3 = /* glsl */ `
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
  // curl of a noise vector potential ψ = (n(p), n(p+o1), n(p+o2)) — divergence-free flow
  const float e = 0.1;
  vec3 o1 = vec3(31.4, 0.0, 0.0), o2 = vec3(0.0, 47.2, 0.0);
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  float x0 = snoise3(p), y0 = snoise3(p + o1), z0 = snoise3(p + o2);
  float dzdy = snoise3(p + o2 + dy) - z0;
  float dydz = snoise3(p + o1 + dz) - y0;
  float dxdz = snoise3(p + dz) - x0;
  float dzdx = snoise3(p + o2 + dx) - z0;
  float dydx = snoise3(p + o1 + dx) - y0;
  float dxdy = snoise3(p + dy) - x0;
  return vec3(dzdy - dydz, dxdz - dzdx, dydx - dxdy) / e;
}
float h11(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

const SHAPES = /* glsl */ `
uniform float uPetals;
uniform float uKnotQ;

vec3 shapeEye(float h1, float h2, float h3, float t) {
  // Redon's floating eye: the eyeball, its iris and pupil, and a crown of lashes
  float r = 1.5;
  if (h1 < 0.5) {
    float z = mix(-1.0, 1.0, h2);
    float a = h3 * 6.2831853;
    float s = sqrt(1.0 - z * z);
    return vec3(s * cos(a), s * sin(a), z) * r;
  } else if (h1 < 0.86) {
    float a = h2 * 6.2831853;
    float rr = mix(0.28, 0.82, sqrt(h3));
    float zz = sqrt(max(r * r - rr * rr, 0.0)) + 0.06;
    return vec3(cos(a) * rr, sin(a) * rr, zz);
  } else {
    float a = mix(0.25, 2.9, h2);
    float l = h3 * 1.2;
    vec3 rim = vec3(cos(a) * 1.05, sin(a) * 0.95, 1.05);
    vec3 dir = normalize(vec3(cos(a) * 1.2, sin(a) * 1.6 + 0.3, 0.7));
    float wave = sin(t * 1.3 + a * 5.0) * 0.06 * l;
    return rim + dir * l + vec3(0.0, wave, 0.0);
  }
}

vec3 shapeFlower(float h1, float h2, float h3, float t) {
  if (h1 < 0.8) {
    float th = h2 * 6.2831853;
    float k = uPetals;
    float petal = pow(abs(cos(k * th * 0.5)), 0.6);
    float r = petal * 1.9 * sqrt(h3);
    float cup = r * r * 0.28 + sin(th * k) * 0.05;
    float sway = sin(t * 0.6 + th) * 0.05 * r;
    return vec3(cos(th) * r, 0.55 + cup + sway, sin(th) * r);
  } else if (h1 < 0.88) {
    float z = mix(-1.0, 1.0, h2);
    float a = h3 * 6.2831853;
    float s = sqrt(1.0 - z * z);
    return vec3(s * cos(a), z, s * sin(a)) * 0.28 + vec3(0.0, 0.65, 0.0);
  } else {
    float y = mix(0.55, -2.1, h2);
    float a = h3 * 6.2831853;
    return vec3(sin(y * 1.3) * 0.18 + cos(a) * 0.04, y, sin(a) * 0.04);
  }
}

vec3 shapeHalo(float h1, float h2, float h3, float t) {
  // "Vers la flamme": a radiant sun of rays around a burning core
  if (h1 < 0.3) {
    float z = mix(-1.0, 1.0, h2);
    float a = h3 * 6.2831853;
    float s = sqrt(1.0 - z * z);
    float rr = 0.55 * pow(h1 / 0.3, 0.33);
    return vec3(s * cos(a), z, s * sin(a)) * rr;
  }
  float n = 64.0;
  float ray = floor(h2 * n);
  float z = mix(-1.0, 1.0, fract(ray * 0.618034));
  float a = ray * 2.39996;
  float s = sqrt(1.0 - z * z);
  vec3 dir = vec3(s * cos(a), z, s * sin(a));
  float len = 0.6 + (1.4 + 0.5 * sin(t * 2.0 + ray)) * h3;
  return dir * len;
}

vec3 shapeGalaxy(float h1, float h2, float h3, float t) {
  if (h1 < 0.15) {
    float z = mix(-1.0, 1.0, h2);
    float a = h3 * 6.2831853;
    float s = sqrt(1.0 - z * z);
    return vec3(s * cos(a), z * 0.5, s * sin(a)) * 0.45 * pow(h1 / 0.15, 0.5);
  }
  float arm = floor(h3 * 3.0);
  float r = 0.2 + 2.2 * pow(h2, 0.7);
  float spread = (h11(vec2(h1, h2) * 91.7) - 0.5) * 0.5 / (0.5 + r);
  float a = arm * 2.0943951 + log(r + 0.3) * 2.6 + spread + t * 0.05;
  float y = (h11(vec2(h2, h3) * 57.1) - 0.5) * 0.18 * (1.2 - r * 0.3);
  return vec3(cos(a) * r, y, sin(a) * r);
}

vec3 shapeKnot(float h1, float h2, float h3, float t) {
  // the mystic knot: a (2, q) torus knot whose q follows the harmony
  float th = h1 * 6.2831853;
  float p = 2.0;
  float q = uKnotQ;
  float r = cos(q * th) + 2.2;
  vec3 c = vec3(r * cos(p * th), -sin(q * th), r * sin(p * th)) * 0.62;
  vec3 off = vec3(h2 - 0.5, h3 - 0.5, h11(vec2(h2, h3) * 13.1) - 0.5) * 0.28;
  return c + off;
}

vec3 shapeNebula(float h1, float h2, float h3, float t) {
  float z = mix(-1.0, 1.0, h2);
  float a = h3 * 6.2831853;
  float s = sqrt(1.0 - z * z);
  return vec3(s * cos(a), z * 0.7, s * sin(a)) * 2.8 * pow(h1, 0.4);
}

vec3 shapeOf(float id, vec2 uv, float t) {
  float h1 = h11(uv * 913.1 + 0.1);
  float h2 = h11(uv * 517.3 + 7.7);
  float h3 = h11(uv * 271.9 + 3.3);
  if (id < 0.5) return shapeEye(h1, h2, h3, t);
  if (id < 1.5) return shapeFlower(h1, h2, h3, t);
  if (id < 2.5) return shapeHalo(h1, h2, h3, t);
  if (id < 3.5) return shapeGalaxy(h1, h2, h3, t);
  if (id < 4.5) return shapeKnot(h1, h2, h3, t);
  return shapeNebula(h1, h2, h3, t);
}
`;

export const VELOCITY_SHADER = /* glsl */ `
uniform float uTime;
uniform float uDt;
uniform float uShapeA;
uniform float uShapeB;
uniform float uMorph;
uniform float uCoherence;
uniform float uFlow;
uniform float uFlowScale;
uniform float uFlowSpeed;
uniform float uDamping;
uniform float uSize;
uniform float uSpin;
uniform int uNumSrc;
uniform vec4 uSrcPos[${MAX_SOURCES}];
uniform vec4 uSrcForce[${MAX_SOURCES}];  // x: burst, y: vortex, z: radius
${NOISE3}
${SHAPES}

vec3 targetOf(vec2 uv) {
  vec3 a = shapeOf(uShapeA, uv, uTime);
  vec3 b = shapeOf(uShapeB, uv, uTime);
  vec3 tp = mix(a, b, smoothstep(0.0, 1.0, uMorph)) * uSize;
  float c = cos(uSpin), s = sin(uSpin);
  return vec3(c * tp.x + s * tp.z, tp.y, -s * tp.x + c * tp.z);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  float personal = 0.6 + 0.8 * h11(uv * 77.7);

  vec3 target = targetOf(uv);
  vec3 acc = (target - pos.xyz) * uCoherence * personal;
  acc += curl3(pos.xyz * uFlowScale + vec3(0.0, uTime * uFlowSpeed, 0.0)) * uFlow * 0.18;

  for (int i = 0; i < ${MAX_SOURCES}; i++) {
    if (i >= uNumSrc) break;
    vec3 d = pos.xyz - uSrcPos[i].xyz;
    float r = uSrcForce[i].z;
    float f = exp(-dot(d, d) / (r * r));
    float len = length(d) + 1e-4;
    acc += d / len * uSrcForce[i].x * f * 3.0;                         // burst
    acc += cross(vec3(0.0, 1.0, 0.0), d) / len * uSrcForce[i].y * f * 2.0;  // vortex
  }
  vel = vel * exp(-uDamping * uDt) + acc * uDt;
  float sp = length(vel);
  if (sp > 12.0) vel *= 12.0 / sp;
  gl_FragColor = vec4(vel, 1.0);
}
`;

export const POSITION_SHADER = /* glsl */ `
uniform float uDt;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  pos.xyz += vel * uDt;
  gl_FragColor = pos;
}
`;

export const COLOR_SHADER = /* glsl */ `
uniform float uDt;
uniform float uFade;
uniform float uDye;
uniform vec3 uPal[4];
uniform vec3 uKeyCol;
uniform float uKeyTint;
uniform int uNumSrc;
uniform vec4 uSrcPos[${MAX_SOURCES}];
uniform vec4 uSrcForce[${MAX_SOURCES}];
uniform vec4 uSrcCol[${MAX_SOURCES}];
float hh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 col = texture2D(textureColor, uv);
  vec3 pos = texture2D(texturePosition, uv).xyz;
  // the resting colour: the palette, tinted by the colour of the current key
  float h = hh(uv * 331.7);
  vec3 base = h < 0.33 ? mix(uPal[0], uPal[1], h * 3.0) : h < 0.66 ? mix(uPal[1], uPal[2], (h - 0.33) * 3.0) : mix(uPal[2], uPal[3], (h - 0.66) * 3.0);
  base = mix(base, uKeyCol, uKeyTint * (0.3 + 0.7 * hh(uv * 17.3)));
  col.rgb = mix(col.rgb, base, clamp(uDt / max(uFade, 0.05), 0.0, 1.0));
  col.a = mix(col.a, 0.0, clamp(uDt * 1.5, 0.0, 1.0));
  for (int i = 0; i < ${MAX_SOURCES}; i++) {
    if (i >= uNumSrc) break;
    vec3 d = pos - uSrcPos[i].xyz;
    float r = uSrcForce[i].z * 1.4;
    float f = exp(-dot(d, d) / (r * r));
    float k = clamp(f * uDye * uSrcCol[i].a * uDt * 14.0, 0.0, 1.0);
    col.rgb = mix(col.rgb, uSrcCol[i].rgb, k);
    col.a = max(col.a, f * uSrcCol[i].a);
  }
  gl_FragColor = col;
}
`;

/** Particle sprites — read their position and colour from the simulation textures. */
export const POINTS_VERT = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tCol;
uniform float uSize;
uniform float uScale;
uniform float uTime;
uniform float uSparkle;
attribute vec2 ref;
varying vec4 vCol;
varying float vSpeed;
void main() {
  vec4 p = texture2D(tPos, ref);
  vec3 v = texture2D(tVel, ref).xyz;
  vec4 c = texture2D(tCol, ref);
  vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
  gl_Position = projectionMatrix * mv;
  float seed = fract(sin(dot(ref, vec2(12.9898, 78.233))) * 43758.5453);
  float tw = 1.0 + uSparkle * (sin(uTime * (2.0 + seed * 5.0) + seed * 60.0) * 0.5 + 0.5) * 1.5;
  gl_PointSize = clamp(uSize * (0.6 + 0.8 * seed) * uScale / max(-mv.z, 0.1) * (1.0 + c.a * 0.8), 0.5, 24.0);
  vSpeed = length(v);
  vCol = vec4(c.rgb, (0.55 + c.a * 1.6 + min(vSpeed * 0.08, 0.6)) * tw);
}
`;

export const POINTS_FRAG = /* glsl */ `
uniform float uBright;
uniform float uInk;
varying vec4 vCol;
varying float vSpeed;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0;
  if (r > 1.0) discard;
  float a = exp(-r * 2.0);
  if (uInk > 0.5) {
    // charcoal on paper: write how much light the pigment absorbs
    gl_FragColor = vec4((1.0 - vCol.rgb) * a * vCol.a * uBright * 0.08, 1.0);
  } else {
    gl_FragColor = vec4(vCol.rgb * a * vCol.a * uBright * 0.05, 1.0);
  }
}
`;

/** Ethereal background: a nebula sampled by view direction, so it turns with the camera. */
export const BACKGROUND_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform float uTime;
uniform int uMode;      // 0 nebula · 1 void · 2 paper · 3 dawn
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform vec3 uKeyCol;
uniform float uFog;
uniform float uAspect;
${NOISE3}
float fbm3(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * snoise3(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
void main() {
  vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.0)).xyz);
  vec2 q = vUv - 0.5; q.x *= uAspect;
  float vig = 1.0 - smoothstep(0.35, 1.2, length(q));
  vec3 col;
  if (uMode == 0) {
    float n1 = fbm3(rd * 2.2 + vec3(0.0, uTime * 0.01, 0.0));
    float n2 = fbm3(rd * 4.5 - vec3(uTime * 0.015, 0.0, 0.0) + n1);
    float neb = smoothstep(-0.2, 0.9, n1 + n2 * 0.6);
    col = vec3(0.004, 0.005, 0.012) + (mix(uTintA, uTintB, smoothstep(-0.4, 0.6, n2)) * neb * 0.22 + uKeyCol * pow(neb, 3.0) * 0.12) * uFog;
    float stars = pow(max(snoise3(rd * 180.0), 0.0), 18.0) * 3.0;
    col += vec3(stars);
    col *= 0.5 + 0.5 * vig;
  } else if (uMode == 1) {
    col = vec3(0.006, 0.006, 0.009) * vig + uKeyCol * 0.01 * uFog * vig;
  } else if (uMode == 2) {
    // toned paper for "les noirs"
    float grain = snoise3(vec3(vUv * vec2(uAspect, 1.0) * 400.0, 0.0)) * 0.012 + fbm3(vec3(vUv * 3.0, 1.0)) * 0.03;
    col = pow(vec3(0.86, 0.82, 0.74) + grain, vec3(2.2)) * (0.8 + 0.2 * vig);
  } else {
    float n = fbm3(rd * 1.5 + vec3(uTime * 0.005));
    vec3 a = pow(vec3(0.93, 0.86, 0.84), vec3(2.2));
    vec3 b = pow(vec3(0.74, 0.8, 0.9), vec3(2.2));
    col = mix(a, b, smoothstep(-0.3, 0.6, rd.y + n * 0.4)) * (0.85 + 0.15 * vig);
    col = mix(col, uKeyCol * 0.6 + col * 0.4, 0.08 * uFog);
  }
  oColor = vec4(col, 1.0);
}
`;

/** Trails: the particle layer accumulates and fades (temporal feedback), then sits over the background. */
export const ACCUM_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uPrev;
uniform sampler2D uNew;
uniform float uPersist;
void main() {
  vec3 prev = texture(uPrev, vUv).rgb;
  vec3 cur = texture(uNew, vUv).rgb;
  // normalised feedback: longer trails don't make the image brighter
  oColor = vec4(prev * uPersist + cur * (1.0 - uPersist) * 2.0, 1.0);
}
`;

export const COMPOSE_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uBg;
uniform sampler2D uAcc;
uniform float uInk;
void main() {
  vec3 bg = texture(uBg, vUv).rgb;
  vec3 acc = texture(uAcc, vUv).rgb;
  vec3 c = uInk > 0.5 ? bg * exp(-acc * 1.6) : bg + acc;
  oColor = vec4(c, 1.0);
}
`;
