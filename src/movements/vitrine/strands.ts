import * as THREE from 'three';
import { FULLSCREEN_VERT } from '../../shaders/common';
import { FIELD, MAX_SOURCES, NOISE } from './shaders';

/**
 * Strand geometry — the combed fibres of the matter as real geometry.
 *
 * A trace texture holds every strand as K points (16 strands per row, K texels each). Each frame a
 * GPU pass advances point k from point k-1 of the previous frame: one step along a combing field
 * (a long-range sweep bent to follow the fold contours), then back onto the folded surface. The
 * strands therefore settle onto the surface within K frames and keep flowing as the form evolves.
 * They are drawn as screen-space ribbons with a tube profile and hair (Kajiya–Kay) lighting.
 */

export const K = 16;
const COLS = 16;

const SEED = /* glsl */ `
uniform float uWispShare;
bool isWisp(float si, vec3 d0) {
  // smoke leaves from some regions only, a share of the strands there
  return snoise3(d0 * 1.3 + 7.7) > 0.3 && hh(vec2(si * 0.053, 4.4)) < uWispShare * 3.5;
}
vec3 seedDir(float si) {
  float u = hh(vec2(si * 0.0131, 7.1)) * 2.0 - 1.0;
  float a = hh(vec2(si * 0.0173, 3.3)) * 6.2831853;
  float s = sqrt(max(1.0 - u * u, 0.0));
  return vec3(s * cos(a), u, s * sin(a));
}
`;

const TRACE_FRAG = /* glsl */ `
precision highp float;
precision highp int;
${NOISE}
${FIELD}
${SEED}
uniform sampler2D uPrevPos;
uniform sampler2D uPrevNrm;
uniform float uStep;
uniform float uContour;
uniform float uSweep;
uniform float uWispLift;
uniform float uWispTurb;
uniform float uWispLen;
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oNrm;

vec3 surfP(vec3 d, out float h) {
  h = disp(d * uStretch * uR);
  return d * uStretch * (uR + h);
}

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  int k = c.x % ${K};
  float si = float(c.y * ${COLS} + c.x / ${K});
  vec3 d = seedDir(si);
  if (k > 0) {
    vec4 prev = texelFetch(uPrevPos, ivec2(c.x - 1, c.y), 0);
    vec3 pn = texelFetch(uPrevNrm, ivec2(c.x - 1, c.y), 0).xyz;
    if (dot(prev.xyz, prev.xyz) > 1e-4 && dot(pn, pn) > 0.5) {
      vec3 q0 = prev.xyz;
      vec3 q0u = q0 - bendOff(q0.x);
      vec3 rad = normalize(q0u / uStretch);
      // the comb: a long-range sweep that slowly turns in space
      vec3 sw = normalize(vec3(0.35, 1.0, 0.2) + vec3(snoise3(q0 * 0.4), snoise3(q0 * 0.4 + 4.0) * 0.5, snoise3(q0 * 0.4 + 9.0)) * uSweep);
      vec3 t = sw - pn * dot(sw, pn);
      // ...bent to follow the contours of the folds (perpendicular to the slope)
      vec3 cont = cross(pn, rad);
      cont *= sign(dot(cont, t) + 1e-5);
      t = normalize(t + cont * uContour * 6.0 + 1e-5);
      if (k >= 3 && isWisp(si, seedDir(si))) {
        // smoke: the strand peels off the surface and drifts, curling, into the air
        float f = float(k - 2) / ${(K - 3).toFixed(1)};
        vec3 cu = curl3(q0 * 0.9 + vec3(0.0, uTime * 0.04, uTime * 0.02));
        vec3 outward = normalize(rad * uStretch);
        vec3 dv = normalize(t * (1.0 - 0.4 * f) + (pn * 0.6 + outward * 0.4) * uWispLift * (0.4 + f) + cu * uWispTurb * 0.25 + vec3(0.0, 0.12, 0.0));
        oPos = vec4(q0 + dv * uStep * uWispLen, prev.w * 0.92);
        oNrm = vec4(pn, 1.0);
        return;
      }
      d = normalize((q0u + t * uStep) / uStretch);
    }
  }
  float h;
  vec3 p = surfP(d, h);
  vec3 up = abs(d.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(up, d));
  vec3 t2 = cross(d, t1);
  float ha, hb;
  vec3 pa = surfP(normalize(d + t1 * 0.006), ha);
  vec3 pb = surfP(normalize(d + t2 * 0.006), hb);
  float cr = crestOf(p);
  p += bendOff(p.x);
  pa += bendOff(pa.x);
  pb += bendOff(pb.x);
  vec3 n = normalize(cross(pa - p, pb - p));
  if (dot(n, d) < 0.0) n = -n;
  oPos = vec4(p, cr);
  oNrm = vec4(n, h / max(uAmp, 0.01));
}
`;

