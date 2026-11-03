import { GROUND_GLSL, NOISE_GLSL } from '../../../shaders/common';

/** Bakes the ground relief (canvas weave / paper / gesso) into a texture whenever it changes. */
export const GROUND_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${GROUND_GLSL}
in vec2 vUv;
uniform float uAspect;
uniform int uGround;
uniform float uGroundDensity;
uniform float uPxPerUnit;
out vec4 oColor;
void main() {
  vec2 c = vec2(vUv.x * uAspect, vUv.y);
  oColor = vec4(groundTooth(c, uGround, uGroundDensity, uPxPerUnit), 0.0, 0.0, 1.0);
}
`;

/**
 * Surface process pass — runs once per frame, ping-ponging the paint + height buffers.
 *  - touch smudging (pointers drag wet paint, push up ridges)
 *  - slow wet-paint drift along a curl-noise field (liquidity)
 *  - wet-on-wet bleeding
 *  - drying, relaxing relief, and the "canvas memory" fade
 */
export const PROCESS_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
in vec2 vUv;
uniform sampler2D uPaint;
uniform sampler2D uHeight;
uniform vec2 uTexel;
uniform float uAspect;
uniform float uTime;
uniform float uDt;
uniform float uFade;       // fraction to fade this frame (accumulated on CPU so half-floats stay exact)
uniform int uFadeMode;     // 0 → back to bare ground, 1 → into haze colour
uniform vec3 uHaze;
uniform float uDry;        // wetness lost this frame
uniform float uRelax;      // relief lost this frame
uniform float uFlow;
uniform float uFlowScale;
uniform float uBleed;
uniform vec4 uPtr[4];      // xy pos (uv), zw velocity (uv/s)
uniform vec2 uPtrP[4];     // radius (uv of height), strength
uniform float uEmissionDecay;

layout(location = 0) out vec4 oPaint;
layout(location = 1) out vec4 oHeight;

void main() {
  vec2 uv = vUv;
  vec4 h0 = texture(uHeight, uv);
  float wet = clamp(h0.g, 0.0, 1.0);

  vec2 disp = vec2(0.0);
  float push = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 P = uPtr[i];
    vec2 pp = uPtrP[i];
    if (pp.y <= 0.0) continue;
    vec2 d = (uv - P.xy) * vec2(uAspect, 1.0);
    float r = pp.x;
    float fall = exp(-dot(d, d) / (r * r));
    float resist = mix(0.25, 1.0, wet);
    disp += P.zw * uDt * fall * pp.y * resist;
    push += fall * min(length(P.zw * vec2(uAspect, 1.0)), 3.0) * pp.y;
  }

  if (uFlow > 0.0 && wet > 0.01) {
    vec2 c = curl2(uv * vec2(uAspect, 1.0) * uFlowScale, uTime * 0.03);
    disp += c * vec2(1.0 / uAspect, 1.0) * uFlow * wet * uDt * 0.0025;
  }

  vec2 suv = uv - disp;
  vec4 p = texture(uPaint, suv);
  vec4 h = texture(uHeight, suv);

  // wet-on-wet bleed: a tiny wetness-weighted blur
  float bl = uBleed * wet * uDt * 6.0;
  if (bl > 0.0005) {
    vec4 s = texture(uPaint, suv + vec2(uTexel.x, 0.0)) + texture(uPaint, suv - vec2(uTexel.x, 0.0)) +
             texture(uPaint, suv + vec2(0.0, uTexel.y)) + texture(uPaint, suv - vec2(0.0, uTexel.y));
    p = mix(p, s * 0.25, clamp(bl, 0.0, 0.5));
  }

  // touching wet paint piles it up a little and keeps it workable
  h.r += push * uDt * 0.35;
  h.g = min(1.0, h.g + push * uDt * 0.5);

  // drying / relaxing / emission fade
  h.g = max(0.0, h.g - uDry);
  h.r *= 1.0 - uRelax;
  h.b *= 1.0 - uEmissionDecay;

  // canvas memory
  if (uFade > 0.0) {
    if (uFadeMode == 0) { p *= 1.0 - uFade; h.r *= 1.0 - uFade; }
    else { p = mix(p, vec4(uHaze, 1.0), uFade); h.r *= 1.0 - uFade * 0.5; }
  }

  oPaint = p;
  oHeight = vec4(h.rgb, 1.0);
}
`;

/**
 * Composite — the paint is laid over the ground, lit as a physical relief surface:
 * the light rakes across impasto ridges and canvas weave, oil sheen glints on wet paint,
 * accents glow, and a soft atmospheric veil ties everything together.
 */
