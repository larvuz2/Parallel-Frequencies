import { GROUND_GLSL, NOISE_GLSL } from '../../shaders/common';

export const BG_MODES: Record<string, number> = { gallery: 0, canvas: 1, drafting: 2, sky: 3, night: 4, blue: 5, red: 6 };

/** Average (sRGB) colour of each background — used for fog so distant forms melt into it. */
export const BG_FOG: Record<string, string> = {
  gallery: '#ebe8e1', canvas: '#e6e0d3', drafting: '#e6e4dd', sky: '#d5dbe0', night: '#11131a', blue: '#1b3683', red: '#ad261e',
};

/** The space behind the sculpture. Drawn first, full screen, in sRGB then converted to linear. */
export const BACKGROUND_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${GROUND_GLSL}
in vec2 vUv;
uniform int uMode;
uniform float uAspect;
uniform float uTime;
uniform vec2 uRes;
out vec4 oColor;

vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

void main() {
  vec2 uv = vUv;
  vec2 c = vec2(uv.x * uAspect, uv.y);
  vec2 q = uv - 0.5; q.x *= uAspect;
  float r = length(q);
  vec3 col;
  if (uMode == 0) {
    // gallery: soft lit wall, warm toward the floor
    col = mix(vec3(0.955, 0.948, 0.93), vec3(0.89, 0.875, 0.85), smoothstep(0.1, 0.95, r));
    col *= 1.0 - (1.0 - uv.y) * 0.04;
    col += (vnoise(c * 600.0) - 0.5) * 0.012;
  } else if (uMode == 1) {
    // painted canvas: Mondrian's visible horizontal and vertical brushwork over linen
    float weaveH = weave(c, 220.0, 0.35);
    float bx = vnoise(vec2(c.x * 3.0, c.y * 160.0));
    float by = vnoise(vec2(c.x * 160.0, c.y * 3.0));
    float brush = mix(bx, by, step(0.5, vnoise(c * 2.5)));
    col = vec3(0.925, 0.905, 0.86) * (0.96 + 0.05 * brush) * (0.97 + 0.04 * weaveH);
    col *= 1.0 - smoothstep(0.35, 1.1, r) * 0.08;
  } else if (uMode == 2) {
    // drafting paper with a fine construction grid
    col = vec3(0.925, 0.92, 0.9) + (vnoise(c * 400.0) - 0.5) * 0.015;
    vec2 g = c * 24.0;
    vec2 dl = 0.5 - abs(fract(g) - 0.5);           // distance to the nearest grid line, in cells
    vec2 fw = fwidth(g);
    float minor = 1.0 - smoothstep(0.0, 1.0, min(dl.x / fw.x, dl.y / fw.y));
    vec2 g2 = c * 4.8;
    vec2 dl2 = 0.5 - abs(fract(g2) - 0.5);
    vec2 fw2 = fwidth(g2);
    float major = 1.0 - smoothstep(0.0, 1.4, min(dl2.x / fw2.x, dl2.y / fw2.y));
    col = mix(col, vec3(0.62, 0.7, 0.8), minor * 0.18 + major * 0.32);
    col *= 1.0 - smoothstep(0.4, 1.1, r) * 0.07;
  } else if (uMode == 3) {
    // Enlightenment sky: pale blue above, warm haze at the horizon
    float h = uv.y;
    col = mix(vec3(0.94, 0.9, 0.84), vec3(0.66, 0.77, 0.87), smoothstep(0.15, 1.0, h));
    float cloud = fbm(vec2(c.x * 1.6 + uTime * 0.004, h * 4.0)) * smoothstep(0.35, 0.9, h);
    col = mix(col, vec3(0.97, 0.96, 0.94), cloud * 0.35);
  } else if (uMode == 4) {
    col = mix(vec3(0.085, 0.095, 0.125), vec3(0.03, 0.033, 0.045), smoothstep(0.0, 1.0, r));
    col += (vnoise(c * 500.0) - 0.5) * 0.01;
  } else if (uMode == 5) {
    col = mix(vec3(0.13, 0.25, 0.6), vec3(0.06, 0.14, 0.38), smoothstep(0.0, 1.1, r));
  } else {
    col = mix(vec3(0.76, 0.17, 0.13), vec3(0.45, 0.08, 0.07), smoothstep(0.0, 1.1, r));
  }
  oColor = vec4(toLinear(col), 1.0);
}
`;

/**
 * Lens depth of field (gather bokeh). Circle of confusion from linear depth vs focus distance;
 * a golden-angle spiral of taps gives soft round bokeh. Works for perspective and parallel projection.
 */
export const DOF_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uFocus;
uniform float uAperture;  // 0..1
uniform float uMaxPx;
uniform float uOrtho;
uniform float uRange;     // ortho: depth range that reaches full blur
out vec4 oColor;

float viewZ(float d) {
  if (uOrtho > 0.5) return uNear + d * (uFar - uNear);
  return (uNear * uFar) / (uFar - d * (uFar - uNear));
}

float coc(vec2 uv) {
  float z = viewZ(texture(uDepth, uv).r);
  float c = uOrtho > 0.5 ? abs(z - uFocus) / uRange : abs(z - uFocus) / max(z, 1e-3) * 2.2;
  return clamp(c * uAperture, 0.0, 1.0);
}

void main() {
  vec4 base = texture(uColor, vUv);
  float c0 = coc(vUv);
  if (uAperture <= 0.001) { oColor = base; return; }
  vec3 acc = base.rgb;
  float wsum = 1.0;
  const int N = 32;
  const float GA = 2.39996323;
  for (int i = 1; i < N; i++) {
    float fi = float(i);
    float r = sqrt(fi / float(N)) * uMaxPx;
    float a = fi * GA;
    vec2 o = vec2(cos(a), sin(a)) * r * uTexel;
    vec3 s = texture(uColor, vUv + o).rgb;
    float cs = coc(vUv + o) * uMaxPx;
    // a tap contributes if its own blur (or ours) reaches this far
    float w = smoothstep(r - 1.5, r + 0.5, max(cs, c0 * uMaxPx));
    // gently favour bright taps → luminous bokeh
    w *= 1.0 + dot(s, vec3(0.3)) * 0.4;
    acc += s * w;
    wsum += w;
  }
  oColor = vec4(acc / wsum, 1.0);
}
`;