const STRAND_VERT = /* glsl */ `
precision highp float;
precision highp int;
${NOISE}
${SEED}
uniform sampler2D tPos;
uniform sampler2D tNrm;
uniform vec2 uRes;
uniform float uWidth;
uniform float uGrowth;
uniform float uLayer;
uniform float uMaxSeg;
uniform float uSmokeWidth;
uniform float uCells;
in float aIdx;
out float vV;
out float vU;
out float vSeed;
out vec3 vN;
out vec3 vT;
out vec3 vP;
out float vCrest;
out float vValley;
out float vRegion;
void main() {
  int k = int(position.x + 0.5);
  float side = position.y;
  int si = int(aIdx + 0.5);
  int col = si % ${COLS};
  int row = si / ${COLS};
  ivec2 tc = ivec2(col * ${K} + k, row);
  vec4 P = texelFetch(tPos, tc, 0);
  vec4 Nn = texelFetch(tNrm, tc, 0);
  int k2 = k < ${K - 1} ? k + 1 : k - 1;
  vec3 P2 = texelFetch(tPos, ivec2(col * ${K} + k2, row), 0).xyz;
  vec3 T = k < ${K - 1} ? P2 - P.xyz : P.xyz - P2;
  float u = float(k) / ${(K - 1).toFixed(1)};

  // growth: the strand appears with its patch of matter and extends along its length
  vec3 d0 = seedDir(aIdx);
  float m = 0.5 + 0.5 * snoise3(d0 * 1.8 + 3.0);
  float edge = uGrowth * 1.15 - m;
  float reach = clamp(edge / 0.15, 0.0, 1.0);
  bool wisp = isWisp(aIdx, d0);
  #ifdef WISP
  if (!wisp) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  #else
  if (wisp && k >= 3) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  #endif
  // where the skin turns into glowing membranes, the strands open up to reveal them
  if (uCells > 0.0) {
    vec3 Pc = texelFetch(tPos, ivec2(col * ${K} + ${K >> 1}, row), 0).xyz;
    vec3 Pcu = Pc;
    if (snoise3(Pcu * 0.7 + 5.3) > 0.42 + 0.3 * (1.0 - uCells)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  }
  if (edge <= 0.0 || u > reach || dot(Nn.xyz, Nn.xyz) < 0.5 || dot(T, T) < 1e-10 || length(T) > uMaxSeg) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  T = normalize(T);
  float layer = hh(vec2(aIdx * 0.021, 1.9));
  vec3 p = P.xyz + Nn.xyz * (0.004 + layer * uLayer);
  vec4 c0 = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec4 c1 = projectionMatrix * modelViewMatrix * vec4(p + T * 0.05, 1.0);
  vec2 s0 = c0.xy / c0.w;
  vec2 s1 = c1.xy / c1.w;
  vec2 dir = (s1 - s0) * uRes;
  dir = dot(dir, dir) > 1e-8 ? normalize(dir) : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float taper = pow(sin(3.14159265 * clamp(u * 0.92 + 0.04, 0.0, 1.0)), 0.5);
  float w = uWidth * (0.55 + 0.9 * hh(vec2(aIdx * 0.37, 5.5))) * taper;
  #ifdef WISP
  w = uWidth * uSmokeWidth * (3.0 + 5.0 * hh(vec2(aIdx * 0.37, 5.5))) * (0.5 + 2.0 * u);
  #endif
  c0.xy += nrm * side * w / uRes * c0.w;
  gl_Position = c0;
  vV = side;
  vU = u;
  vSeed = aIdx;
  vN = Nn.xyz;
  vT = T;
  vP = p;
  // a glowing strand lights along its length: use the highest crest it passes over
  float cmax = 0.0;
  for (int j = 0; j < ${K}; j++) cmax = max(cmax, texelFetch(tPos, ivec2(col * ${K} + j, row), 0).w);
  vCrest = mix(P.w, cmax, 0.5);
  // colour family of the strand: a smooth field sampled at its middle point
  vec3 Pm = texelFetch(tPos, ivec2(col * ${K} + ${K >> 1}, row), 0).xyz;
  vRegion = 0.5 + 0.5 * snoise3(Pm * 0.75 + 2.3);
  vValley = Nn.w;
}
`;

