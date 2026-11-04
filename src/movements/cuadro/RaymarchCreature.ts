import * as THREE from 'three';
import type { ControlEvent, EngineContext, MovementInstance, NoteOffEvent, NoteOnEvent, PointerState } from '../../core/types';
import { clamp, simplex3 } from '../../core/noise';
import { modScale, modSums } from '../../core/Modulation';
import { durationNorm, pitchNorm } from '../../core/Signals';
import { FULLSCREEN_VERT } from '../../shaders/common';
import { MAX_NOTES, RM_FRAG, UPSCALE_FRAG } from './rmShader';

interface Note {
  pos: THREE.Vector3;
  color: THREE.Color;
  strength: number;
  held: boolean;
  age: number;
  released: number;
  key: number;
  note: number;
}

const THREAD_SEG = 28;

/**
 * The living cloth of the Cuadro, raymarched. Renders into its own texture (rgb colour, alpha =
 * hit distance), plus a bundle-of-threads pass that is hidden where it passes behind the body.
 */
export class RaymarchCreature implements MovementInstance {
  private camera = new THREE.PerspectiveCamera(30, 1.62, 0.05, 100);
  private marchTarget: THREE.WebGLRenderTarget;
  private outTarget: THREE.WebGLRenderTarget;
  private marchMat: THREE.RawShaderMaterial;
  private upMat: THREE.RawShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private threadScene = new THREE.Scene();
  private threads: THREE.LineSegments;
  private threadMat: THREE.ShaderMaterial;
  private threadKey = '';
  private notes: Note[] = [];
  private np = Array.from({ length: MAX_NOTES }, () => new THREE.Vector4());
  private nc = Array.from({ length: MAX_NOTES }, () => new THREE.Vector4());
  private width = 2;
  private height = 2;
  private time = 0;
  private growth = 0;
  private lastNote = -100;
  private evolveT = 0;
  private breath = 0;

