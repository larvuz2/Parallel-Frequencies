import * as THREE from 'three';
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import type { ControlEvent, EngineContext, MovementInstance, NoteOffEvent, NoteOnEvent, PointerState } from '../../core/types';
import { clamp } from '../../core/noise';
import { modScale, modSums } from '../../core/Modulation';
import { durationNorm, pitchNorm } from '../../core/Signals';
import { FULLSCREEN_VERT } from '../../shaders/common';
import { CameraDirector } from '../neoplasticism/CameraDirector';
import { VISION_CAMERA } from './params';
import { BG_MODE, SCRIABIN, visionPalette } from './palettes';
import {
  ACCUM_FRAG, BACKGROUND_FRAG, COLOR_SHADER, COMPOSE_FRAG, MAX_SOURCES, POINTS_FRAG, POINTS_VERT, POSITION_SHADER, VELOCITY_SHADER,
} from './shaders';

const SHAPE_ID: Record<string, number> = { eye: 0, flower: 1, halo: 2, galaxy: 3, knot: 4, nebula: 5 };
const AUTO_SEQUENCE = ['eye', 'flower', 'halo', 'galaxy', 'knot', 'eye', 'nebula'];

interface Source {
  pos: THREE.Vector3;
  color: THREE.Color;
  burst: number;
  vortex: number;
  radius: number;
  held: boolean;
  age: number;
  released: number;
  key: number;
  note: number;
}

/**
 * Symbolism × Scriabin — a dreaming particle cloud simulated entirely on the GPU.
 */
