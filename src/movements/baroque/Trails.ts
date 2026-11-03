import * as THREE from 'three';

const CAP = 40000;

/**
 * Glowing dust left behind by the moving voice-lights. A GPU ring buffer: the CPU only writes newly
 * emitted particles (position, birth, velocity, life, colour); drift, rise, flicker and fade are
 * computed in the vertex shader.
 */
export class Trails {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private geo = new THREE.BufferGeometry();
  private aP: THREE.BufferAttribute;
  private aV: THREE.BufferAttribute;
  private aC: THREE.BufferAttribute;
  private head = 0;
  private lo = Infinity;
  private hi = -1;
  private wrapped = false;

  constructor() {
    this.aP = new THREE.BufferAttribute(new Float32Array(CAP * 4).fill(-1e4), 4);
    this.aV = new THREE.BufferAttribute(new Float32Array(CAP * 4), 4);
    this.aC = new THREE.BufferAttribute(new Float32Array(CAP * 4), 4);
    for (const a of [this.aP, this.aV, this.aC]) a.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3));
    this.geo.setAttribute('aP', this.aP);
    this.geo.setAttribute('aV', this.aV);
    this.geo.setAttribute('aC', this.aC);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uRise: { value: 0.15 }, uScale: { value: 600 }, uBright: { value: 1 }, uDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) } },
      vertexShader: /* glsl */ `
        attribute vec4 aP; attribute vec4 aV; attribute vec4 aC;
        uniform float uTime, uRise, uScale;
        varying vec3 vCol; varying float vA; varying float vDist;
        void main() {
          float age = uTime - aP.w;
          float life = aV.w;
          if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
          float k = age / life;
          vec3 p = aP.xyz + aV.xyz * age * (1.0 - 0.5 * k);
          p.y += uRise * age * age * 0.25;
          float s = aP.w * 13.7;
          p += vec3(sin(age * 1.3 + s), cos(age * 1.1 + s * 1.7), sin(age * 0.9 + s * 2.3)) * 0.03 * age;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDist = length(mv.xyz);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aC.w * uScale / max(-mv.z, 0.05), 0.0, 48.0);
          vCol = aC.rgb;
          float flick = 0.75 + 0.25 * sin(uTime * 9.0 + s * 40.0);
          vA = smoothstep(0.0, 0.06, k) * (1.0 - k) * (1.0 - k) * flick;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uBright;
        uniform sampler2D uDepth;
        uniform vec2 uRes;
        varying vec3 vCol; varying float vA; varying float vDist;
        void main() {
          float surface = texture2D(uDepth, gl_FragCoord.xy / uRes).a;
          float occl = 1.0 - smoothstep(surface - 0.02, surface + 0.08, vDist);
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d) * 4.0;
          float a = exp(-r * 4.0);
          gl_FragColor = vec4(vCol * a * vA * uBright * occl, 1.0);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.material);
    this.points.frustumCulled = false;
  }

  emit(time: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, color: THREE.Color, size: number) {
    const i = this.head;
    this.aP.setXYZW(i, x, y, z, time);
    this.aV.setXYZW(i, vx, vy, vz, life);
    this.aC.setXYZW(i, color.r, color.g, color.b, size);
    this.lo = Math.min(this.lo, i);
    this.hi = Math.max(this.hi, i);
    this.head = (this.head + 1) % CAP;
    if (this.head === 0) this.wrapped = true;
  }

  flush() {
    if (this.hi < 0) return;
    for (const a of [this.aP, this.aV, this.aC]) {
      a.clearUpdateRanges();
      if (this.wrapped) a.addUpdateRange(0, CAP * 4);
      else a.addUpdateRange(this.lo * 4, (this.hi - this.lo + 1) * 4);
      a.needsUpdate = true;
    }
    this.lo = Infinity;
    this.hi = -1;
    this.wrapped = false;
  }

  clear() {
    (this.aP.array as Float32Array).fill(-1e4);
    this.aP.clearUpdateRanges();
    this.aP.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
  }
}