  constructor(private ctx: EngineContext) {
    const size = ctx.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.width = size.x;
    this.height = size.y;
    this.marchTarget = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.outTarget = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthBuffer: false });
    const raw = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    const c = () => new THREE.Color();
    this.marchMat = raw(RM_FRAG, {
      uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() }, uSteps: { value: 96 },
      uLobeA: { value: new THREE.Vector3() }, uLobeB: { value: new THREE.Vector3() }, uRadA: { value: 1 }, uRadB: { value: 1 }, uBridge: { value: 0.6 },
      uEnvNoise: { value: 0.3 }, uSheetFreq: { value: 1 }, uSheetTh: { value: 0.1 }, uWarp: { value: 1 }, uEvolve: { value: 0.03 }, uLayers: { value: 1 },
      uCoreR: { value: 0.6 }, uGrowth: { value: 1 }, uSwell: { value: 0.5 }, uTwist: { value: 0 },
      uOuter: { value: c() }, uInner: { value: c() }, uGlowCol: { value: c() }, uRimCol: { value: c() }, uSpeckCol: { value: c() }, uDustCol: { value: c() },
      uDepthMix: { value: 1.5 }, uKeyDir: { value: new THREE.Vector3(-0.5, 0.7, 0.6) }, uKeyCol: { value: new THREE.Color(1, 1, 1) },
      uKey: { value: 1 }, uAmbient: { value: 0.15 }, uRim: { value: 0.8 }, uTrans: { value: 0.5 }, uGloss: { value: 0.4 }, uGrain: { value: 0.6 },
      uGlow: { value: 1 }, uHaze: { value: 0.3 }, uSpeck: { value: 0.3 }, uDust: { value: 0.5 }, uDustSize: { value: 1 }, uAO: { value: 0.6 },
      uNumNotes: { value: 0 }, uNoteP: { value: this.np }, uNoteC: { value: this.nc },
    });
    this.upMat = raw(UPSCALE_FRAG, { uSrc: { value: this.marchTarget.texture }, uTexel: { value: new THREE.Vector2() }, uSharpen: { value: 0.3 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.marchMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.threadMat = new THREE.ShaderMaterial({
      uniforms: { uDepth: { value: this.marchTarget.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uColor: { value: c() }, uAlpha: { value: 0.3 }, uTime: { value: 0 }, uSway: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;   // phase, bundle, along (0..1), unused
        uniform float uTime; uniform float uSway;
        varying float vDist; varying float vA;
        void main() {
          vec3 p = position;
          float s = sin(3.14159 * aSeed.z);
          p.y += sin(uTime * 0.6 + aSeed.x * 6.28 + aSeed.y) * 0.04 * s * uSway;
          p.z += cos(uTime * 0.45 + aSeed.x * 4.0) * 0.03 * s * uSway;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDist = length(mv.xyz);
          vA = 0.25 + 0.75 * s;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uDepth; uniform vec2 uRes; uniform vec3 uColor; uniform float uAlpha;
        varying float vDist; varying float vA;
        void main() {
          float surf = texture2D(uDepth, gl_FragCoord.xy / uRes).a;
          float vis = 1.0 - smoothstep(surf - 0.02, surf + 0.06, vDist);
          gl_FragColor = vec4(uColor * vA * uAlpha * vis, 1.0);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.threads = new THREE.LineSegments(new THREE.BufferGeometry(), this.threadMat);
    this.threads.frustumCulled = false;
    this.threadScene.add(this.threads);
  }

  get output() {
    return this.outTarget.texture;
  }

  private get p() {
    return this.ctx.params;
  }

  private lobes() {
    const p = this.p;
    const sep = p.num('cu.rmSeparation');
    const s = p.num('cu.rmSize') * (1 + this.breath);
    const a = new THREE.Vector3(-sep * 0.5, p.num('cu.rmTilt') * 0.35, 0).multiplyScalar(s);
    const b = new THREE.Vector3(sep * 0.5, -p.num('cu.rmTilt') * 0.35, 0.1).multiplyScalar(s);
    const balance = p.num('cu.rmBalance');
    return { a, b, ra: 1.05 * s * (1 - balance * 0.25), rb: 1.05 * s * (1 + balance * 0.25) };
  }

  /* ----------------------------------------------------------------------------- music */

  noteOn(e: NoteOnEvent) {
    const p = this.p;
    const sig = this.ctx.signals.values;
    const m = modSums(p.routes, { ...sig, velocity: e.velocity, pitch: pitchNorm(e.note), duration: e.duration !== undefined ? durationNorm(e.duration) : 0.35 });
    this.lastNote = this.time;
    const L = this.lobes();
    const t = pitchNorm(e.note);
    // low notes on the left lobe, high on the right, the middle in the bridge
    const pos = new THREE.Vector3().lerpVectors(L.a, L.b, t);
    pos.add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.9, 0.3 + Math.random() * 0.4).multiplyScalar(p.num('cu.rmSize')));
    const color = new THREE.Color(p.str('cu.rmGlowColor')).lerp(new THREE.Color(p.str('cu.rmNoteColor')), Math.random() * 0.6 + 0.2);
    this.notes.push({
      pos, color, strength: p.num('cu.rmNoteGlow') * modScale(m, 'glow', 0) * (0.3 + e.velocity),
      held: true, age: 0, released: -1, key: e.note * 64 + (e.channel & 63), note: e.note,
    });
    if (this.notes.length > MAX_NOTES * 3) this.notes.splice(0, this.notes.length - MAX_NOTES * 3);
    if (p.bool('cu.accumulate')) this.growth = Math.min(1, this.growth + p.num('cu.rmPerNote') * modScale(m, 'growth', 0) * (0.3 + e.velocity));
  }

  noteOff(e: NoteOffEvent) {
    if (this.ctx.signals.values.pedal >= 0.5 && this.p.bool('src.pedalSustain')) return;
    const k = e.note * 64 + (e.channel & 63);
    for (const n of this.notes) if (n.key === k && n.held) { n.held = false; n.released = 0; }
  }

  control(e: ControlEvent) {
    if (e.controller === 64 && e.value < 0.5) for (const n of this.notes) if (n.held && !this.ctx.signals.active.has(n.note)) { n.held = false; n.released = 0; }
  }

  allNotesOff() {
    for (const n of this.notes) if (n.held) { n.held = false; n.released = 0; }
  }

  /* ----------------------------------------------------------------------------- threads */

  private buildThreads() {
    const p = this.p;
    const bundles = Math.round(p.num('cu.rmThreadBundles'));
    const per = Math.round(p.num('cu.rmThreadsPer'));
    const key = [bundles, per, p.num('cu.rmThreadSpread'), p.num('cu.rmThreadBow'), p.num('cu.rmSeparation'), p.num('cu.rmSize'), p.num('cu.rmTilt'), p.num('cu.rmSeed')].map((x) => x.toFixed(3)).join('|');
    if (key === this.threadKey) return;
    this.threadKey = key;
    const L = this.lobes();
    let seed = Math.round(p.num('cu.rmSeed')) * 7919 + 13;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pos: number[] = [];
    const sd: number[] = [];
    const spread = p.num('cu.rmThreadSpread');
    const bowAmt = p.num('cu.rmThreadBow');
    for (let b = 0; b < bundles; b++) {
      // anchors: on the inner faces of the two lobes, facing each other
      const ya = (rnd() - 0.5) * 1.2, yb = ya + (rnd() - 0.5) * 0.8;
      const A = L.a.clone().add(new THREE.Vector3(L.ra * (0.35 + rnd() * 0.4), ya * L.ra, (rnd() - 0.2) * L.ra * 0.8));
      const B = L.b.clone().add(new THREE.Vector3(-L.rb * (0.35 + rnd() * 0.4), yb * L.rb, (rnd() - 0.2) * L.rb * 0.8));
      const dir = B.clone().sub(A);
      const len = dir.length();
      const side = new THREE.Vector3(0, 1, 0.3).cross(dir).normalize();
      const up = dir.clone().cross(side).normalize();
      const bow = (rnd() - 0.5) * 2 * bowAmt;
      for (let k = 0; k < per; k++) {
        const off = (rnd() - 0.5) * spread * len * 0.5;
        const lift = (rnd() - 0.5) * spread * len * 0.15;
        const phase = rnd();
        let prev: THREE.Vector3 | null = null;
        for (let s = 0; s <= THREAD_SEG; s++) {
          const t = s / THREAD_SEG;
          const sn = Math.sin(Math.PI * t);
          const q = A.clone().lerp(B, t)
            .addScaledVector(up, (bow + lift) * len * 0.25 * sn)
            .addScaledVector(side, off * (0.6 + 0.4 * sn));
          if (prev) {
            pos.push(prev.x, prev.y, prev.z, q.x, q.y, q.z);
            sd.push(phase, b, (s - 1) / THREAD_SEG, 0, phase, b, t, 0);
          }
          prev = q;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 4));
    this.threads.geometry.dispose();
    this.threads.geometry = g;
  }

  /* ----------------------------------------------------------------------------- frame */

  update(dt: number, time: number, _pointers: PointerState[]) {
    const p = this.p;
    const sig = this.ctx.signals.values;
    this.time = time;
    const g = modSums(p.routes, sig);

    // growth & dissolution
    if (!p.bool('cu.accumulate')) this.growth = 1;
    else {
      this.growth = Math.max(this.growth, p.num('cu.rmStart'));
      this.growth = Math.min(1, this.growth + p.num('cu.rmIdleGrowth') * dt);
      if (time - this.lastNote > p.num('cu.rmSilent')) this.growth = Math.max(p.num('cu.rmStart'), this.growth - p.num('cu.rmDissolve') * dt);
    }
    // breathing
    const tb = p.num('cu.breathe') * (0.045 * sig.loudness + 0.012 * Math.sin(time * 0.35));
    this.breath += (tb - this.breath) * (1 - Math.exp(-dt * 2));
    this.evolveT += dt * p.num('cu.rmEvolve') * modScale(g, 'evolve', 0);

    // notes
    const decay = p.num('cu.rmNoteDecay');
    this.notes = this.notes.filter((n) => n.released < decay * 3);
    for (const n of this.notes) {
      n.age += dt;
      if (n.released >= 0) n.released += dt;
    }
    const live = this.notes
      .map((n) => ({ n, env: (n.held ? 1 : Math.exp(-n.released / Math.max(0.05, decay))) * (0.6 + 0.4 * Math.exp(-n.age * 3)) }))
      .sort((a, b) => b.env - a.env)
      .slice(0, MAX_NOTES);
    const reach = p.num('cu.rmNoteReach') * p.num('cu.rmSize');
    live.forEach(({ n, env }, i) => {
      this.np[i].set(n.pos.x, n.pos.y, n.pos.z, n.strength * env);
      this.nc[i].set(n.color.r, n.color.g, n.color.b, reach);
    });

    // camera: the painting's own viewpoint, framed on the creature
    const cam = this.camera;
    cam.aspect = this.width / this.height;
    cam.fov = p.num('cu.rmFov');
    const L = this.lobes();
    const span = Math.max(L.b.x - L.a.x + L.ra + L.rb, 2 * (L.ra + L.rb) / cam.aspect);
    const hfov = 2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect);
    const dist = (span / 2 / Math.tan(hfov / 2)) * p.num('cu.rmFrame');
    const sway = p.num('cu.roomSway');
    const yaw = (p.num('cu.rmYaw') * Math.PI) / 180 + simplex3(time * 0.02, 1.3, 0) * 0.08 * sway;
    const pitch = (p.num('cu.rmPitch') * Math.PI) / 180 + simplex3(time * 0.017, 4.1, 0) * 0.04 * sway;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    cam.lookAt(0, p.num('cu.rmOffsetY'), 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // uniforms
    const u = this.marchMat.uniforms;
    const ms = p.num('cu.rmResolution');
    const mw = Math.max(2, Math.round(this.width * ms)), mh = Math.max(2, Math.round(this.height * ms));
    if (this.marchTarget.width !== mw || this.marchTarget.height !== mh) this.marchTarget.setSize(mw, mh);
    u.uRes.value.set(mw, mh);
    u.uTime.value = this.evolveT * 30 + time * 0.0;
    u.uInvProj.value.copy(cam.projectionMatrixInverse);
    u.uCamWorld.value.copy(cam.matrixWorld);
    u.uCamPos.value.copy(cam.position);
    u.uSteps.value = Math.round(p.num('cu.rmSteps'));
    u.uLobeA.value.copy(L.a);
    u.uLobeB.value.copy(L.b);
    u.uRadA.value = L.ra;
    u.uRadB.value = L.rb;
    u.uBridge.value = p.num('cu.rmBridge');
    u.uEnvNoise.value = p.num('cu.rmLumpy');
    u.uSheetFreq.value = p.num('cu.rmFoldScale');
    u.uSheetTh.value = p.num('cu.rmThickness') * modScale(g, 'folds', 0.2);
    u.uWarp.value = p.num('cu.rmWarp');
    u.uEvolve.value = 1 / 30;
    u.uLayers.value = p.num('cu.rmLayers');
    u.uCoreR.value = p.num('cu.rmCore');
    u.uGrowth.value = this.growth;
    u.uSwell.value = p.num('cu.rmSwell') * modScale(g, 'swell', 0);
    u.uTwist.value = p.num('cu.rmTwist');
    u.uOuter.value.set(p.str('cu.rmOuter'));
    u.uInner.value.set(p.str('cu.rmInner'));
    u.uGlowCol.value.set(p.str('cu.rmGlowColor'));
    u.uRimCol.value.set(p.str('cu.rmRimColor'));
    u.uSpeckCol.value.set(p.str('cu.rmSpeckColor'));
    u.uDustCol.value.set(p.str('cu.rmDustColor'));
    u.uDepthMix.value = p.num('cu.rmDepthMix');
    const az = (p.num('cu.rmLightAz') * Math.PI) / 180, el = (p.num('cu.rmLightEl') * Math.PI) / 180;
    // light direction in view terms: 0° from the right, 90° from above-front, 180° from the left
    const lv = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), 0.6).normalize();
    u.uKeyDir.value.copy(lv.transformDirection(cam.matrixWorld));
    u.uKeyCol.value.set(p.str('cu.rmLightColor'));
    u.uKey.value = p.num('cu.rmKey') * modScale(g, 'light', 0.1);
    u.uAmbient.value = p.num('cu.rmAmbient');
    u.uRim.value = p.num('cu.rmRim');
    u.uTrans.value = p.num('cu.rmTranslucency');
    u.uGloss.value = p.num('cu.rmGloss');
    u.uGrain.value = p.num('cu.rmGrain');
    u.uGlow.value = p.num('cu.rmGlow') * (1 + sig.loudness * 0.5);
    u.uHaze.value = p.num('cu.rmHaze');
    u.uSpeck.value = p.num('cu.rmSpeck');
    u.uDust.value = p.num('cu.rmDust') * modScale(g, 'wisps', 0);
    u.uDustSize.value = p.num('cu.rmDustSize');
    u.uAO.value = p.num('cu.rmAO');
    u.uNumNotes.value = live.length;

    // threads
    this.buildThreads();
    const tu = this.threadMat.uniforms;
    tu.uRes.value.set(this.width, this.height);
    tu.uColor.value.set(p.str('cu.rmThreadColor'));
    tu.uAlpha.value = p.num('cu.rmThreadOpacity') * smoothstep01((this.growth - 0.4) / 0.4);
    tu.uTime.value = time;

    // render
    const r = this.ctx.renderer;
    this.quad.material = this.marchMat;
    r.setRenderTarget(this.marchTarget);
    r.render(this.quadScene, this.quadCam);
    this.quad.material = this.upMat;
    this.upMat.uniforms.uTexel.value.set(1 / mw, 1 / mh);
    this.upMat.uniforms.uSharpen.value = p.num('cu.rmSharpen');
    r.setRenderTarget(this.outTarget);
    r.render(this.quadScene, this.quadCam);
    if (tu.uAlpha.value > 0.001) r.render(this.threadScene, cam);
    r.setRenderTarget(null);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.outTarget.setSize(width, height);
  }

  clear() {
    this.growth = this.p.num('cu.rmStart');
    this.notes = [];
  }

  dispose() {
    this.marchTarget.dispose();
    this.outTarget.dispose();
    this.marchMat.dispose();
    this.upMat.dispose();
    this.threadMat.dispose();
    this.threads.geometry.dispose();
  }
}

function smoothstep01(x: number) {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
}
