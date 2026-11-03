import * as THREE from 'three';
import { NOISE_GLSL } from '../../shaders/common';

const MAX = 12000;

/**
 * Motes of light drifting in the air in front of the canvas (stage units: the painting is a
 * plane at z = 0 spanning y ∈ [-1, 1]). All motion is computed on the GPU from per-particle seeds.
 */
export class Atmosphere {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;

  constructor() {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(MAX * 4);
    const pos = new Float32Array(MAX * 3);
    for (let i = 0; i < MAX; i++) {
      seeds[i * 4] = Math.random();
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.pow(Math.random(), 1.6); // more particles close to the canvas
      seeds[i * 4 + 3] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    g.setDrawRange(0, 0);
    this.geometry = g;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 16 / 9 },
        uSize: { value: 1 },
        uDrift: { value: 0.3 },
        uGlow: { value: 0.5 },
        uEnergy: { value: 0 },
        uPulse: { value: 0 },
        uColor: { value: new THREE.Color(1, 0.95, 0.88) },
        uPixelRatio: { value: 1 },
        uViewH: { value: 1000 },
      },
      vertexShader: /* glsl */ `
        ${NOISE_GLSL}
        attribute vec4 aSeed;
        uniform float uTime, uAspect, uSize, uDrift, uEnergy, uPulse, uPixelRatio, uViewH;
        varying float vAlpha;
        varying float vTw;
        void main() {
          float t = uTime * (0.25 + uDrift) ;
          vec3 p;
          p.x = (aSeed.x * 2.0 - 1.0) * uAspect * 1.1;
          p.y = aSeed.y * 2.0 - 1.0;
          p.z = 0.03 + aSeed.z * 1.6;
          // slow rising air with curling eddies
          p.y = mod(p.y + 1.1 + t * 0.03 * (0.4 + aSeed.w), 2.2) - 1.1;
          vec2 c = curl2(p.xy * 0.7 + aSeed.w * 10.0, t * 0.05);
          p.xy += c * 0.05 * (0.5 + uDrift + uEnergy * 0.8);
          p.x += sin(t * 0.2 + aSeed.w * 6.28) * 0.04;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float depth = -mv.z;
          float size = (0.6 + aSeed.w * 1.4) * uSize * uPixelRatio * (uViewH / 900.0) * (3.2 / depth);
          // near the camera motes become soft out-of-focus discs
          float blur = smoothstep(1.2, 1.8, p.z);
          size *= 1.0 + blur * 2.5;
          gl_PointSize = max(size, 1.0);
          vTw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.x * 2.0) + aSeed.y * 40.0);
          vAlpha = (1.0 - blur * 0.75) * (0.45 + 0.55 * vTw) * (1.0 + uEnergy * 1.2 + uPulse * 0.8);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uGlow;
        varying float vAlpha;
        varying float vTw;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float a = exp(-r * r * 3.5) * smoothstep(1.0, 0.7, r);
          gl_FragColor = vec4(uColor * a * vAlpha * uGlow * 0.6, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  setCount(n: number) {
    this.geometry.setDrawRange(0, Math.max(0, Math.min(MAX, Math.round(n))));
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
