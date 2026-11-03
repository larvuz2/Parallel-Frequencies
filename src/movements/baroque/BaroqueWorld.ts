import * as THREE from 'three';
import type { ControlEvent, EngineContext, MovementInstance, NoteOffEvent, NoteOnEvent, PointerState } from '../../core/types';
import { clamp, lerp } from '../../core/noise';
import { modScale, modSums } from '../../core/Modulation';
import { durationNorm, pitchNorm } from '../../core/Signals';
import { FULLSCREEN_VERT } from '../../shaders/common';
import { CameraDirector } from '../neoplasticism/CameraDirector';
import { BAROQUE_CAMERA } from './params';
import { BG_COLORS, baroquePalette } from './palettes';
import { MAX_LIGHTS, PIPES, RAYMARCH_FRAG, UPSCALE_FRAG } from './shaders';
import { Trails } from './Trails';

const FORMS: Record<string, number> = { ornament: 0, chambers: 1, vault: 2, baldacchino: 3, monstrance: 4, organ: 5 };
const MATERIALS: Record<string, [number, number, number]> = {
  // roughness, metalness, trap contrast
  gilded: [0.42, 0.85, 0.8],
  bronze: [0.45, 0.85, 1.2],
  marble: [0.22, 0, 0.6],
  velvet: [0.95, 0, 1.4],
  obsidian: [0.08, 0.35, 1],
};

interface VoiceLight {
  voice: number;
  note: number;
  key: number;
  y: number;
  angle: number;
  pos: THREE.Vector3;
  prev: THREE.Vector3;
  color: THREE.Color;
  power: number;
  size: number;
  held: boolean;
  released: number;
  level: number;
  trail: number;
  emitAcc: number;
}

interface Voice {
  last: number;
  lastTime: number;
  phase: number;
  dir: number;
}

/**
 * Baroque × Bach — chiaroscuro and counterpoint.
 * A fractal architecture raymarched in a single shader, lit by a window and by the voices of the
 * music: every note is a candle-light travelling the spiral of its voice, voices circling in
 * opposite directions so their paths cross like counterpoint, leaving trails of golden dust.
 * Harmony slowly re-folds the architecture; cadences open the window.
 */