export class SymbolismWorld implements MovementInstance {
  private gpu!: GPUComputationRenderer;
  private posVar!: Variable;
  private velVar!: Variable;
  private colVar!: Variable;
  private size = 0;
  private points!: THREE.Points;
  private pointsMat: THREE.ShaderMaterial;
  private pointScene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
  private director = new CameraDirector();
  private bgTarget: THREE.WebGLRenderTarget;
  private partTarget: THREE.WebGLRenderTarget;
  private accA: THREE.WebGLRenderTarget;
  private accB: THREE.WebGLRenderTarget;
  private outTarget: THREE.WebGLRenderTarget;
  private bgMat: THREE.RawShaderMaterial;
  private accMat: THREE.RawShaderMaterial;
  private compMat: THREE.RawShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private sources: Source[] = [];
  private time = 0;
  private width = 2;
  private height = 2;
  private shapeA = 0;
  private shapeB = 0;
  private morph = 1;
  private autoIdx = 0;
  private shapeSince = 0;
  private spin = 0;
  private lastRoot = -1;
  private lastNote = -10;
  private phraseNotes = 0;
  private focus = new THREE.Vector3();
  private centroid = new THREE.Vector3();
  private keyColor = new THREE.Color('#6a5ab0');
  private userYaw = 0;
  private userPitch = 0;
  private userZoom = 1;
  private srcPos = Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4());
  private srcForce = Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4());
  private srcCol = Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4());
  private pal = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.userZoom = clamp(this.userZoom * Math.exp(e.deltaY * 0.0012), 0.2, 3);
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const i = parseInt(e.key, 10);
    if (i >= 1 && i <= VISION_CAMERA.length) this.ctx.params.set('sy.camera', VISION_CAMERA[i - 1].value);
  };

  constructor(private ctx: EngineContext) {
    const r = ctx.renderer;
    const s = r.getDrawingBufferSize(new THREE.Vector2());
    this.width = s.x;
    this.height = s.y;
    const mk = () => new THREE.WebGLRenderTarget(s.x, s.y, { type: THREE.HalfFloatType, depthBuffer: false });
    this.bgTarget = mk();
    this.partTarget = mk();
    this.accA = mk();
    this.accB = mk();
    this.outTarget = mk();

    const raw = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.bgMat = raw(BACKGROUND_FRAG, {
      uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uTime: { value: 0 }, uMode: { value: 0 },
      uTintA: { value: new THREE.Color() }, uTintB: { value: new THREE.Color() }, uKeyCol: { value: new THREE.Color() }, uFog: { value: 1 }, uAspect: { value: 1 },
    });
    this.accMat = raw(ACCUM_FRAG, { uPrev: { value: null }, uNew: { value: null }, uPersist: { value: 0.75 } });
    this.compMat = raw(COMPOSE_FRAG, { uBg: { value: null }, uAcc: { value: null }, uInk: { value: 0 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bgMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.pointsMat = new THREE.ShaderMaterial({
      uniforms: {
        tPos: { value: null }, tVel: { value: null }, tCol: { value: null }, uSize: { value: 1 }, uScale: { value: 500 },
        uTime: { value: 0 }, uSparkle: { value: 0.3 }, uBright: { value: 1 }, uInk: { value: 0 },
      },
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.buildSimulation(parseInt(ctx.params.str('sy.count'), 10) || 256);
    r.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    this.director.pos.set(0, 1.5, 9);
    const first = ctx.params.str('sy.shape');
    this.shapeA = this.shapeB = SHAPE_ID[first] ?? 0;
  }

  get output() {
    return this.outTarget.texture;
  }

  /* -------------------------------------------------------------------------- simulation */

  private buildSimulation(size: number) {
    if (this.gpu) {
      this.gpu.dispose();
      this.pointScene.remove(this.points);
      this.points.geometry.dispose();
    }
    this.size = size;
    const r = this.ctx.renderer;
    this.gpu = new GPUComputationRenderer(size, size, r);
    if (!r.extensions.has('EXT_color_buffer_float')) this.gpu.setDataType(THREE.HalfFloatType);
    const p0 = this.gpu.createTexture();
    const v0 = this.gpu.createTexture();
    const c0 = this.gpu.createTexture();
    const pd = p0.image.data as unknown as Float32Array;
    const cd = c0.image.data as unknown as Float32Array;
    for (let i = 0; i < size * size; i++) {
      // start as a soft sphere of dust
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, rr = 3 * Math.cbrt(Math.random());
      const s = Math.sqrt(1 - u * u);
      pd[i * 4] = s * Math.cos(a) * rr;
      pd[i * 4 + 1] = u * rr;
      pd[i * 4 + 2] = s * Math.sin(a) * rr;
      pd[i * 4 + 3] = Math.random();
      cd[i * 4] = 0.4; cd[i * 4 + 1] = 0.35; cd[i * 4 + 2] = 0.7; cd[i * 4 + 3] = 0;
    }
    this.velVar = this.gpu.addVariable('textureVelocity', VELOCITY_SHADER, v0);
    this.posVar = this.gpu.addVariable('texturePosition', POSITION_SHADER, p0);
    this.colVar = this.gpu.addVariable('textureColor', COLOR_SHADER, c0);
    this.gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);
    this.gpu.setVariableDependencies(this.colVar, [this.posVar, this.colVar]);
    const vu = this.velVar.material.uniforms;
    Object.assign(vu, {
      uTime: { value: 0 }, uDt: { value: 0.016 }, uShapeA: { value: 0 }, uShapeB: { value: 0 }, uMorph: { value: 1 },
      uCoherence: { value: 1.5 }, uFlow: { value: 0.7 }, uFlowScale: { value: 0.7 }, uFlowSpeed: { value: 0.1 }, uDamping: { value: 2 },
      uSize: { value: 1 }, uSpin: { value: 0 }, uNumSrc: { value: 0 }, uSrcPos: { value: this.srcPos }, uSrcForce: { value: this.srcForce },
      uPetals: { value: 6 }, uKnotQ: { value: 5 },
    });
    Object.assign(this.posVar.material.uniforms, { uDt: { value: 0.016 } });
    Object.assign(this.colVar.material.uniforms, {
      uDt: { value: 0.016 }, uFade: { value: 6 }, uDye: { value: 1 }, uPal: { value: this.pal }, uKeyCol: { value: this.keyColor },
      uKeyTint: { value: 0.35 }, uNumSrc: { value: 0 }, uSrcPos: { value: this.srcPos }, uSrcForce: { value: this.srcForce }, uSrcCol: { value: this.srcCol },
    });
    const err = this.gpu.init();
    if (err) console.error('Symbolism simulation:', err);

    const g = new THREE.BufferGeometry();
    const n = size * size;
    const ref = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      ref[i * 2] = ((i % size) + 0.5) / size;
      ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('ref', new THREE.BufferAttribute(ref, 2));
    this.points = new THREE.Points(g, this.pointsMat);
    this.points.frustumCulled = false;
    this.pointScene.add(this.points);
  }

  /* -------------------------------------------------------------------------- notes */

  noteOn(e: NoteOnEvent) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    const m = modSums(p.routes, { ...sig, velocity: e.velocity, pitch: pitchNorm(e.note), duration: e.duration !== undefined ? durationNorm(e.duration) : 0.35 });
    this.lastNote = this.time;
    this.phraseNotes++;
    const size = p.num('sy.size');
    const pos = new THREE.Vector3();
    const place = p.str('sy.place');
    if (place === 'centre') pos.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3);
    else if (place === 'random') pos.set(Math.random() * 4 - 2, Math.random() * 3.6 - 1.8, Math.random() * 4 - 2).multiplyScalar(size);
    else {
      const a = (((e.note % 12) * 7) % 12) / 12 * Math.PI * 2 + this.spin;
      const y = (pitchNorm(e.note) * 2 - 1) * 1.7;
      const rr = Math.sqrt(Math.max(0.2, 2.9 - y * y * 0.6));
      pos.set(Math.cos(a) * rr, y, Math.sin(a) * rr).multiplyScalar(size);
    }
    const pal = visionPalette(p.str('sy.palette'));
    const from = p.str('sy.colorFrom');
    const useScriabin = from === 'scriabin' || (from === 'palette' && pal.scriabin);
    let color: THREE.Color;
    if (useScriabin) color = new THREE.Color(SCRIABIN[e.note % 12]);
    else {
      const acc = pal.accents ?? pal.rest;
      const idx = from === 'register' ? Math.min(acc.length - 1, Math.floor(pitchNorm(e.note) * acc.length)) : Math.floor(Math.random() * acc.length);
      color = new THREE.Color(acc[idx]);
    }
    this.sources.push({
      pos, color,
      burst: p.num('sy.burst') * modScale(m, 'burst', 0) * (0.3 + e.velocity),
      vortex: p.num('sy.vortex') * modScale(m, 'vortex', 0) * (Math.random() < 0.5 ? 1 : -1),
      radius: p.num('sy.radius') * modScale(m, 'radius', 0.1) * size,
      held: true, age: 0, released: -1, key: e.note * 64 + (e.channel & 63), note: e.note,
    });
    if (this.sources.length > MAX_SOURCES * 3) this.sources.splice(0, this.sources.length - MAX_SOURCES * 3);
    this.focus.copy(pos);
    this.centroid.lerp(pos, 0.2);
  }

  noteOff(e: NoteOffEvent) {
    if (this.ctx.signals.values.pedal >= 0.5 && this.ctx.params.bool('src.pedalSustain')) return;
    const k = e.note * 64 + (e.channel & 63);
    for (const s of this.sources) if (s.key === k && s.held) { s.held = false; s.released = 0; }
  }

  control(e: ControlEvent) {
    if (e.controller === 64 && e.value < 0.5) {
      for (const s of this.sources) if (s.held && !this.ctx.signals.active.has(s.note)) { s.held = false; s.released = 0; }
    }
  }

  allNotesOff() {
    for (const s of this.sources) if (s.held) { s.held = false; s.released = 0; }
  }

  /* -------------------------------------------------------------------------- frame */

  update(dt: number, time: number, pointers: PointerState[]) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    this.time = time;
    const g = modSums(p.routes, sig);
    const count = parseInt(p.str('sy.count'), 10) || 256;
    if (count !== this.size) this.buildSimulation(count);

    // ---- key colour (Scriabin) of the current harmony
    const root = this.ctx.signals.root;
    const target = new THREE.Color(SCRIABIN[root]);
    this.keyColor.lerp(target, 1 - Math.exp(-dt * 0.5));

    // ---- choose the vision
    const phraseEnded = this.phraseNotes >= 6 && time - this.lastNote > p.num('sy.phraseGap');
    if (phraseEnded) this.phraseNotes = 0;
    const shapeSel = p.str('sy.shape');
    let want = this.shapeB;
    if (shapeSel === 'auto') {
      const held = time - this.shapeSince;
      const keyChanged = this.lastRoot >= 0 && root !== this.lastRoot && sig.loudness > 0.5;
      if (held > p.num('sy.cycle') && (phraseEnded || keyChanged)) {
        this.autoIdx = (this.autoIdx + 1) % AUTO_SEQUENCE.length;
        want = SHAPE_ID[AUTO_SEQUENCE[this.autoIdx]];
      }
    } else want = SHAPE_ID[shapeSel] ?? 0;
    this.lastRoot = root;
    if (want !== this.shapeB) {
      this.shapeA = this.morph >= 1 ? this.shapeB : this.shapeA;
      this.shapeB = want;
      this.morph = 0;
      this.shapeSince = time;
    }
    this.morph = Math.min(1, this.morph + dt / Math.max(0.2, p.num('sy.morphTime')));
    if (this.morph >= 1) this.shapeA = this.shapeB;
    this.spin += dt * p.num('sy.spin') * 0.4;

    // ---- sources: bursts decay, held notes keep a vortex
    const decay = p.num('sy.decay');
    this.sources = this.sources.filter((s) => s.released < decay * 2.5);
    for (const s of this.sources) {
      s.age += dt;
      if (s.released >= 0) s.released += dt;
    }
    const live = this.sources
      .map((s) => {
        const env = s.held ? 1 : Math.exp((-s.released / Math.max(0.05, decay)) * 2.5);
        const burst = s.burst * Math.exp(-s.age * 5);
        return { s, env, burst, w: env + burst };
      })
      .sort((a, b) => b.w - a.w)
      .slice(0, MAX_SOURCES);
    live.forEach(({ s, env, burst }, i) => {
      this.srcPos[i].set(s.pos.x, s.pos.y, s.pos.z, 0);
      this.srcForce[i].set(burst, s.vortex * env * (s.held ? 1 : 0.5), s.radius, 0);
      this.srcCol[i].set(s.color.r, s.color.g, s.color.b, Math.min(1, env * 0.7 + burst * 0.5));
    });

    // ---- simulate
    const sdt = Math.min(dt, 1 / 30);
    const tension = sig.tension;
    const vu = this.velVar.material.uniforms;
    vu.uTime.value = time;
    vu.uDt.value = sdt;
    vu.uShapeA.value = this.shapeA;
    vu.uShapeB.value = this.shapeB;
    vu.uMorph.value = this.morph;
    vu.uCoherence.value = p.num('sy.coherence') * modScale(g, 'coherence', 0) * Math.max(0.05, 1 - p.num('sy.dissolve') * tension * 1.1);
    vu.uFlow.value = p.num('sy.flow') * modScale(g, 'flow', 0);
    vu.uFlowScale.value = p.num('sy.flowScale');
    vu.uFlowSpeed.value = p.num('sy.flowSpeed');
    vu.uDamping.value = p.num('sy.damping');
    vu.uSize.value = p.num('sy.size') * modScale(g, 'scale', 0.2);
    vu.uSpin.value = this.spin;
    vu.uNumSrc.value = live.length;
    vu.uPetals.value = Math.round(p.num('sy.petals'));
    vu.uKnotQ.value = shapeSel === 'auto' ? 3 + (((root * 7) % 12) % 6) : Math.round(p.num('sy.knotQ'));
    this.posVar.material.uniforms.uDt.value = sdt;
    const cu = this.colVar.material.uniforms;
    cu.uDt.value = sdt;
    cu.uFade.value = p.num('sy.colorFade');
    cu.uDye.value = p.num('sy.dye') * modScale(g, 'dye', 0);
    cu.uKeyTint.value = p.num('sy.keyTint');
    cu.uNumSrc.value = live.length;
    const pal = visionPalette(p.str('sy.palette'));
    pal.rest.forEach((c, i) => this.pal[i].set(c));
    this.gpu.compute();

    // ---- camera
    for (const pt of pointers) {
      if (!pt.down) continue;
      this.userYaw -= pt.vx * dt * 4.5;
      this.userPitch = clamp(this.userPitch + pt.vy * dt * 2.5, -0.6, 1.0);
    }
    const R = 2.4 * p.num('sy.size');
    const fov = p.num('sy.fov');
    const lat = [-0.8, 0, 0.8].map((x) => x * R);
    this.director.update({
      dt, time, mode: p.str('sy.camera'), pace: p.num('sy.camSpeed'), closeness: p.num('sy.closeness'),
      revealTime: p.num('sy.revealTime'), handheld: p.num('sy.handheld'), react: 0.6, fov,
      extent: new THREE.Vector3(R, R, R), focus: this.focus, focusAxis: 1, centroid: this.centroid,
      loudness: sig.loudness, density: sig.density, pulse: sig.pulse,
      energy: clamp((modScale(g, 'camera', 0) - 1) * 0.8, 0, 2),
      distanceMod: (modScale(g, 'closeup', 0) - 1) * 0.6,
      phraseEnded, newLine: null, lattice: [lat, lat, lat],
      userYaw: this.userYaw, userPitch: this.userPitch, userZoom: this.userZoom,
    });
    const cam = this.camera;
    cam.fov = fov;
    cam.aspect = this.width / this.height;
    cam.position.copy(this.director.pos);
    cam.lookAt(this.director.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // ---- render
    let bg = p.str('sy.background');
    if (bg === 'auto') bg = pal.background;
    const ink = bg === 'paper' ? 1 : 0;
    const bu = this.bgMat.uniforms;
    bu.uInvProj.value.copy(cam.projectionMatrixInverse);
    bu.uCamWorld.value.copy(cam.matrixWorld);
    bu.uTime.value = time;
    bu.uMode.value = BG_MODE[bg] ?? 0;
    bu.uTintA.value.set(pal.fogA);
    bu.uTintB.value.set(pal.fogB);
    bu.uKeyCol.value.copy(this.keyColor);
    bu.uFog.value = p.num('sy.fog');
    bu.uAspect.value = this.width / this.height;

    const pu = this.pointsMat.uniforms;
    pu.tPos.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    pu.tVel.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
    pu.tCol.value = this.gpu.getCurrentRenderTarget(this.colVar).texture;
    // keep perceived density similar across particle counts
    const densityComp = Math.sqrt(262144 / (count * count));
    pu.uSize.value = p.num('sy.pointSize') * 0.011 * Math.pow(densityComp, 0.5);
    pu.uScale.value = this.height / (2 * Math.tan((fov * Math.PI) / 360));
    pu.uTime.value = time;
    pu.uSparkle.value = p.num('sy.sparkle');
    pu.uBright.value = p.num('sy.bright') * modScale(g, 'bright', 0.1) * densityComp * (ink ? 0.6 : 1);
    pu.uInk.value = ink;

    const r = this.ctx.renderer;
    // background
    this.quad.material = this.bgMat;
    r.setRenderTarget(this.bgTarget);
    r.render(this.quadScene, this.quadCam);
    // particles of this frame
    r.setRenderTarget(this.partTarget);
    r.setClearColor(0x000000, 1);
    r.clear(true, false, false);
    r.render(this.pointScene, cam);
    // trails
    const persist = clamp(p.num('sy.trails') * modScale(g, 'trails', 0), 0, 0.98);
    this.accMat.uniforms.uPrev.value = this.accA.texture;
    this.accMat.uniforms.uNew.value = this.partTarget.texture;
    this.accMat.uniforms.uPersist.value = persist;
    this.quad.material = this.accMat;
    r.setRenderTarget(this.accB);
    r.render(this.quadScene, this.quadCam);
    [this.accA, this.accB] = [this.accB, this.accA];
    // compose
    this.compMat.uniforms.uBg.value = this.bgTarget.texture;
    this.compMat.uniforms.uAcc.value = this.accA.texture;
    this.compMat.uniforms.uInk.value = ink;
    this.quad.material = this.compMat;
    r.setRenderTarget(this.outTarget);
    r.render(this.quadScene, this.quadCam);
    r.setRenderTarget(null);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    for (const t of [this.bgTarget, this.partTarget, this.accA, this.accB, this.outTarget]) t.setSize(width, height);
  }

  clear() {
    for (const s of this.sources) if (s.held) { s.held = false; s.released = 0; }
    const r = this.ctx.renderer;
    for (const t of [this.accA, this.accB]) {
      r.setRenderTarget(t);
      r.clear(true, false, false);
    }
    r.setRenderTarget(null);
    this.userYaw = 0;
    this.userPitch = 0;
    this.userZoom = 1;
  }

  dispose() {
    this.ctx.renderer.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    this.gpu.dispose();
    this.points.geometry.dispose();
    this.pointsMat.dispose();
    for (const t of [this.bgTarget, this.partTarget, this.accA, this.accB, this.outTarget]) t.dispose();
    this.bgMat.dispose();
    this.accMat.dispose();
    this.compMat.dispose();
  }
}

