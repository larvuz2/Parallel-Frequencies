import * as THREE from 'three';
import { K } from './strands';

const SEG = 24;

/**
 * Fine threads spun across the matter: each web joins two points of the surface (taken from the
 * traced strands) with a gently sagging, slightly bowed curve. Faint, additive, like spider silk.
 */
export class Webs {
  readonly mesh: THREE.LineSegments;
  readonly material: THREE.ShaderMaterial;
  private geometry = new THREE.BufferGeometry();
  private n = 0;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        tPos: { value: null }, tNrm: { value: null }, uCount: { value: 1 }, uAlpha: { value: 0.3 }, uColor: { value: new THREE.Color(0.75, 0.82, 1) },
        uTime: { value: 0 }, uMin: { value: 0.35 }, uMax: { value: 1.6 }, uSpread: { value: 0.25 }, uBundle: { value: 10 },
      },
      vertexShader: /* glsl */ `
        precision highp float;
        precision highp int;
        uniform sampler2D tPos;
        uniform sampler2D tNrm;
        uniform float uCount;
        uniform float uTime;
        uniform float uMin;
        uniform float uMax;
        uniform float uSpread;
        uniform float uBundle;
        in float aWeb;
        in float aT;
        out float vA;
        float hh(float x) { return fract(sin(x * 12.9898 + 4.1) * 43758.5453); }
        vec4 strandPoint(float si, out vec3 n) {
          int s = int(mod(si, uCount));
          ivec2 tc = ivec2((s % 16) * ${K}, s / 16);
          n = texelFetch(tNrm, tc, 0).xyz;
          return texelFetch(tPos, tc, 0);
        }
        void main() {
          vec3 na, nb;
          // threads come in bundles: same two anchor regions, running side by side
          float bundle = floor((aWeb - 1.0) / uBundle);
          float j = aWeb - bundle * uBundle;
          vec4 A = strandPoint(floor(hh(bundle + 0.5) * 1e6), na);
          vec4 B = strandPoint(floor(hh(bundle + 7.31) * 1e6), nb);
          float L = distance(A.xyz, B.xyz);
          if (L < uMin || L > uMax || dot(na, na) < 0.5 || dot(nb, nb) < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; return; }
          float t = aT;
          vec3 p = mix(A.xyz, B.xyz, t);
          // bow outward (so the thread clears the surface), sag a little, and sway slowly
          vec3 nn = normalize(na + nb + 1e-4);
          vec3 side = normalize(cross(B.xyz - A.xyz, nn) + 1e-5);
          float off = (hh(aWeb * 3.17) - 0.5) * uSpread * L;
          float lift = (hh(aWeb * 5.71) - 0.5) * uSpread * L * 0.5;
          float s = sin(3.14159 * t);
          p += side * off * (0.35 + 0.65 * s) + nn * (L * 0.07 + lift) * s - vec3(0.0, 1.0, 0.0) * L * 0.03 * s;
          p += vec3(sin(uTime * 0.7 + aWeb), cos(uTime * 0.5 + aWeb * 1.3), 0.0) * 0.02 * sin(3.14159 * t);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          vA = 0.4 + 0.6 * sin(3.14159 * t);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 uColor;
        uniform float uAlpha;
        in float vA;
        out vec4 fragColor;
        void main() { fragColor = vec4(uColor * vA * uAlpha, 1.0); }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.LineSegments(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
  }

  setCount(n: number) {
    n = Math.max(0, Math.round(n));
    if (n === this.n) return;
    this.n = n;
    const web = new Float32Array(n * SEG * 2);
    const t = new Float32Array(n * SEG * 2);
    let k = 0;
    for (let i = 0; i < n; i++) {
      for (let s = 0; s < SEG; s++) {
        web[k] = i + 1; t[k++] = s / SEG;
        web[k] = i + 1; t[k++] = (s + 1) / SEG;
      }
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * SEG * 2 * 3), 3));
    this.geometry.setAttribute('aWeb', new THREE.BufferAttribute(web, 1));
    this.geometry.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    this.mesh.visible = n > 0;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