const STRAND_FRAG = /* glsl */ `
precision highp float;
${NOISE}
out vec4 fragColor;
uniform vec3 uKeyDir;
uniform float uKey;
uniform float uAmbient;
uniform float uAlbedo;
uniform float uGloss;
uniform float uSheen;
uniform float uRim;
uniform float uCrestGlow;
uniform float uVeinShare;
uniform float uWispAlpha;
uniform float uTime;
uniform vec3 uTint;
uniform vec3 uCoreCol;
uniform vec3 uCoreExtent;
uniform float uCoreMix;
uniform float uCoreSize;
uniform float uCoreGlow;
vec3 coreTint(vec3 p, vec3 outer) {
  float c = 1.0 - smoothstep(uCoreSize - 0.3, uCoreSize + 0.25, length(p / uCoreExtent));
  return mix(outer, uCoreCol, c * uCoreMix);
}
float coreAmt(vec3 p) { return (1.0 - smoothstep(uCoreSize - 0.3, uCoreSize + 0.25, length(p / uCoreExtent))) * uCoreMix; }

uniform vec3 uKeyCol;
uniform vec3 uRimCol;
uniform vec3 uSmokeCol;
uniform float uSmokeTint;
uniform float uWarmShare;
uniform float uFrontFade;
uniform float uVeinLo;
uniform float uVeinHi;
uniform float uPulse;
uniform float uToneVar;
uniform float uSmokeBright;
uniform float uPatch;
uniform float uPatchScale;
uniform float uPatchCover;
uniform vec3 uVeinA;
uniform vec3 uVeinB;
uniform vec3 uVeinC;
uniform int uNumSrc;
uniform vec4 uSrcPos[${MAX_SOURCES}];
uniform vec4 uSrcForce[${MAX_SOURCES}];
uniform vec4 uSrcCol[${MAX_SOURCES}];
in float vV;
in float vU;
in float vSeed;
in vec3 vN;
in vec3 vT;
in vec3 vP;
in float vCrest;
in float vValley;
in float vRegion;
void main() {
  float v = clamp(vV, -1.0, 1.0);
  float tube = sqrt(max(1.0 - v * v, 0.0));
  vec3 N = normalize(vN);
  vec3 T = normalize(vT);
  vec3 B = normalize(cross(T, N));
  vec3 Nt = normalize(N * tube + B * v);
  vec3 V = normalize(cameraPosition - vP);
  vec3 L = normalize(uKeyDir);
  float wrap = max(dot(Nt, L) * 0.72 + 0.28, 0.0);
  float big = max(dot(N, L) * 0.5 + 0.5, 0.0);
  float diff = wrap * wrap * (0.45 + 0.75 * big);
  vec3 H = normalize(L + V);
  float th = dot(T, H);
  float spec = pow(sqrt(max(1.0 - th * th, 0.0)), uGloss) * uSheen;
  float rim = pow(1.0 - abs(dot(N, V)), 3.0) * uRim;
  float valley = smoothstep(-0.55, 0.45, vValley);
  float ao = mix(0.22, 1.0, valley);
  float tone = uAlbedo * 0.85 * (1.0 - uToneVar * 0.5 + uToneVar * hh(vec2(vSeed * 0.11, 2.0)));
  vec3 col = coreTint(vP, uTint) * tone * (uAmbient + diff * uKey * uKeyCol) * ao * (0.62 + 0.38 * tube);
  col += uCoreCol * coreAmt(vP) * uCoreGlow * 0.1 * tube;
  col += vec3(0.92, 0.95, 1.0) * spec * uKey * 0.3 * ao * tube;
  col += uRimCol * rim * 0.06 * tube;

  // veins: a share of the strands glow where they ride over a fold crest
  float isVein = step(hh(vec2(vSeed * 0.07, 8.3)), uVeinShare);
  float region = vRegion;
  vec3 vein = region < 0.5 ? uVeinA : region < 0.68 ? uVeinB : uVeinC;
  float crest = smoothstep(uVeinLo, uVeinHi, vCrest);
  float pulse = 1.0 - uPulse * 0.5 + uPulse * 0.5 * sin(vU * 3.0 - uTime * 0.6 + vSeed * 0.013);
  vec3 emis = vein * crest * uCrestGlow * (isVein * 2.4 + 0.03) * pulse;
  if (uPatch > 0.0) {
    float patchM = smoothstep(uPatchCover, uPatchCover + 0.35, snoise3(vP * uPatchScale + 3.1));
    float speck = step(hh(vec2(vSeed * 0.71, 3.7)), 0.45) * (0.4 + 0.6 * hh(vec2(vSeed * 0.29, 8.8)));
    emis += uVeinA * patchM * speck * uPatch * 1.6;
  }
  for (int i = 0; i < ${MAX_SOURCES}; i++) {
    if (i >= uNumSrc) break;
    vec3 dd = vP - uSrcPos[i].xyz;
    float r = uSrcForce[i].z * 1.4;
    float fall = exp(-dot(dd, dd) / (r * r));
    emis += uSrcCol[i].rgb * uSrcCol[i].a * fall * (0.04 + isVein * 1.3 + crest * 0.3);
  }
  #ifdef WISP
  // translucent combed smoke: grey, tinted at the edges by the vein colours, fading as it drifts away
  // cool tints (lavender / cyan) with only a rare warm thread, like the reference
  vec3 tint = hh(vec2(vSeed * 0.31, 2.2)) >= uWarmShare ? (hh(vec2(vSeed * 0.13, 9.1)) < 0.55 ? uVeinB : uVeinC) : uVeinA;
  vec3 smoke = mix(uSmokeCol, tint * 0.6, uSmokeTint * (0.3 + 0.7 * hh(vec2(vSeed * 0.19, 6.1))));
  float fade = smoothstep(0.1, 0.3, vU) * pow(1.0 - vU, 1.4);
  float a = uWispAlpha * fade * tube * tube * (0.5 + 0.5 * tube);
  // smoke reads at the silhouette; where it hangs in front of the mass it stays nearly invisible
  a *= 1.0 - uFrontFade * smoothstep(0.25, 0.85, abs(dot(N, V)));
  fragColor = vec4((smoke * (0.6 + 0.5 * diff * uKey) * uSmokeBright + emis * 0.3) * a, a);
  #else
  fragColor = vec4(col + emis * (0.55 + 0.45 * tube), 1.0);
  #endif
}
`;