export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
in vec2 vUv;
uniform sampler2D uPaint;
uniform sampler2D uHeight;
uniform sampler2D uGroundTex;
uniform vec2 uTexel;
uniform float uAspect;
uniform float uTime;
uniform vec3 uGroundColor;
uniform float uGroundRelief;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform float uRelief;
uniform float uGloss;
uniform float uSheen;
uniform float uAmbient;
uniform float uShimmer;
uniform float uAccentGlow;
uniform vec3 uHaze;
uniform float uHazeAmt;
uniform float uSaturation;
uniform float uContrast;
uniform float uExposure;
uniform float uWarmth;
uniform float uBreath;

out vec4 oColor;

vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

float surfaceH(vec2 uv, float paintA) {
  float tooth = texture(uGroundTex, uv).r;
  float ph = texture(uHeight, uv).r;
  // thick paint buries the weave; thin scumbles let it read through
  return ph + tooth * uGroundRelief * (1.0 - smoothstep(0.0, 0.35, ph) * 0.85) * (1.0 - paintA * 0.35);
}

void main() {
  vec2 uv = vUv;
  vec2 c = vec2(uv.x * uAspect, uv.y);
  vec4 paint = texture(uPaint, uv);
  vec4 hs = texture(uHeight, uv);

  float tooth = texture(uGroundTex, uv).r;
  vec3 ground = uGroundColor * mix(0.9, 1.04, tooth);
  ground *= 1.0 + (vnoise(c * 3.0) - 0.5) * 0.05;                       // uneven priming
  vec3 col = paint.rgb + ground * (1.0 - clamp(paint.a, 0.0, 1.0));

  // ---- relief lighting ---------------------------------------------------------------------------
  vec2 e = uTexel * 1.25;
  vec2 ex = vec2(e.x, 0.0), ey = vec2(0.0, e.y);
  float hl = surfaceH(uv - ex, paint.a), hr = surfaceH(uv + ex, paint.a);
  float hd = surfaceH(uv - ey, paint.a), hu = surfaceH(uv + ey, paint.a);
  vec3 n = normalize(vec3((hl - hr) * uRelief, (hd - hu) * uRelief, 1.0));

  // living shimmer — light dances on the wet surface like on water
  if (uShimmer > 0.0) {
    float s = snoise(c * vec2(6.0, 22.0) + vec2(uTime * 0.15, uTime * 0.4));
    n.xy += vec2(s * 0.12, s * 0.05) * uShimmer * (0.3 + hs.g);
    n = normalize(n);
  }

  vec3 L = normalize(uLightDir);
  float diff = max(dot(n, L), 0.0);
  float flatDiff = max(L.z, 0.05);
  float shade = mix(1.0, diff / flatDiff, 0.85);
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(n, H), 0.0), uGloss) * uSheen * (0.25 + 0.75 * clamp(hs.g + paint.a * 0.4, 0.0, 1.0));

  // cavity occlusion from local relief
  float hc = hs.r;
  float hAvg = (texture(uHeight, uv + vec2(uTexel.x * 4.0, 0.0)).r + texture(uHeight, uv - vec2(uTexel.x * 4.0, 0.0)).r +
                texture(uHeight, uv + vec2(0.0, uTexel.y * 4.0)).r + texture(uHeight, uv - vec2(0.0, uTexel.y * 4.0)).r) * 0.25;
  float ao = clamp(1.0 - max(hAvg - hc, 0.0) * 1.2, 0.8, 1.0);

  vec3 lit = col * (uAmbient + (1.0 - uAmbient) * shade) * ao * uLightColor + spec * uLightColor;

  // glowing accents (the sun, sparkles) — feeds the bloom
  lit += paint.rgb * paint.rgb * hs.b * uAccentGlow * 0.9;

  // ---- grade -------------------------------------------------------------------------------------
  float luma = dot(lit, vec3(0.2126, 0.7152, 0.0722));
  lit = mix(vec3(luma), lit, uSaturation);
  lit = (lit - 0.5) * uContrast + 0.5;
  lit *= vec3(1.0 + uWarmth * 0.06, 1.0, 1.0 - uWarmth * 0.08);

  // atmospheric veil — Monet's envelope of air
  float veil = uHazeAmt * (0.75 + 0.25 * snoise(c * 0.8 + uTime * 0.01));
  lit = mix(lit, uHaze, clamp(veil, 0.0, 1.0));

  lit *= 1.0 + uBreath * 0.03 * sin(uTime * 0.35);
  oColor = vec4(toLinear(lit) * uExposure, 1.0);
}
`;

export const COPY_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
uniform sampler2D uSrc2;
void main() { o0 = texture(uSrc, vUv); o1 = texture(uSrc2, vUv); }
`;
