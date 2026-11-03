/** Shared GLSL chunks: hashing, value/simplex noise, and the canvas "tooth" (ground texture). */

export const NOISE_GLSL = /* glsl */ `
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }

float vnoise1(float x) { float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(hash11(i), hash11(i + 1.0), u); }

float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec2 curl2(vec2 p, float t) {
  float e = 0.01;
  float n1 = snoise(p + vec2(0.0, e) + t), n2 = snoise(p - vec2(0.0, e) + t);
  float n3 = snoise(p + vec2(e, 0.0) - t), n4 = snoise(p - vec2(e, 0.0) - t);
  return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}
`;

/**
 * Ground texture — the physical surface the paint sits on.
 * c: canvas units (x ∈ [0, aspect], y ∈ [0, 1]); density: threads per canvas height.
 * Returns relief 0–1 (1 = top of a thread / paper peak). Used both for the visible ground
 * and for dry-brush "tooth" catching inside the stroke shader, so they always agree.
 */
export const GROUND_GLSL = /* glsl */ `
float weave(vec2 c, float density, float irregular) {
  vec2 p = c * density;
  p += irregular * (vec2(vnoise(c * 9.0), vnoise(c * 9.0 + 31.0)) - 0.5) * 1.4;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float rowJ = hash11(cell.y * 1.37) * 0.5 + 0.5;
  float colJ = hash11(cell.x * 2.11 + 7.0) * 0.5 + 0.5;
  float warp = 1.0 - pow(abs(f.x * 2.0 - 1.0), 1.6 + colJ);
  float weft = 1.0 - pow(abs(f.y * 2.0 - 1.0), 1.6 + rowJ);
  float over = mod(cell.x + cell.y, 2.0);
  float h = over > 0.5 ? warp * (0.55 + 0.45 * sin(f.y * 3.14159)) : weft * (0.55 + 0.45 * sin(f.x * 3.14159));
  h *= 0.75 + 0.25 * mix(rowJ, colJ, over);
  float fiber = vnoise(c * density * vec2(6.0, 0.7)) * vnoise(c * density * vec2(0.7, 6.0));
  return clamp(h * 0.85 + fiber * 0.25, 0.0, 1.0);
}

float paperTooth(vec2 c, float density) {
  float n = fbm(c * density * 0.35) * 0.55 + vnoise(c * density * 1.3) * 0.3 + vnoise(c * density * 3.1) * 0.15;
  float cells = 1.0 - smoothstep(0.0, 0.6, length(fract(c * density * 0.6 + vnoise(c * density * 0.2)) - 0.5));
  return clamp(n * 0.85 + cells * 0.2, 0.0, 1.0);
}

float gessoTooth(vec2 c, float density) {
  // smooth panel; long, soft brush marks left by the gesso application
  vec2 q = vec2(c.x * 1.1 + snoise(c * 0.7) * 0.35, c.y * density * 0.045 + snoise(c * 1.3) * 0.6);
  float streak = vnoise(vec2(q.x * 0.7, q.y)) * 0.6 + vnoise(vec2(q.x * 0.25, q.y * 2.7)) * 0.4;
  float fine = vnoise(c * density * 1.4);
  return clamp(0.5 + (streak - 0.5) * 0.4 + (fine - 0.5) * 0.12, 0.0, 1.0);
}

// pxPerUnit: screen pixels per canvas unit — used to fade detail that would alias into moiré
float groundToothRaw(vec2 c, int kind, float density) {
  if (kind == 0) return weave(c, density, 0.35);
  if (kind == 1) return weave(c, density * 0.45, 0.8);
  if (kind == 2) return paperTooth(c, density);
  if (kind == 3) return gessoTooth(c, density);
  return 0.5 + (vnoise(c * density * 2.0) - 0.5) * 0.08;
}
float groundTooth(vec2 c, int kind, float density, float pxPerUnit) {
  float eff = kind == 1 ? density * 0.45 : density;
  float pxPerThread = pxPerUnit / max(eff, 1.0);
  float aa = smoothstep(1.8, 4.0, pxPerThread);
  float t = groundToothRaw(c, kind, density);
  float soft = 0.5 + (vnoise(c * pxPerUnit * 0.12) - 0.5) * 0.14;
  return mix(soft, t, kind == 3 || kind == 4 ? 1.0 : aa);
}
`;

export const FULLSCREEN_VERT = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