export class Strands {
  readonly mesh: THREE.Mesh;
  readonly wispMesh: THREE.Mesh;
  readonly wispMaterial: THREE.ShaderMaterial;
  readonly material: THREE.ShaderMaterial;
  readonly traceMat: THREE.RawShaderMaterial;
  private a!: THREE.WebGLRenderTarget;
  private b!: THREE.WebGLRenderTarget;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private geometry: THREE.InstancedBufferGeometry;
  count = 0;
  private primed = 0;

  constructor(private renderer: THREE.WebGLRenderer, count: number) {
    this.traceMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: TRACE_FRAG,
      uniforms: {
        uPrevPos: { value: null }, uPrevNrm: { value: null }, uStep: { value: 0.045 }, uContour: { value: 0.6 }, uSweep: { value: 0.9 }, uWispShare: { value: 0.1 }, uWispLift: { value: 1 }, uWispTurb: { value: 1 }, uWispLen: { value: 2.5 },
        uTime: { value: 0 }, uR: { value: 1.2 }, uAmp: { value: 0.5 }, uFreq: { value: 1 }, uWarp: { value: 0.9 }, uEvolve: { value: 0.02 }, uLobe: { value: 0.6 }, uLobeScale: { value: 1 }, uBend: { value: 0 }, uBendFreq: { value: 1 },
        uStretch: { value: new THREE.Vector3(1.2, 1, 1) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.traceMat);
    quad.frustumCulled = false;
    this.quadScene.add(quad);

    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: STRAND_VERT,
      fragmentShader: STRAND_FRAG,
      uniforms: {
        tPos: { value: null }, tNrm: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: 2 }, uGrowth: { value: 1 },
        uLayer: { value: 0.03 }, uMaxSeg: { value: 0.15 }, uWispShare: { value: 0.1 }, uWispAlpha: { value: 0.3 },
        uTint: { value: new THREE.Color(1, 1, 1) }, uCoreCol: { value: new THREE.Color(1, 0.7, 0.7) }, uCoreExtent: { value: new THREE.Vector3(1, 1, 1) }, uCoreMix: { value: 0 }, uCoreSize: { value: 0.7 }, uCoreGlow: { value: 0 }, uKeyCol: { value: new THREE.Color(1, 1, 1) }, uRimCol: { value: new THREE.Color(0.5, 0.55, 0.65) },
        uSmokeCol: { value: new THREE.Color(0.2, 0.21, 0.23) }, uSmokeTint: { value: 0.5 }, uWarmShare: { value: 0.15 }, uFrontFade: { value: 0.85 },
        uVeinLo: { value: 0.86 }, uVeinHi: { value: 0.98 }, uPulse: { value: 0.4 }, uToneVar: { value: 0.4 }, uSmokeBright: { value: 1 }, uSmokeWidth: { value: 1 }, uCells: { value: 0 }, uPatch: { value: 0 }, uPatchScale: { value: 1.2 }, uPatchCover: { value: 0.2 }, uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKey: { value: 1 }, uAmbient: { value: 0.1 }, uAlbedo: { value: 0.2 },
        uGloss: { value: 40 }, uSheen: { value: 0.4 }, uRim: { value: 0.6 }, uCrestGlow: { value: 1 }, uVeinShare: { value: 0.12 }, uTime: { value: 0 },
        uVeinA: { value: new THREE.Color() }, uVeinB: { value: new THREE.Color() }, uVeinC: { value: new THREE.Color() },
        uNumSrc: { value: 0 }, uSrcPos: { value: [] }, uSrcForce: { value: [] }, uSrcCol: { value: [] },
      },
      side: THREE.DoubleSide,
    });

    const g = new THREE.InstancedBufferGeometry();
    const pos = new Float32Array(K * 2 * 3);
    for (let k = 0; k < K; k++) {
      pos.set([k, -1, 0], (k * 2) * 3);
      pos.set([k, 1, 0], (k * 2 + 1) * 3);
    }
    const idx: number[] = [];
    for (let k = 0; k < K - 1; k++) {
      const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    this.geometry = g;
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    // the smoke: same strands, translucent, drawn after the solid matter
    this.wispMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: STRAND_VERT,
      fragmentShader: STRAND_FRAG,
      uniforms: this.material.uniforms,
      defines: { WISP: '' },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.wispMesh = new THREE.Mesh(g, this.wispMaterial);
    this.wispMesh.frustumCulled = false;
    this.wispMesh.renderOrder = 8;
    this.setCount(count);
  }

  setCount(n: number) {
    n = Math.max(COLS, Math.round(n / COLS) * COLS);
    if (n === this.count) return;
    this.count = n;
    this.a?.dispose();
    this.b?.dispose();
    const float = this.renderer.extensions.has('EXT_color_buffer_float');
    const mk = () => {
      const t = new THREE.WebGLRenderTarget(K * COLS, n / COLS, {
        count: 2,
        type: float ? THREE.FloatType : THREE.HalfFloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
      });
      return t;
    };
    this.a = mk();
    this.b = mk();
    for (const t of [this.a, this.b]) {
      this.renderer.setRenderTarget(t);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, false, false);
    }
    this.renderer.setRenderTarget(null);
    const ids = new Float32Array(n);
    for (let i = 0; i < n; i++) ids[i] = i;
    this.geometry.setAttribute('aIdx', new THREE.InstancedBufferAttribute(ids, 1));
    this.geometry.instanceCount = n;
    this.primed = 0;
  }

  /** Advance the strands one step (call once per frame). The first call settles them fully. */
  trace() {
    const r = this.renderer;
    const passes = this.primed < 1 ? K : 1;
    for (let i = 0; i < passes; i++) {
      this.traceMat.uniforms.uPrevPos.value = this.a.textures[0];
      this.traceMat.uniforms.uPrevNrm.value = this.a.textures[1];
      r.setRenderTarget(this.b);
      r.render(this.quadScene, this.quadCam);
      [this.a, this.b] = [this.b, this.a];
    }
    this.primed = 1;
    r.setRenderTarget(null);
    this.material.uniforms.tPos.value = this.a.textures[0];
    this.material.uniforms.tNrm.value = this.a.textures[1];
  }

  dispose() {
    this.a.dispose();
    this.b.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.wispMaterial.dispose();
    this.traceMat.dispose();
  }
}
