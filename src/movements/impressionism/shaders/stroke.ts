import { NOISE_GLSL } from '../../../shaders/common';

/**
 * Brush-stroke ribbon shader.
 *
 * Each instance is one short segment of a stroke (from one brush position to the next). Normals
 * are shared between consecutive segments so a stroke is a seamless ribbon. Across the ribbon
 * runs a bristle coordinate (-1…1); along it runs arc-length. From those two we derive:
 *   - bristle streaks (each hair carries its own amount of paint and its own tint)
 *   - paint-load breakup: as the brush runs dry, paint only catches on the ground's tooth
 *   - ragged, slightly feathered edges
 *   - wet-on-wet pickup: a fresh stroke drags some of the wet paint below it
 *
 * Output goes to two render targets at once (MRT):
 *   0: paint colour (premultiplied by coverage via blending)
 *   1: R = surface height (impasto), G = wetness, B = emission (glowing accents)
 */

export const STROKE_VERT = /* glsl */ `
precision highp float;
in vec3 position;          // x: t along segment (0/1), y: side (-1/1)
in vec4 aP;                // p0.xy, p1.xy (canvas units)
in vec4 aN;                // n0.xy, n1.xy (unit normals)
in vec4 aW;                // w0, w1 (half widths), u0, u1 (arc length)
in vec4 aL;                // load0, load1, seed, brushType
in vec4 aColA;             // rgb, opacity
in vec4 aColB;             // rgb, impasto thickness
in vec4 aX;                // bristles, pickup, emission, capStart (cap length in widths, 0 = none)

uniform float uAspect;

out vec2 vC;               // canvas position
out float vAcross;
out float vU;
out float vW;
out float vLoad;
out float vSeed;
out float vType;
out vec4 vColA;
out vec4 vColB;
out vec4 vX;
out float vCapD;           // distance before stroke start (in widths), <0 inside cap region

void main() {
  float t = position.x;
  float side = position.y;
  vec2 p0 = aP.xy, p1 = aP.zw;
  vec2 n0 = aN.xy, n1 = aN.zw;
  float w = mix(aW.x, aW.y, t);
  vec2 n = normalize(mix(n0, n1, t));
  vec2 p = mix(p0, p1, t);
  float u = mix(aW.z, aW.w, t);

  // start cap: extend the very first segment backwards so the stroke starts with a rounded, loaded blob
  float capLen = aX.w;
  vCapD = 0.0;
  if (capLen > 0.0 && t < 0.5) {
    vec2 dir = normalize(p1 - p0 + 1e-6 * vec2(1.0, 0.0));
    p -= dir * w * capLen;
    u -= w * capLen;
    vCapD = -capLen;
  }

  float pad = 1.2; // room for ragged edges
  p += n * side * w * pad;

  vC = p;
  vAcross = side * pad;
  vU = u;
  vW = max(w, 1e-5);
  vLoad = mix(aL.x, aL.y, t);
  vSeed = aL.z;
  vType = aL.w;
  vColA = aColA;
  vColB = aColB;
  vX = aX;
  gl_Position = vec4(p.x / uAspect * 2.0 - 1.0, p.y * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const STROKE_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}

in vec2 vC;
in float vAcross;
in float vU;
in float vW;
in float vLoad;
in float vSeed;
in float vType;
in vec4 vColA;
in vec4 vColB;
in vec4 vX;
in float vCapD;

uniform sampler2D uPrevPaint;
uniform sampler2D uPrevHeight;
uniform sampler2D uGroundTex;
uniform float uAspect;
uniform float uBristleContrast;
uniform float uEdgeRough;
uniform float uDryBrush;
uniform float uBrokenColor;
uniform float uHeightCarry;

layout(location = 0) out vec4 oPaint;
layout(location = 1) out vec4 oHeight;

void main() {
  int type = int(vType + 0.5);
  float a = vAcross;                 // -1.2 … 1.2
  float b = a * 0.5 + 0.5;           // 0 … 1 across the brush
  float along = vU / vW;             // arc length measured in brush widths
  float seed = vSeed * 97.0;
  float bristles = vX.x;

  // ---- brush profile across the stroke --------------------------------------------------------
  // 0 flat · 1 filbert · 2 round · 3 dab · 4 fan · 5 wash
  float edgeN = vnoise(vec2(along * 1.7 + seed, a > 0.0 ? 3.0 : 9.0)) * 0.65 + vnoise(vec2(along * 6.0 + seed, a > 0.0 ? 5.0 : 1.0)) * 0.35;
  float rough = uEdgeRough * (type == 5 ? 1.6 : type == 0 ? 0.5 : 1.0);
  float edgeAt = 1.0 - rough * 0.35 + (edgeN - 0.5) * rough * 0.55;
  float soft = type == 5 ? 0.35 : type == 2 ? 0.18 : 0.08;
  float profile = 1.0 - smoothstep(edgeAt - soft, edgeAt + 0.02, abs(a));
  if (type == 1 || type == 3) profile *= 1.0 - 0.35 * pow(abs(a), 3.0);
  if (type == 2) profile *= 1.0 - 0.5 * a * a;

  // start cap — the extended first segment becomes a rounded (or squarish, for flats) loaded blob.
  // vCapD runs from -capLen at the cap tip to 0 where the stroke proper begins.
  float capT = vX.w;
  if (capT > 0.0 && vCapD < 0.0) {
    float k = clamp(-vCapD / capT, 0.0, 1.0);
    float pw = type == 0 ? 6.0 : 2.0;
    float ell = pow(pow(abs(a), pw) + pow(k, pw), 1.0 / pw);
    float n = vnoise(vec2(a * 4.0 + seed, 2.0)) * 0.25;
    profile *= 1.0 - smoothstep(0.8 - n, 1.0 - n * 0.5, ell);
  }

  // ---- bristles ---------------------------------------------------------------------------------
  float bCoord = b * bristles + seed;
  float hairA = vnoise1(bCoord);
  float hairB = vnoise1(bCoord * 2.7 + 11.0);
  float hair = mix(hairA, hairB, 0.4);
  // each hair loads differently along the stroke (long streaks, slowly changing)
  float alongVar = vnoise(vec2(bCoord * 0.9, along * 0.35 + seed));
  float streak = mix(0.5, hair * 0.65 + alongVar * 0.35, uBristleContrast);
  if (type == 4) streak = mix(streak, step(0.55, hairB) * hair, 0.7); // fan: sparse hairs with gaps
  if (type == 3) streak = mix(streak, 0.75, 0.5);                     // dab: dense, short

  // ---- paint load / dry brush --------------------------------------------------------------------
  // existing relief also catches paint (dragging over old impasto ridges)
  vec2 suv = vec2(vC.x / uAspect, vC.y);
  float tooth = texture(uGroundTex, suv).r;
  vec4 under = texture(uPrevPaint, suv);
  vec4 underH = texture(uPrevHeight, suv);
  float relief = clamp(tooth * 0.6 + underH.r * 0.8, 0.0, 1.5);

  float load = clamp(vLoad, 0.0, 1.2);
  float dry = clamp(1.0 - load, 0.0, 1.0);
  float catchAmt = streak + (relief - 0.45) * uDryBrush * (0.3 + dry * 1.3);
  float thresh = mix(-0.1, 0.95, smoothstep(0.15, 1.0, dry));
  if (type == 5) thresh = mix(0.2, 0.95, dry);
  float coverage = smoothstep(thresh - 0.1, thresh + 0.1, catchAmt);
  coverage = mix(coverage, 1.0, smoothstep(0.8, 1.1, load) * 0.5); // fully loaded brush lays solid paint

  float alpha = clamp(profile * coverage * vColA.a, 0.0, 1.0);
  if (alpha < 0.002) discard;

  // ---- colour: broken colour + wet pickup ------------------------------------------------------
  float mixN = vnoise(vec2(bCoord * 0.55 + 3.0, along * 0.12 + seed));
  float split = smoothstep(0.5 - 0.22 * uBrokenColor, 0.5 + 0.22 * uBrokenColor, mixN);
  vec3 col = mix(vColA.rgb, vColB.rgb, split * uBrokenColor);
  col *= 1.0 + (hair - 0.5) * 0.14 * uBristleContrast;           // each hair slightly lighter/darker

  float wetUnder = clamp(underH.g, 0.0, 1.0);
  if (under.a > 0.02) {
    vec3 underCol = under.rgb / under.a;
    float pick = vX.y * wetUnder * (0.35 + 0.65 * dry) * under.a;
    col = mix(col, underCol, clamp(pick, 0.0, 0.85));
  }

  // ---- impasto height ----------------------------------------------------------------------------
  float thick = vColB.a;
  float body = smoothstep(edgeAt + 0.05, edgeAt - 0.22, abs(a));                                    // flat-topped body
  float ridge = smoothstep(0.5, 0.85, abs(a)) * (1.0 - smoothstep(0.85, 1.1, abs(a))) * 0.18;       // paint pushed to edges
  float grooves = (streak - 0.5) * 0.45 * uBristleContrast;                                          // bristle furrows
  float h = thick * (body * (0.7 + grooves) + ridge) * (0.4 + 0.6 * min(load, 1.0)) * 0.6;
  if (type == 3) h *= 1.35;
  if (type == 5) h *= 0.25;
  float carried = underH.r * uHeightCarry;

  oPaint = vec4(col, alpha);
  oHeight = vec4(carried + max(h, 0.0), 1.0, vX.z, alpha);
}
`;