export class BaroqueWorld implements MovementInstance {
  private director = new CameraDirector();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  private marchTarget: THREE.WebGLRenderTarget;
  private outTarget: THREE.WebGLRenderTarget;
  private marchMat: THREE.RawShaderMaterial;
  private upMat: THREE.RawShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private trailScene = new THREE.Scene();
  private trails = new Trails();
  private lights: VoiceLight[] = [];
  private voices: Voice[] = [];
  private time = 0;
  private width = 2;
  private height = 2;
  private morph = new THREE.Vector4(2.75, 1, 1, 1);
  private rotA = 0;
  private rotB = 0;
  private harmonyAngle = 0;
  private flare = 0;
  private lastOnset = -1;
  private chordCount = 0;
  private chordVel = 0;
  private lastNote = -10;
  private phraseNotes = 0;
  private focus = new THREE.Vector3();
  private centroid = new THREE.Vector3();
  private userYaw = 0;
  private userPitch = 0;
  private userZoom = 1;
  private rot = new THREE.Matrix3();
  private lp = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4());
  private lc = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4());
  private pipes = new Array(PIPES).fill(0);
  private pipeTarget = new Array(PIPES).fill(0);
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.userZoom = clamp(this.userZoom * Math.exp(e.deltaY * 0.0012), 0.2, 3);
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const i = parseInt(e.key, 10);
    if (i >= 1 && i <= BAROQUE_CAMERA.length) this.ctx.params.set('bq.camera', BAROQUE_CAMERA[i - 1].value);
  };

  constructor(private ctx: EngineContext) {
    const size = ctx.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.width = size.x;
    this.height = size.y;
    const ms = ctx.params.num('bq.resolution');
    this.marchTarget = new THREE.WebGLRenderTarget(Math.max(2, Math.round(size.x * ms)), Math.max(2, Math.round(size.y * ms)), {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.outTarget = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthBuffer: false });

    this.marchMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: RAYMARCH_FRAG,
      uniforms: {
        uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uInvProj: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uNear: { value: 0.05 },
        uForm: { value: 0 }, uIter: { value: 8 }, uSteps: { value: 110 }, uMorph: { value: this.morph }, uRot: { value: this.rot },
        uScale: { value: 1 }, uFloorY: { value: -2.2 }, uFloorOn: { value: 1 },
        uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKeyCol: { value: new THREE.Color() }, uKeyPow: { value: 2 },
        uFillCol: { value: new THREE.Color() }, uAmbient: { value: 0.2 }, uGod: { value: 0.7 }, uFog: { value: 0.3 },
        uShadowK: { value: 8 }, uAO: { value: 0.8 }, uMat: { value: new THREE.Vector4(0.3, 1, 1, 0.5) },
        uAlbedoA: { value: new THREE.Color() }, uAlbedoB: { value: new THREE.Color() }, uStone: { value: new THREE.Color() },
        uBg: { value: 0 }, uBgA: { value: new THREE.Color() }, uBgB: { value: new THREE.Color() },
        uNumLights: { value: 0 }, uLP: { value: this.lp }, uLC: { value: this.lc }, uFalloff: { value: 1 }, uHalo: { value: 1 },
        uPipe: { value: this.pipes },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.upMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: UPSCALE_FRAG,
      uniforms: { uSrc: { value: this.marchTarget.texture }, uTexel: { value: new THREE.Vector2() }, uSharpen: { value: 0.35 } },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.marchMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.trailScene.add(this.trails.points);

    ctx.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    this.director.pos.set(4, 1.5, 6);
  }

  get output() {
    return this.outTarget.texture;
  }

  private get R() {
    return 2.3 * this.ctx.params.num('bq.scale');
  }

  /* ------------------------------------------------------------------------------ notes */

  noteOn(e: NoteOnEvent) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    const m = modSums(p.routes, { ...sig, velocity: e.velocity, pitch: pitchNorm(e.note), duration: e.duration !== undefined ? durationNorm(e.duration) : 0.35 });
    const nv = Math.round(p.num('bq.voices'));
    while (this.voices.length < 6) {
      const i = this.voices.length;
      this.voices.push({ last: 36 + i * 10, lastTime: -10, phase: (i / 6) * Math.PI * 2 + 0.4, dir: i % 2 ? -1 : 1 });
    }

    // chords & phrases
    if (this.time - this.lastOnset < 0.06) {
      this.chordCount++;
      this.chordVel = Math.max(this.chordVel, e.velocity);
    } else {
      this.chordCount = 1;
      this.chordVel = e.velocity;
    }
    this.lastOnset = this.time;
    this.lastNote = this.time;
    this.phraseNotes++;
    if (this.chordCount === 3 && this.chordVel > 0.7) this.flare = Math.min(2, this.flare + this.chordVel * p.num('bq.flare'));

    // which voice?
    let v = 0;
    const mode = p.str('bq.voiceFrom');
    if (mode === 'channel') v = e.channel % nv;
    else if (mode === 'register') v = nv - 1 - Math.min(nv - 1, Math.floor(pitchNorm(e.note) * nv));
    else {
      // voice leading: nearest previous pitch, preferring voices that aren't sounding right now
      let best = Infinity;
      for (let i = 0; i < nv; i++) {
        const vc = this.voices[i];
        const busy = this.lights.some((l) => l.voice === i && l.held) ? 7 : 0;
        const stale = this.time - vc.lastTime > 4 ? -2 : 0;
        const cost = Math.abs(e.note - vc.last) + busy + stale;
        if (cost < best) { best = cost; v = i; }
      }
    }
    this.voices[v].last = e.note;
    this.voices[v].lastTime = this.time;

    const pal = baroquePalette(p.str('bq.palette'));
    const R = this.R;
    const y = lerp(-R * 0.75, R * 0.95, pitchNorm(e.note));
    const light: VoiceLight = {
      voice: v,
      note: e.note,
      key: e.note * 64 + (e.channel & 63),
      y,
      angle: this.voiceAngle(v),
      pos: new THREE.Vector3(),
      prev: new THREE.Vector3(),
      color: new THREE.Color(pal.voices[v % pal.voices.length]),
      power: p.num('bq.lightPower') * modScale(m, 'power', 0.05) * (0.4 + 0.8 * e.velocity),
      size: p.num('bq.lightSize') * modScale(m, 'size', 0.1),
      held: true,
      released: -1,
      level: 0,
      trail: modScale(m, 'trail', 0),
      emitAcc: 0,
    };
    this.placeLight(light);
    light.prev.copy(light.pos);
    // the organ: each note sounds a pipe — low notes in the tall towers, high ones in the flats
    const order = this.pipeOrder();
    const rank = Math.round(clamp(pitchNorm(e.note) * 1.25 - 0.1) * (PIPES - 1));
    const pi = order[rank];
    this.pipeTarget[pi] = Math.max(this.pipeTarget[pi], 0.4 + e.velocity);
    (light as VoiceLight & { pipe?: number }).pipe = pi;
    this.lights.push(light);
    this.focus.copy(light.pos);
    this.centroid.lerp(light.pos, 0.2);

    // keep the brightest MAX_LIGHTS*2 at most
    if (this.lights.length > MAX_LIGHTS * 2) {
      this.lights.sort((a, b) => b.level * b.power - a.level * a.power);
      this.lights.length = MAX_LIGHTS * 2;
    }
  }

  private orderCache: number[] | null = null;
  /** pipe indices sorted from tallest to shortest (mirrors pipeHeight in the shader) */
  private pipeOrder() {
    if (this.orderCache) return this.orderCache;
    const h = (i: number) => {
      const a = Math.abs(i);
      return 0.85 + 1.25 * Math.exp((-a * a) / 6) + 0.95 * Math.exp(-((a - 10.5) ** 2) / 3) - 0.025 * a;
    };
    this.orderCache = Array.from({ length: PIPES }, (_, k) => k).sort((a, b) => h(b - 14) - h(a - 14));
    return this.orderCache;
  }

  private voiceAngle(v: number) {
    const vc = this.voices[v];
    return vc.phase;
  }

  private placeLight(l: VoiceLight) {
    const R = this.R * this.ctx.params.num('bq.spread');
    const r = R * (0.55 + 0.13 * l.voice);
    l.pos.set(Math.cos(l.angle) * r, l.y, Math.sin(l.angle) * r);
  }

  noteOff(e: NoteOffEvent) {
    const k = e.note * 64 + (e.channel & 63);
    const pedal = this.ctx.signals.values.pedal >= 0.5 && this.ctx.params.bool('src.pedalSustain');
    if (pedal) return;
    for (const l of this.lights) if (l.key === k && l.held) { l.held = false; l.released = 0; }
  }

  private releasePipes() {
    // pipes keep sounding while any light that owns them is held
    this.pipeTarget.fill(0);
    for (const l of this.lights) {
      const pi = (l as VoiceLight & { pipe?: number }).pipe;
      if (pi !== undefined) this.pipeTarget[pi] = Math.max(this.pipeTarget[pi], l.level * (0.4 + l.power * 0.3));
    }
  }

  control(e: ControlEvent) {
    if (e.controller === 64 && e.value < 0.5) {
      for (const l of this.lights) {
        if (l.held && !this.ctx.signals.active.has(l.note)) { l.held = false; l.released = 0; }
      }
    }
  }

  allNotesOff() {
    for (const l of this.lights) if (l.held) { l.held = false; l.released = 0; }
  }

  /* ------------------------------------------------------------------------------ frame */

  update(dt: number, time: number, pointers: PointerState[]) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    this.time = time;
    const g = modSums(p.routes, sig);
    const pal = baroquePalette(p.str('bq.palette'));

    // ---- voices weave: each voice turns at its own speed, alternating directions
    const weave = p.num('bq.weave') * modScale(g, 'weave', 0);
    for (let i = 0; i < this.voices.length; i++) this.voices[i].phase += dt * weave * (0.6 + 0.18 * i) * this.voices[i].dir;

    // ---- lights: travel their voice's spiral, glow while held, fade after
    const decay = p.num('bq.decay');
    const trailsOn = p.bool('bq.trails');
    const density = p.num('bq.trailDensity');
    const life = p.num('bq.trailLife');
    this.lights = this.lights.filter((l) => l.released < decay * 3);
    for (const l of this.lights) {
      if (l.released >= 0) l.released += dt;
      const target = l.held ? 1 : Math.exp(-l.released / Math.max(0.05, decay) * 2.2);
      l.level += (target - l.level) * (1 - Math.exp(-dt * (l.held ? 18 : 6)));
      l.prev.copy(l.pos);
      const vc = this.voices[l.voice];
      l.angle += (vc ? dt * weave * (0.6 + 0.18 * l.voice) * vc.dir : 0) * (l.held ? 1 : 0.5);
      l.y += dt * 0.04 * (l.held ? 0 : 1);
      this.placeLight(l);
      // golden dust
      if (trailsOn && l.level > 0.05) {
        l.emitAcc += dt * 70 * density * l.trail * l.level * (0.5 + l.power * 0.3);
        const n = Math.min(40, Math.floor(l.emitAcc));
        l.emitAcc -= n;
        for (let k = 0; k < n; k++) {
          const f = k / Math.max(1, n);
          const x = lerp(l.prev.x, l.pos.x, f) + (Math.random() - 0.5) * l.size * 0.8;
          const yy = lerp(l.prev.y, l.pos.y, f) + (Math.random() - 0.5) * l.size * 0.8;
          const z = lerp(l.prev.z, l.pos.z, f) + (Math.random() - 0.5) * l.size * 0.8;
          this.trails.emit(time, x, yy, z, (Math.random() - 0.5) * 0.06, (Math.random() - 0.3) * 0.05, (Math.random() - 0.5) * 0.06,
            life * (0.5 + Math.random() * 0.8), l.color, 0.01 + Math.random() * 0.025);
        }
      }
    }
    this.trails.flush();
    this.releasePipes();
    for (let i = 0; i < PIPES; i++) this.pipes[i] += (this.pipeTarget[i] - this.pipes[i]) * (1 - Math.exp(-dt * 14));
    if (this.lights.length) this.focus.copy(this.lights[this.lights.length - 1].pos);

    // ---- harmony slowly re-folds the architecture
    const morphAmt = p.num('bq.morph') * modScale(g, 'morph', 0);
    const targetHarm = (this.ctx.signals.root / 12) * Math.PI * 2;
    let dh = targetHarm - this.harmonyAngle;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const k = 1 - Math.exp(-dt / Math.max(0.2, p.num('bq.morphTime')));
    this.harmonyAngle += dh * k;
    const tension = sig.tension;
    const twist = p.num('bq.twist');
    this.rotA += (twist * 0.7 + Math.sin(this.harmonyAngle) * 0.25 * morphAmt + Math.sin(time * 0.01) * 0.05 - this.rotA) * k;
    this.rotB += (twist * 0.45 + Math.cos(this.harmonyAngle) * 0.2 * morphAmt + tension * 0.25 * morphAmt - this.rotB) * k;
    const form = p.str('bq.form');
    const isMon = form === 'monstrance';
    const mx = isMon ? 0.35 + sig.loudness * 0.9 * morphAmt + this.flare * 0.3 : form === 'ornament' ? 2.75 + tension * 0.3 * morphAmt : 0.5 + 0.5 * Math.sin(this.harmonyAngle) * morphAmt;
    const my = isMon ? tension * morphAmt * 1.5 : form === 'ornament' ? 1.0 + 0.1 * Math.sin(this.harmonyAngle * 2) * morphAmt : 0.5 + tension * 0.5 * morphAmt;
    const mz = isMon ? this.harmonyAngle * 0.15 * morphAmt + time * 0.01 : form === 'ornament' ? 1.0 + 0.12 * Math.cos(this.harmonyAngle) * morphAmt : 0.5 + 0.3 * Math.cos(this.harmonyAngle) * morphAmt;
    const mw = form === 'ornament' ? 1.0 + 0.15 * sig.loudness * morphAmt : 0;
    this.morph.x += (mx - this.morph.x) * k;
    this.morph.y += (my - this.morph.y) * k;
    this.morph.z += (mz - this.morph.z) * k;
    this.morph.w += (mw - this.morph.w) * k;
    const e = new THREE.Euler(this.rotA, this.rotB, this.rotA * 0.5);
    this.rot.setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(e));

    // ---- cadence flare decays
    this.flare *= Math.exp(-dt * 0.8);

    // ---- phrase ends
    const phraseEnded = this.phraseNotes >= 6 && time - this.lastNote > p.num('bq.phraseGap');
    if (phraseEnded) this.phraseNotes = 0;

    // ---- user hand
    for (const pt of pointers) {
      if (!pt.down) continue;
      this.userYaw -= pt.vx * dt * 4.5;
      this.userPitch = clamp(this.userPitch + pt.vy * dt * 2.5, -0.6, 1.0);
    }

    // ---- camera
    const R = this.R;
    const fov = p.num('bq.fov');
    const lat = [-0.9, 0, 0.9].map((x) => x * R);
    this.director.update({
      dt, time,
      mode: p.str('bq.camera'),
      pace: p.num('bq.camSpeed'),
      closeness: p.num('bq.closeness'),
      revealTime: p.num('bq.revealTime'),
      handheld: p.num('bq.handheld'),
      react: 0.6,
      fov,
      extent: new THREE.Vector3(R, R, R),
      focus: this.focus,
      focusAxis: 1,
      centroid: this.centroid,
      loudness: sig.loudness,
      density: sig.density,
      pulse: sig.pulse,
      energy: clamp((modScale(g, 'camera', 0) - 1) * 0.8, 0, 2),
      distanceMod: (modScale(g, 'closeup', 0) - 1) * 0.6,
      phraseEnded,
      newLine: null,
      lattice: [lat, lat.map((x) => x * 0.6), lat],
      userYaw: this.userYaw,
      userPitch: this.userPitch,
      userZoom: this.userZoom,
    });
    const cam = this.camera;
    cam.fov = fov;
    cam.aspect = this.width / this.height;
    cam.near = 0.05;
    cam.far = 200;
    cam.position.copy(this.director.pos);
    // never sink below the floor
    cam.position.y = Math.max(cam.position.y, -R * 0.95 + 0.15);
    cam.lookAt(this.director.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // ---- uniforms
    const u = this.marchMat.uniforms;
    u.uRes.value.set(this.marchTarget.width, this.marchTarget.height);
    u.uTime.value = time;
    u.uInvProj.value.copy(cam.projectionMatrixInverse);
    u.uCamWorld.value.copy(cam.matrixWorld);
    u.uCamPos.value.copy(cam.position);
    u.uNear.value = p.str('bq.camera') === 'flythrough' || p.str('bq.camera') === 'track' ? 0.35 : 0.05;
    u.uForm.value = FORMS[form] ?? 0;
    u.uIter.value = Math.round(p.num('bq.detail'));
    u.uSteps.value = Math.round(p.num('bq.steps'));
    u.uScale.value = p.num('bq.scale');
    u.uFloorOn.value = p.bool('bq.floor') ? 1 : 0;
    u.uFloorY.value = -R * 0.95;
    const az = (p.num('bq.keyAz') * Math.PI) / 180, el = (p.num('bq.keyEl') * Math.PI) / 180;
    if (p.bool('bq.keyFollow')) {
      // view space: az 0° = from the right, 90° = from the camera, 180° = from the left
      const lv = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
      u.uKeyDir.value.copy(lv.transformDirection(cam.matrixWorld));
    } else {
      u.uKeyDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    }
    u.uKeyCol.value.set(pal.key);
    u.uKeyPow.value = p.num('bq.keyPower') * modScale(g, 'window', 0) * (1 + this.flare * 0.6);
    u.uFillCol.value.set(pal.fill);
    u.uAmbient.value = p.num('bq.ambient') * 3;
    u.uGod.value = p.num('bq.godRays');
    u.uFog.value = p.num('bq.fog') * modScale(g, 'dust', 0);
    u.uShadowK.value = lerp(32, 3, p.num('bq.shadowSoft'));
    u.uAO.value = p.num('bq.ao');
    const mat = MATERIALS[p.str('bq.material')] ?? MATERIALS.gilded;
    u.uMat.value.set(mat[0], mat[1], mat[2], 0.6);
    u.uAlbedoA.value.set(pal.shade);
    u.uAlbedoB.value.set(pal.lit);
    u.uStone.value.set(pal.stone);
    let bg = p.str('bq.background');
    if (bg === 'auto') bg = pal.background;
    const [ba, bb, bm] = BG_COLORS[bg] ?? BG_COLORS.void;
    u.uBg.value = bm;
    u.uBgA.value.set(ba);
    u.uBgB.value.set(bb);
    u.uFalloff.value = 1.6 / Math.pow(p.num('bq.reach') * p.num('bq.scale'), 2);
    u.uHalo.value = 1;

    // brightest lights to the shader
    const vis = this.lights.filter((l) => l.level > 0.01).sort((a, b) => b.level * b.power - a.level * a.power).slice(0, MAX_LIGHTS);
    u.uNumLights.value = vis.length;
    vis.forEach((l, i) => {
      this.lp[i].set(l.pos.x, l.pos.y, l.pos.z, l.size * (0.6 + 0.4 * l.level));
      this.lc[i].set(l.color.r, l.color.g, l.color.b, l.power * l.level);
    });

    this.trails.material.uniforms.uTime.value = time;
    this.trails.material.uniforms.uRise.value = p.num('bq.trailRise');
    this.trails.material.uniforms.uScale.value = this.height * 0.9 / Math.tan((fov * Math.PI) / 360) * 0.5;
    this.trails.material.uniforms.uBright.value = 1.4;
    this.trails.material.uniforms.uDepth.value = this.marchTarget.texture;
    this.trails.material.uniforms.uRes.value.set(this.width, this.height);

    this.render();
  }

  private render() {
    const r = this.ctx.renderer;
    const ms = this.ctx.params.num('bq.resolution');
    const mw = Math.max(2, Math.round(this.width * ms)), mh = Math.max(2, Math.round(this.height * ms));
    if (this.marchTarget.width !== mw || this.marchTarget.height !== mh) this.marchTarget.setSize(mw, mh);

    this.quad.material = this.marchMat;
    r.setRenderTarget(this.marchTarget);
    r.render(this.quadScene, this.quadCam);

    this.quad.material = this.upMat;
    this.upMat.uniforms.uTexel.value.set(1 / mw, 1 / mh);
    this.upMat.uniforms.uSharpen.value = this.ctx.params.num('bq.sharpen');
    r.setRenderTarget(this.outTarget);
    r.render(this.quadScene, this.quadCam);
    r.render(this.trailScene, this.camera);
    r.setRenderTarget(null);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.outTarget.setSize(width, height);
  }

  clear() {
    for (const l of this.lights) if (l.held) { l.held = false; l.released = 0; }
    this.trails.clear();
    this.userYaw = 0;
    this.userPitch = 0;
    this.userZoom = 1;
  }

  dispose() {
    this.ctx.renderer.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    this.marchTarget.dispose();
    this.outTarget.dispose();
    this.marchMat.dispose();
    this.upMat.dispose();
    this.trails.dispose();
  }
}
