import * as THREE from 'three';
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ControlEvent, EngineContext, MovementInstance, NoteOffEvent, NoteOnEvent, PointerState } from '../../core/types';
import { clamp, simplex3 } from '../../core/noise';
import { modScale, modSums } from '../../core/Modulation';
import { durationNorm, pitchNorm } from '../../core/Signals';
import { CameraDirector } from '../neoplasticism/CameraDirector';
import { VITRINE_CAMERA } from './params';
import { veinPalette, WOODS } from './palettes';
import { createMatter } from './matter';
import { FIBRE_FRAG, FIBRE_VERT, GLOW_SHADER, MAX_SOURCES, NORMAL_SHADER, POSITION_SHADER, VELOCITY_SHADER } from './shaders';

const FRAME = { w: 5.6, h: 2.9, d: 2.0, t: 0.11 };

interface Source {
  pos: THREE.Vector3;
  color: THREE.Color;
  burst: number;
  held: boolean;
  age: number;
  released: number;
  key: number;
  note: number;
  radius: number;
}

/**
 * Vitrine — a living mass of combed fibres inside a walnut frame. It starts empty and accumulates
 * with the music: every note releases particles where it lands, they stream onto the crumpled form,
 * and the form swells and glows under the notes.
 */
export class VitrineWorld implements MovementInstance {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 100);
  private director = new CameraDirector();
  private target: THREE.WebGLRenderTarget;
  private gpu!: GPUComputationRenderer;
  private posVar!: Variable;
  private velVar!: Variable;
  private nrmVar!: Variable;
  private glowVar!: Variable;
  private size = 0;
  private fibres!: THREE.LineSegments;
  private dots!: THREE.Points;
  private fibreMat: THREE.ShaderMaterial;
  private dotMat: THREE.ShaderMaterial;
  private frame = new THREE.Group();
  private matter = createMatter();
  private woodMat: THREE.MeshPhysicalMaterial;
  private floor: THREE.Mesh;
  private key = new THREE.DirectionalLight(0xffffff, 1.2);
  private fill = new THREE.HemisphereLight(0x8a8f99, 0x1a1512, 0.25);
  private top = new THREE.SpotLight(0xfff1e0, 30, 14, 0.75, 0.9, 1.6);
  private envTex: THREE.Texture;
  private sources: Source[] = [];
  private spawned = 0;
  private time = 0;
  private width = 2;
  private height = 2;
  private lastNote = -100;
  private phraseNotes = 0;
  private birth = new THREE.Vector3(0, 0, 1.2);
  private focus = new THREE.Vector3();
  private centroid = new THREE.Vector3();
  private userYaw = 0;
  private userPitch = 0;
  private userZoom = 1;
  private woodId = '';
  private srcPos = Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4());
  private srcForce = Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4());
  private srcCol = Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4());
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.userZoom = clamp(this.userZoom * Math.exp(e.deltaY * 0.0012), 0.3, 3);
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const i = parseInt(e.key, 10);
    if (i >= 1 && i <= VITRINE_CAMERA.length) this.ctx.params.set('vt.camera', VITRINE_CAMERA[i - 1].value);
  };

  constructor(private ctx: EngineContext) {
    const r = ctx.renderer;
    const s = r.getDrawingBufferSize(new THREE.Vector2());
    this.width = s.x;
    this.height = s.y;
    this.target = new THREE.WebGLRenderTarget(s.x, s.y, { type: THREE.HalfFloatType, samples: 4 });
    this.scene.background = new THREE.Color(0x000000);
    // a dark gallery: the floor fades into black, a soft spot from above grazes the wood
    this.scene.fog = new THREE.Fog(0x000000, 7, 16);
    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.25;
    this.top.position.set(-1.5, 6, 3.5);
    this.top.target.position.set(0, -0.5, 0);
    this.scene.add(this.top, this.top.target);

    // ---- the walnut vitrine
    this.woodMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.45 });
    this.buildFrame();
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.85, metalness: 0, envMapIntensity: 0.1 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -FRAME.h / 2 - 0.001;
    this.scene.add(this.frame, this.floor, this.key, this.key.target, this.fill, this.matter);
    const mu = (this.matter.material as THREE.ShaderMaterial).uniforms;
    mu.uSrcPos.value = this.srcPos;
    mu.uSrcForce.value = this.srcForce;
    mu.uSrcCol.value = this.srcCol;

    // ---- fibres & dots
    const common = {
      tPos: { value: null }, tVel: { value: null }, tNrm: { value: null }, tGlow: { value: null }, uSegLen: { value: 0.05 },
      uSpawned: { value: 0 }, uKeyDir: { value: new THREE.Vector3(-0.5, 0.7, 0.5).normalize() }, uKey: { value: 1 }, uAmbient: { value: 0.12 },
      uRim: { value: 0.6 }, uAlbedo: { value: new THREE.Color(0.32, 0.32, 0.34) }, uSheen: { value: 0.6 }, uCrestGlow: { value: 0.8 },
      uVeinA: { value: new THREE.Color() }, uVeinB: { value: new THREE.Color() }, uVeinC: { value: new THREE.Color() },
      uWisps: { value: 0.14 }, uThick: { value: 0.25 }, uOpacity: { value: 0.5 }, uDotSize: { value: 1 }, uTime: { value: 0 },
    };
    const blend = {
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    } as const;
    this.fibreMat = new THREE.ShaderMaterial({ uniforms: common, vertexShader: FIBRE_VERT, fragmentShader: FIBRE_FRAG, ...blend });
    this.dotMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(common),
      vertexShader: FIBRE_VERT,
      fragmentShader: FIBRE_FRAG,
      defines: { DOTS: '' },
      ...blend,
    });

    this.buildSimulation(parseInt(ctx.params.str('vt.count'), 10) || 512);
    this.spawned = ctx.params.num('vt.startFill');

    r.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
  }

  get output() {
    return this.target.texture;
  }

  /* ------------------------------------------------------------------------- frame */

  private buildFrame() {
    for (const c of [...this.frame.children]) {
      this.frame.remove(c);
      (c as THREE.Mesh).geometry.dispose();
    }
    const { w, h, d, t } = FRAME;
    const beam = (len: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number) => {
      const g = new THREE.BoxGeometry(len, t, t);
      const m = new THREE.Mesh(g, this.woodMat);
      if (axis === 'y') m.rotation.z = Math.PI / 2;
      if (axis === 'z') m.rotation.y = Math.PI / 2;
      m.position.set(x, y, z);
      this.frame.add(m);
    };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(h + t, 'y', (sx * w) / 2, 0, (sz * d) / 2);
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) beam(w + t, 'x', 0, (sy * h) / 2, (sz * d) / 2);
      for (const sx of [-1, 1]) beam(d, 'z', (sx * w) / 2, (sy * h) / 2, 0);
    }
  }

  private woodTexture(id: string) {
    const wood = WOODS.find((x) => x.id === id) ?? WOODS[0];
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = wood.base;
    g.fillRect(0, 0, c.width, c.height);
    // long grain lines running along the beam, with gentle waves and knots of darker figure
    for (let i = 0; i < 140; i++) {
      const y0 = Math.random() * c.height;
      const amp = 2 + Math.random() * 6;
      const freq = 0.002 + Math.random() * 0.006;
      const ph = Math.random() * 10;
      g.strokeStyle = Math.random() < 0.6 ? wood.dark : wood.light;
      g.globalAlpha = 0.08 + Math.random() * 0.22;
      g.lineWidth = 0.5 + Math.random() * 2.2;
      g.beginPath();
      for (let x = 0; x <= c.width; x += 8) {
        const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph * 2) * amp * 0.3;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  /* ------------------------------------------------------------------------- simulation */

  private buildSimulation(size: number) {
    if (this.gpu) {
      this.gpu.dispose();
      this.scene.remove(this.fibres, this.dots);
      this.fibres.geometry.dispose();
      this.dots.geometry.dispose();
    }
    this.size = size;
    const r = this.ctx.renderer;
    this.gpu = new GPUComputationRenderer(size, size, r);
    if (!r.extensions.has('EXT_color_buffer_float')) this.gpu.setDataType(THREE.HalfFloatType);
    const p0 = this.gpu.createTexture();
    (p0.image.data as unknown as Float32Array).fill(0);
    const v0 = this.gpu.createTexture();
    const n0 = this.gpu.createTexture();
    const g0 = this.gpu.createTexture();
    this.velVar = this.gpu.addVariable('textureVelocity', VELOCITY_SHADER, v0);
    this.posVar = this.gpu.addVariable('texturePosition', POSITION_SHADER, p0);
    this.nrmVar = this.gpu.addVariable('textureNormal', NORMAL_SHADER, n0);
    this.glowVar = this.gpu.addVariable('textureGlow', GLOW_SHADER, g0);
    this.gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar, this.nrmVar]);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar, this.nrmVar]);
    this.gpu.setVariableDependencies(this.nrmVar, [this.posVar]);
    this.gpu.setVariableDependencies(this.glowVar, [this.posVar, this.glowVar]);
    const field = () => ({
      uTime: { value: 0 }, uR: { value: 1.2 }, uAmp: { value: 0.5 }, uFreq: { value: 0.9 }, uWarp: { value: 0.8 }, uEvolve: { value: 0.02 },
      uStretch: { value: new THREE.Vector3(1.25, 1, 1) },
    });
    Object.assign(this.nrmVar.material.uniforms, field());
    Object.assign(this.velVar.material.uniforms, {
      uTime: { value: 0 }, uDt: { value: 0.016 }, uFlow: { value: 0.3 }, uFlowScale: { value: 1.2 }, uDamping: { value: 2.5 }, uWisps: { value: 0.14 },
      uNumSrc: { value: 0 }, uSrcPos: { value: this.srcPos }, uSrcForce: { value: this.srcForce },
    });
    Object.assign(this.posVar.material.uniforms, field(), {
      uDt: { value: 0.016 }, uSpawned: { value: 0 }, uBirth: { value: new THREE.Vector3() }, uBirthSpread: { value: 0.8 }, uScatter: { value: 0.35 },
      uStick: { value: 8 }, uThick: { value: 0.25 }, uWisps: { value: 0.14 }, uWispReach: { value: 0.7 },
    });
    Object.assign(this.glowVar.material.uniforms, {
      uDt: { value: 0.016 }, uDecay: { value: 2 }, uNumSrc: { value: 0 }, uSrcPos: { value: this.srcPos }, uSrcForce: { value: this.srcForce }, uSrcCol: { value: this.srcCol },
    });
    const err = this.gpu.init();
    if (err) console.error('Vitrine simulation:', err);

    const n = size * size;
    const lineRef = new Float32Array(n * 4);
    const lineEnd = new Float32Array(n * 2);
    const dotRef = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const u = ((i % size) + 0.5) / size, v = (Math.floor(i / size) + 0.5) / size;
      lineRef.set([u, v, u, v], i * 4);
      lineEnd[i * 2 + 1] = 1;
      dotRef[i * 2] = u;
      dotRef[i * 2 + 1] = v;
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    lg.setAttribute('ref', new THREE.BufferAttribute(lineRef, 2));
    lg.setAttribute('aEnd', new THREE.BufferAttribute(lineEnd, 1));
    this.fibres = new THREE.LineSegments(lg, this.fibreMat);
    this.fibres.frustumCulled = false;
    this.fibres.renderOrder = 5;
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    dg.setAttribute('ref', new THREE.BufferAttribute(dotRef, 2));
    dg.setAttribute('aEnd', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.dots = new THREE.Points(dg, this.dotMat);
    this.dots.frustumCulled = false;
    this.dots.renderOrder = 6;
    this.scene.add(this.fibres, this.dots);
  }

  /* ------------------------------------------------------------------------- notes */

  private surfacePoint(note: number) {
    const p = this.ctx.params;
    const lat = (pitchNorm(note) * 2 - 1) * 1.15;                         // low notes low, high notes high
    const lon = (((((note % 12) * 7) % 12) / 11) * 2 - 1) * 1.6;           // circle of fifths, around the front
    const R = p.num('vt.radius') * 1.05;
    return new THREE.Vector3(Math.sin(lon) * Math.cos(lat) * R * 1.25, Math.sin(lat) * R, Math.cos(lon) * Math.cos(lat) * R);
  }

  noteOn(e: NoteOnEvent) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    const m = modSums(p.routes, { ...sig, velocity: e.velocity, pitch: pitchNorm(e.note), duration: e.duration !== undefined ? durationNorm(e.duration) : 0.35 });
    this.lastNote = this.time;
    this.phraseNotes++;
    const pos = this.surfacePoint(e.note);
    const pal = veinPalette(p.str('vt.palette'));
    const t = pitchNorm(e.note);
    const color = new THREE.Color(t < 0.42 ? pal.a : t < 0.66 ? pal.b : pal.c);
    this.sources.push({
      pos, color,
      burst: p.num('vt.swell') * modScale(m, 'swell', 0) * (0.3 + e.velocity),
      held: true, age: 0, released: -1, key: e.note * 64 + (e.channel & 63), note: e.note,
      radius: p.num('vt.glowRadius') * modScale(m, 'glowRadius', 0.2),
    });
    if (this.sources.length > MAX_SOURCES * 3) this.sources.splice(0, this.sources.length - MAX_SOURCES * 3);
    // accumulation: every note releases more matter from where it lands
    if (p.bool('vt.accumulate')) {
      this.spawned = Math.min(1, this.spawned + p.num('vt.perNote') * modScale(m, 'growth', 0) * (0.3 + e.velocity));
      this.birth.copy(pos).multiplyScalar(1.35);
    }
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

  /* ------------------------------------------------------------------------- frame */

  update(dt: number, time: number, pointers: PointerState[]) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    this.time = time;
    const g = modSums(p.routes, sig);
    const count = parseInt(p.str('vt.count'), 10) || 512;
    if (count !== this.size) this.buildSimulation(count);

    // ---- accumulation
    if (!p.bool('vt.accumulate')) this.spawned = 1;
    else {
      this.spawned = Math.min(1, this.spawned + p.num('vt.idleGrowth') * dt);
      const silent = time - this.lastNote;
      if (p.bool('vt.dissolve') && silent > p.num('vt.silentAfter')) {
        this.spawned = Math.max(p.num('vt.startFill'), this.spawned - p.num('vt.dissolveRate') * dt);
      }
    }

    // ---- sources
    const decay = p.num('vt.glowDecay');
    this.sources = this.sources.filter((s) => s.released < decay * 3);
    for (const s of this.sources) {
      s.age += dt;
      if (s.released >= 0) s.released += dt;
    }
    const live = this.sources
      .map((s) => ({ s, env: s.held ? 1 : Math.exp(-s.released / Math.max(0.05, decay)) }))
      .sort((a, b) => b.env - a.env)
      .slice(0, MAX_SOURCES);
    const glowAmt = p.num('vt.noteGlow') * modScale(g, 'glow', 0);
    live.forEach(({ s, env }, i) => {
      this.srcPos[i].set(s.pos.x, s.pos.y, s.pos.z, 0);
      this.srcForce[i].set(s.burst * Math.exp(-s.age * 1.5) * 0.6 + (s.held ? s.burst * 0.25 : 0), 0, s.radius, 0);
      this.srcCol[i].set(s.color.r, s.color.g, s.color.b, env * glowAmt);
    });

    // ---- simulate
    const sdt = Math.min(dt, 1 / 30);
    const evolve = p.num('vt.evolve') * modScale(g, 'evolve', 0);
    this.velVar.material.uniforms.uTime.value = time;
    for (const v of [this.posVar, this.nrmVar]) {
      const u = v.material.uniforms;
      u.uTime.value = time;
      u.uR.value = p.num('vt.radius');
      u.uAmp.value = p.num('vt.folds') * modScale(g, 'folds', 0.1);
      u.uFreq.value = p.num('vt.foldScale');
      u.uWarp.value = p.num('vt.warp');
      u.uEvolve.value = evolve;
      u.uStretch.value.set(p.num('vt.width'), 1, 1);
    }
    const vu = this.velVar.material.uniforms;
    vu.uDt.value = sdt;
    vu.uFlow.value = p.num('vt.flow') * modScale(g, 'flow', 0);
    vu.uFlowScale.value = p.num('vt.flowScale');
    vu.uDamping.value = p.num('vt.damping');
    vu.uWisps.value = clamp(p.num('vt.wisps') * modScale(g, 'wisps', 0), 0, 0.45);
    vu.uNumSrc.value = live.length;
    const pu = this.posVar.material.uniforms;
    pu.uDt.value = sdt;
    pu.uStick.value = p.num('vt.stick');
    pu.uThick.value = p.num('vt.thickness');
    pu.uWisps.value = vu.uWisps.value;
    pu.uWispReach.value = p.num('vt.wispReach');
    pu.uSpawned.value = this.spawned;
    pu.uBirth.value.copy(this.birth);
    pu.uScatter.value = p.bool('vt.accumulate') ? p.num('vt.scatter') : 1;
    const gu = this.glowVar.material.uniforms;
    gu.uDt.value = sdt;
    gu.uDecay.value = decay * (1 + sig.pedal);
    gu.uNumSrc.value = live.length;
    this.gpu.compute();

    // ---- look
    const pal = veinPalette(p.str('vt.palette'));
    const wood = p.str('vt.wood');
    if (wood !== this.woodId) {
      this.woodId = wood;
      this.woodMat.map?.dispose();
      this.woodMat.map = this.woodTexture(wood);
      this.woodMat.needsUpdate = true;
    }
    this.frame.visible = p.bool('vt.frame');
    this.floor.visible = p.bool('vt.floor');
    const az = (p.num('vt.keyAz') * Math.PI) / 180, el = (p.num('vt.keyEl') * Math.PI) / 180;
    const keyDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.key.position.copy(keyDir).multiplyScalar(10);
    this.key.intensity = p.num('vt.woodLight') * 1.6;
    this.top.intensity = p.num('vt.woodLight') * 35;
    this.fill.intensity = 0.15 + p.num('vt.ambient') * 0.6;
    for (const mat of [this.fibreMat, this.dotMat]) {
      const u = mat.uniforms;
      u.tPos.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
      u.tVel.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
      u.tNrm.value = this.gpu.getCurrentRenderTarget(this.nrmVar).texture;
      u.tGlow.value = this.gpu.getCurrentRenderTarget(this.glowVar).texture;
      u.uSpawned.value = this.spawned;
      u.uKeyDir.value.copy(keyDir);
      u.uKey.value = p.num('vt.key') * modScale(g, 'light', 0);
      u.uAmbient.value = p.num('vt.ambient') * 0.3;
      u.uRim.value = p.num('vt.rim');
      u.uAlbedo.value.setScalar(p.num('vt.albedo'));
      u.uSheen.value = p.num('vt.sheen');
      u.uCrestGlow.value = p.num('vt.crestGlow');
      u.uVeinA.value.set(pal.a);
      u.uVeinB.value.set(pal.b);
      u.uVeinC.value.set(pal.c);
      u.uWisps.value = vu.uWisps.value;
      u.uThick.value = p.num('vt.thickness');
      u.uTime.value = time;
      u.uSegLen.value = p.num('vt.fibreLength');
    }
    // the body of the matter
    const mu = (this.matter.material as THREE.ShaderMaterial).uniforms;
    const nu = this.nrmVar.material.uniforms;
    for (const k of ['uTime', 'uR', 'uAmp', 'uFreq', 'uWarp', 'uEvolve']) mu[k].value = nu[k].value;
    mu.uStretch.value.copy(nu.uStretch.value);
    mu.uFlowScale.value = p.num('vt.flowScale');
    mu.uKeyDir.value.copy(keyDir);
    mu.uKey.value = this.fibreMat.uniforms.uKey.value;
    mu.uAmbient.value = p.num('vt.ambient') * 0.3;
    mu.uRim.value = p.num('vt.rim');
    mu.uAlbedo.value = p.num('vt.albedo');
    mu.uSheen.value = p.num('vt.sheen');
    mu.uCrestGlow.value = p.num('vt.crestGlow');
    mu.uVeinA.value.set(pal.a);
    mu.uVeinB.value.set(pal.b);
    mu.uVeinC.value.set(pal.c);
    mu.uGrowth.value = this.spawned;
    mu.uStreak.value = p.num('vt.streaks');
    mu.uStripes.value = p.num('vt.strandDensity') * (this.height / 1080);
    mu.uNumSrc.value = live.length;
    this.matter.visible = p.bool('vt.body');

    // more particles → each one fainter, so the mass keeps its density
    const norm = Math.sqrt(262144 / (count * count));
    this.fibreMat.uniforms.uOpacity.value = p.num('vt.fibreOpacity') * norm;
    this.dotMat.uniforms.uOpacity.value = p.num('vt.dotOpacity') * norm;
    this.dotMat.uniforms.uDotSize.value = p.num('vt.dotSize') * (this.height / 1080);
    this.dots.visible = p.num('vt.dotOpacity') > 0.001;

    // ---- camera
    for (const pt of pointers) {
      if (!pt.down) continue;
      this.userYaw -= pt.vx * dt * 4;
      this.userPitch = clamp(this.userPitch + pt.vy * dt * 2, -0.5, 0.8);
    }
    const phraseEnded = this.phraseNotes >= 6 && time - this.lastNote > 1;
    if (phraseEnded) this.phraseNotes = 0;
    const cam = this.camera;
    const fov = p.num('vt.fov');
    cam.fov = fov;
    cam.aspect = this.width / this.height;
    const mode = p.str('vt.camera');
    if (mode === 'gallery') {
      // the museum view: frame filling the picture, a slow breathing sway
      const hfov = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * cam.aspect);
      const fitW = (FRAME.w / 2 + 0.55) / Math.tan(hfov / 2);
      const fitH = (FRAME.h / 2 + 0.35) / Math.tan((fov * Math.PI) / 360);
      // fit the front face of the vitrine (it is nearer the lens than the centre)
      const dist = (Math.max(fitW, fitH) + FRAME.d / 2) * this.userZoom;
      const sway = p.num('vt.sway');
      const yaw = this.userYaw + simplex3(time * 0.02, 1.1, 0) * 0.12 * sway;
      const pitch = this.userPitch + 0.03 + simplex3(time * 0.017, 4.2, 0) * 0.04 * sway;
      cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      cam.lookAt(0, 0, 0);
    } else {
      this.director.update({
        dt, time, mode, pace: p.num('vt.camSpeed'), closeness: 0.7, revealTime: 30, handheld: p.num('vt.sway') * 0.5, react: 0.5,
        fov, extent: new THREE.Vector3(FRAME.w / 2, FRAME.h / 2, FRAME.d / 2), focus: this.focus, focusAxis: 1, centroid: this.centroid,
        loudness: sig.loudness, density: sig.density, pulse: sig.pulse, energy: clamp((modScale(g, 'camera', 0) - 1) * 0.8, 0, 2),
        distanceMod: 0, phraseEnded, newLine: null, lattice: [[-1.5, 0, 1.5], [-0.8, 0, 0.8], [-0.6, 0, 0.6]],
        userYaw: this.userYaw, userPitch: this.userPitch, userZoom: this.userZoom,
      });
      cam.position.copy(this.director.pos);
      cam.lookAt(this.director.target);
    }
    cam.updateProjectionMatrix();

    const r = this.ctx.renderer;
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(this.scene, cam);
    r.setRenderTarget(null);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.target.setSize(width, height);
  }

  clear() {
    this.spawned = this.ctx.params.num('vt.startFill');
    for (const s of this.sources) if (s.held) { s.held = false; s.released = 0; }
    this.userYaw = 0;
    this.userPitch = 0;
    this.userZoom = 1;
  }

  dispose() {
    this.ctx.renderer.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    this.gpu.dispose();
    this.fibres.geometry.dispose();
    this.dots.geometry.dispose();
    this.matter.geometry.dispose();
    (this.matter.material as THREE.Material).dispose();
    this.fibreMat.dispose();
    this.dotMat.dispose();
    this.woodMat.map?.dispose();
    this.woodMat.dispose();
    this.envTex.dispose();
    this.target.dispose();
  }
}
