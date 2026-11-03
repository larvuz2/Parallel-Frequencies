import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ControlEvent, EngineContext, MovementInstance, NoteOffEvent, NoteOnEvent, PointerState } from '../../core/types';
import { clamp, lerp, rng } from '../../core/noise';
import { modScale, modSums } from '../../core/Modulation';
import { durationNorm, pitchNorm } from '../../core/Signals';
import { FULLSCREEN_VERT } from '../../shaders/common';
import { CameraDirector } from './CameraDirector';
import { CAMERA_MODES } from './params';
import { BACKGROUND_FRAG, BG_FOG, BG_MODES, DOF_FRAG } from './shaders';
import { stijlPalette } from './palettes';

const MAX_FORMS = 1600;
const MAX_BEAMS = 3200;
const MAX_PULSES = 900;

interface Beam {
  key: string;
  axis: number;
  /** the two fixed coordinates (the axes other than `axis`, in order) */
  a: number;
  b: number;
  min: number;
  max: number;
  curMin: number;
  curMax: number;
  thick: number;
  curThick: number;
  refs: number;
  idle: number;
  dying: boolean;
}

interface Form {
  key: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  /** 0,1,2 = plane whose normal is x,y,z · 3 = block */
  kind: number;
  /** in-plane axis the form opens along */
  openAxis: number;
  color: THREE.Color;
  colorIndex: number;
  age: number;
  held: boolean;
  noteKey: number;
  velocity: number;
  released: number;
  dying: number;
  pop: number;
  popV: number;
  glow: number;
  /** lines-only mode: the form is never drawn, only its frame of lines */
  hidden: boolean;
  beams: Beam[];
}

interface Pulse {
  beam: Beam;
  pos: number;
  dir: number;
  speed: number;
  life: number;
  age: number;
  size: number;
  color: THREE.Color;
}

/** shared by every material: geometry closer than this to the lens dissolves (camera can pass through) */
const nearFade = { value: 1 };

const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpC = new THREE.Color();

/**
 * Neoplasticism × Mozart.
 * The music assembles a De Stijl construction in space: every note opens a plane or block on an
 * asymmetric lattice, its edges draw black lines outward, and small blocks of colour run along the
 * lines like Broadway traffic. A camera director films it — grazing close-ups that slowly open
 * out to reveal the whole architecture.
 */
export class StijlWorld implements MovementInstance {
  private scene = new THREE.Scene();
  private root = new THREE.Group();
  private persp = new THREE.PerspectiveCamera(34, 1, 0.05, 400);
  private ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 400);
  private director = new CameraDirector();
  private sceneTarget: THREE.WebGLRenderTarget;
  private outTarget: THREE.WebGLRenderTarget;
  private bgScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bgMat: THREE.RawShaderMaterial;
  private dofMat: THREE.RawShaderMaterial;
  private dofScene = new THREE.Scene();
  private formMesh: THREE.InstancedMesh;
  private beamMesh: THREE.InstancedMesh;
  private pulseMesh: THREE.InstancedMesh;
  private formMat: THREE.MeshPhysicalMaterial;
  private beamMat: THREE.MeshStandardMaterial;
  private pulseMat: THREE.MeshStandardMaterial;
  private formGlow: THREE.InstancedBufferAttribute;
  private pulseGlow: THREE.InstancedBufferAttribute;
  private sun = new THREE.DirectionalLight(0xffffff, 2.6);
  private hemi = new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.8);
  private floor: THREE.Mesh;
  private pmrem: THREE.PMREMGenerator;
  private envTex: THREE.Texture;

  private forms: Form[] = [];
  private beams = new Map<string, Beam>();
  private pulses: Pulse[] = [];
  private extent = new THREE.Vector3(6, 4, 3);
  private grid: [number[], number[], number[]] = [[], [], []];
  private centres: [number[], number[], number[]] = [[], [], []];
  private gridKey = '';
  private time = 0;
  private width = 2;
  private height = 2;
  private lastOnset = -1;
  private lastNote = -10;
  private phraseNotes = 0;
  private chordCount = 0;
  private chordVel = 0;
  private tutti = 0;
  private tuttiV = 0;
  private focus = new THREE.Vector3();
  private focusAxis = 0;
  private centroid = new THREE.Vector3();
  private newLine: { origin: THREE.Vector3; axis: number } | null = null;
  private userYaw = 0;
  private userPitch = 0;
  private userZoom = 1;
  private scoreCol = 0;
  private finish = '';
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.userZoom = clamp(this.userZoom * Math.exp(e.deltaY * 0.0012), 0.25, 3);
  };

  /** number keys 1–7 switch camera moves live */
  private onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const i = parseInt(e.key, 10);
    if (i >= 1 && i <= CAMERA_MODES.length) this.ctx.params.set('ds.camera', CAMERA_MODES[i - 1].value);
  };

  constructor(private ctx: EngineContext) {
    const r = ctx.renderer;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const s = ctx.params.num('quality.paintRes');
    this.width = Math.max(2, Math.round(size.x * s));
    this.height = Math.max(2, Math.round(size.y * s));

    this.sceneTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(this.width, this.height, THREE.FloatType),
    });
    this.outTarget = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.HalfFloatType, depthBuffer: false });

    // background
    this.bgMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BACKGROUND_FRAG,
      uniforms: { uMode: { value: 0 }, uAspect: { value: 1 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    });
    const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bgMat);
    bgQuad.frustumCulled = false;
    this.bgScene.add(bgQuad);

    this.dofMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: DOF_FRAG,
      uniforms: {
        uColor: { value: this.sceneTarget.texture }, uDepth: { value: this.sceneTarget.depthTexture }, uTexel: { value: new THREE.Vector2() },
        uNear: { value: 0.05 }, uFar: { value: 400 }, uFocus: { value: 10 }, uAperture: { value: 0.4 }, uMaxPx: { value: 14 },
        uOrtho: { value: 0 }, uRange: { value: 10 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const dofQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dofMat);
    dofQuad.frustumCulled = false;
    this.dofScene.add(dofQuad);

    // environment for soft, believable reflections on lacquer
    this.pmrem = new THREE.PMREMGenerator(r);
    this.envTex = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;

    // lights
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    const sc = this.sun.shadow.camera;
    sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 90;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    // geometry — unit boxes, scaled per instance
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.formMat = new THREE.MeshPhysicalMaterial({ roughness: 0.8, metalness: 0, envMapIntensity: 0.6 });
    this.formGlow = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FORMS), 1);
    this.formMesh = new THREE.InstancedMesh(box.clone(), this.formMat, MAX_FORMS);
    this.formMesh.geometry.setAttribute('aGlow', this.formGlow);
    this.formMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FORMS * 3), 3);
    withGlow(this.formMat);

    this.beamMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55, metalness: 0, envMapIntensity: 0.4 });
    this.beamMesh = new THREE.InstancedMesh(box.clone(), this.beamMat, MAX_BEAMS);
    withGlow(this.beamMat, false);

    this.pulseMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0, envMapIntensity: 0.5 });
    this.pulseGlow = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PULSES), 1);
    this.pulseMesh = new THREE.InstancedMesh(box.clone(), this.pulseMat, MAX_PULSES);
    this.pulseMesh.geometry.setAttribute('aGlow', this.pulseGlow);
    this.pulseMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PULSES * 3), 3);
    withGlow(this.pulseMat);

    for (const m of [this.formMesh, this.beamMesh, this.pulseMesh]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      m.count = 0;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.root.add(m);
    }

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.3, color: 0x000000 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.scene.add(this.root);
    this.scene.fog = new THREE.Fog(0xffffff, 10, 100);

    ctx.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    this.rebuildGrid();
  }

  get output() {
    return this.ctx.params.num('ds.dof') > 0.001 ? this.outTarget.texture : this.sceneTarget.texture;
  }

  /* ----------------------------------------------------------------------------- lattice */

  private rebuildGrid() {
    const p = this.ctx.params;
    const nx = Math.round(p.num('ds.gridX'));
    const ny = Math.round(p.num('ds.gridY'));
    const nz = Math.round(p.num('ds.gridZ'));
    const irr = p.num('ds.irregular');
    const seed = Math.round(p.num('ds.seed'));
    const key = `${nx}|${ny}|${nz}|${irr.toFixed(2)}|${seed}`;
    if (key === this.gridKey) return;
    this.gridKey = key;
    const r = rng(seed * 7919);
    const RATIOS = [1, 1, 2, 3, 5, 1.6, 0.6, 2.5];
    const cuts = (n: number, half: number) => {
      const w = Array.from({ length: n }, () => lerp(1, RATIOS[Math.floor(r() * RATIOS.length)], irr));
      const sum = w.reduce((a, b) => a + b, 0);
      const out = [-half];
      let acc = -half;
      for (const x of w) out.push((acc += (x / sum) * half * 2));
      return out;
    };
    this.extent.set(6.4, 4.2, 2.2 + nz * 0.55);
    this.grid = [cuts(nx, this.extent.x), cuts(ny, this.extent.y), cuts(nz, this.extent.z)];
    this.centres = this.grid.map((g) => g.slice(0, -1).map((v, i) => (v + g[i + 1]) / 2)) as [number[], number[], number[]];
    // a new lattice: let the old construction dissolve
    for (const f of this.forms) if (f.dying < 0) f.dying = 0;
  }

  /* ----------------------------------------------------------------------------- notes */

  noteOn(e: NoteOnEvent) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    const m = modSums(p.routes, {
      ...sig,
      velocity: e.velocity,
      pitch: pitchNorm(e.note),
      duration: e.duration !== undefined ? durationNorm(e.duration) : 0.35,
    });
    const [gx, gy, gz] = this.grid;
    const nx = gx.length - 1, ny = gy.length - 1, nz = gz.length - 1;
    const lo = p.num('ds.lowNote');
    const hi = Math.max(lo + 1, p.num('ds.highNote'));
    const pn = clamp((e.note - lo) / (hi - lo));
    const pc = e.note % 12;

    // phrase & chord bookkeeping
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
    if (p.bool('ds.tutti') && this.chordCount === 3 && this.chordVel > 0.72) this.tuttiV += 2.2 * this.chordVel;

    // ---- where
    let ix: number;
    switch (p.str('ds.columns')) {
      case 'chromatic': ix = Math.floor((pc / 12) * nx); break;
      case 'time': ix = this.scoreCol % nx; break;
      case 'random': ix = Math.floor(Math.random() * nx); break;
      default: ix = Math.floor((((pc * 7) % 12) / 12) * nx);
    }
    const iy = Math.min(ny - 1, Math.floor(pn * ny));
    let iz: number;
    switch (p.str('ds.layers')) {
      case 'channel': iz = e.channel % nz; break;
      case 'velocity': iz = Math.min(nz - 1, Math.floor(e.velocity * nz)); break;
      case 'random': iz = Math.floor(Math.random() * nz); break;
      default: {
        const halfZ = Math.max(1, Math.floor(nz / 2));
        iz = e.note < 60 ? Math.floor(Math.random() * halfZ) : Math.min(nz - 1, halfZ + Math.floor(Math.random() * (nz - halfZ)));
      }
    }

    // ---- what
    const span = p.num('ds.span') * modScale(m, 'size', 0.2);
    const pick = () => Math.max(1, Math.round(span * (0.35 + 0.65 * Math.random())));
    const form = p.str('ds.form');
    let kind: number;
    if (form === 'blocks') kind = 3;
    else if (form === 'planes' || form === 'lines') kind = planeKind();
    else kind = (e.note < 55 && e.velocity > 0.6) || Math.random() < 0.22 ? 3 : planeKind();

    const sx = Math.min(nx - ix, pick());
    const sy = Math.min(ny - iy, pick());
    const sz = Math.min(nz - iz, kind === 3 ? Math.max(1, Math.round(pick() * 0.6)) : pick());
    const key = (k: number, x: number) => `${k}:${x}:${iy}:${iz}:${sx}:${sy}:${sz}`;

    const make = (cx: number) => {
      const k = key(kind, cx);
      const existing = this.forms.find((f) => f.key === k && f.dying < 0);
      if (existing) {
        existing.held = true;
        existing.noteKey = noteKey(e.note, e.channel);
        existing.velocity = Math.max(existing.velocity, e.velocity);
        existing.released = -1;
        existing.popV += 3;
        return existing;
      }
      return this.addForm(k, kind, cx, iy, iz, sx, sy, sz, e, m, form === 'lines');
    };

    const f = make(ix);
    const balance = p.num('ds.balance');
    if (Math.random() < balance) {
      const mirror = nx - ix - sx;
      if (mirror !== ix && mirror >= 0) make(mirror);
    }

    const c = this.root.localToWorld(f.min.clone().add(f.max).multiplyScalar(0.5));
    this.centroid.lerp(c, 0.15);

    // boogie-woogie traffic
    if (p.bool('ds.traffic') && f.beams.length) this.spawnPulse(f, e.velocity, m);
  }

  private addForm(
    key: string, kind: number, ix: number, iy: number, iz: number, sx: number, sy: number, sz: number,
    e: NoteOnEvent, m: Record<string, number>, linesOnly: boolean,
  ): Form {
    const p = this.ctx.params;
    const [gx, gy, gz] = this.grid;
    const lw = p.num('ds.lineWidth') * modScale(m, 'weight', 0.2);
    const inset = lw * 0.5;
    const min = new THREE.Vector3(gx[ix] + inset, gy[iy] + inset, gz[iz] + inset);
    const max = new THREE.Vector3(gx[ix + sx] - inset, gy[iy + sy] - inset, gz[iz + sz] - inset);
    if (kind < 3) {
      // a plane: thin along its normal, centred in the first cell of that axis
      const th = p.num('ds.thickness');
      const [lo, hi] = kind === 0 ? [gx[ix], gx[ix + 1]] : kind === 1 ? [gy[iy], gy[iy + 1]] : [gz[iz], gz[iz + 1]];
      const mid = kind === 1 ? lo : (lo + hi) / 2; // horizontal planes sit on the floor line
      const t = Math.max(lw * 0.8, (hi - lo) * th);
      min.setComponent(kind, mid - t / 2);
      max.setComponent(kind, mid + t / 2);
    }

    // colour
    const pal = stijlPalette(p.str('ds.palette'));
    const colorChance = clamp(p.num('ds.colorAmount') * modScale(m, 'colour', 0));
    let colorIndex = -1;
    const color = new THREE.Color();
    if (!linesOnly && Math.random() < colorChance) {
      colorIndex = this.chooseColor(e, pal.primaries.length);
      color.set(pal.primaries[colorIndex]);
    } else if (Math.random() < 0.13) {
      color.set(pal.grey);
    } else {
      const wv = p.num('ds.whiteVar');
      color.set(pal.whites[0]).lerp(tmpC.set(pal.whites[Math.floor(Math.random() * pal.whites.length)]), wv);
    }

    const f: Form = {
      key, min, max, kind,
      openAxis: kind === 3 ? 1 : [0, 1, 2].filter((a) => a !== kind)[Math.random() < 0.5 ? 0 : 1],
      color, colorIndex, age: 0, held: true, noteKey: noteKey(e.note, e.channel), velocity: e.velocity,
      released: -1, dying: -1, pop: 0, popV: 0, glow: 0, hidden: linesOnly, beams: [],
    };

    // the form's frame becomes lines
    const reach = clamp(p.num('ds.lineReach') * modScale(m, 'reach', 0));
    const n = kind === 3 ? 2 : kind;
    const [u, v] = [0, 1, 2].filter((a) => a !== n);
    const normalAt = kind === 3 ? max.getComponent(2) + inset : (min.getComponent(n) + max.getComponent(n)) / 2;
    const E = [this.extent.x, this.extent.y, this.extent.z];
    const frame = (axis: number, other: number, otherVal: number) => {
      const lo = min.getComponent(axis) - inset, hi = max.getComponent(axis) + inset;
      const over = lw * 3;
      const bMin = lerp(lo - over, -E[axis], reach);
      const bMax = lerp(hi + over, E[axis], reach);
      const fixed: Record<number, number> = { [n]: normalAt, [other]: otherVal };
      const [ia, ib] = [0, 1, 2].filter((a) => a !== axis);
      const beam = this.addBeam(axis, fixed[ia], fixed[ib], bMin, bMax, (lo + hi) / 2, lw);
      f.beams.push(beam);
    };
    frame(u, v, min.getComponent(v) - inset);
    frame(u, v, max.getComponent(v) + inset);
    frame(v, u, min.getComponent(u) - inset);
    frame(v, u, max.getComponent(u) + inset);
    // the camera's subject: a point on one of the new lines, where it meets the form
    const fb = f.beams[Math.floor(Math.random() * f.beams.length)];
    const [fa, fbb] = [0, 1, 2].filter((a) => a !== fb.axis);
    const pt = new THREE.Vector3();
    pt.setComponent(fb.axis, (min.getComponent(fb.axis) + max.getComponent(fb.axis)) / 2);
    pt.setComponent(fa, fb.a);
    pt.setComponent(fbb, fb.b);
    this.root.updateMatrixWorld();
    this.root.localToWorld(pt);
    this.focus.copy(pt);
    this.focusAxis = fb.axis;
    this.newLine = { origin: pt.clone(), axis: fb.axis };

    this.forms.push(f);
    // retire the oldest forms beyond the limit
    const limit = Math.round(p.num('ds.maxForms'));
    let alive = 0;
    for (const x of this.forms) if (x.dying < 0) alive++;
    for (const x of this.forms) {
      if (alive <= limit) break;
      if (x.dying < 0 && !x.held) {
        x.dying = 0;
        alive--;
      }
    }
    return f;
  }

  private addBeam(axis: number, a: number, b: number, bMin: number, bMax: number, origin: number, thick: number): Beam {
    const key = `${axis}:${a.toFixed(3)}:${b.toFixed(3)}`;
    let beam = this.beams.get(key);
    if (beam && !beam.dying) {
      beam.min = Math.min(beam.min, bMin);
      beam.max = Math.max(beam.max, bMax);
      beam.thick = Math.max(beam.thick, thick);
    } else {
      beam = { key, axis, a, b, min: bMin, max: bMax, curMin: origin, curMax: origin, thick, curThick: 0, refs: 0, idle: 0, dying: false };
      this.beams.set(key, beam);
    }
    beam.refs++;
    beam.idle = 0;
    return beam;
  }

  private chooseColor(e: NoteOnEvent, n: number): number {
    const p = this.ctx.params;
    switch (p.str('ds.colorMode')) {
      case 'harmony': {
        const rel = (e.note % 12 - this.ctx.signals.root + 12) % 12;
        if (rel === 0) return 0;
        if (rel === 3 || rel === 4) return 1 % n;
        if (rel === 7) return 2 % n;
        return Math.floor(Math.random() * n);
      }
      case 'register': {
        // bass blue · middle red · treble yellow
        const t = pitchNorm(e.note);
        return t < 0.4 ? 2 % n : t < 0.66 ? 0 : 1 % n;
      }
      case 'pitchclass': return ((e.note % 12) * 7) % 12 % n;
      case 'velocity': return e.velocity > 0.75 ? 0 : e.velocity > 0.45 ? 1 % n : 2 % n;
      default: {
        // equilibrium — the colour the composition lacks most
        const counts = new Array(n).fill(0);
        for (const f of this.forms) if (f.dying < 0 && f.colorIndex >= 0) counts[f.colorIndex] += f.max.clone().sub(f.min).lengthSq();
        let best = 0;
        let bestV = Infinity;
        for (let i = 0; i < n; i++) {
          const v = counts[i] * (i < 3 ? 1 : 1.8) + Math.random() * 0.5;
          if (v < bestV) { bestV = v; best = i; }
        }
        return best;
      }
    }
  }

  private spawnPulse(f: Form, vel: number, m: Record<string, number>) {
    const p = this.ctx.params;
    if (this.pulses.length >= MAX_PULSES) this.pulses.shift();
    const beam = f.beams[Math.floor(Math.random() * f.beams.length)];
    const pal = stijlPalette(p.str('ds.palette'));
    const choices = [...pal.primaries, pal.grey].filter((c) => c.toLowerCase() !== pal.line.toLowerCase());
    const c = f.min.clone().add(f.max).multiplyScalar(0.5).getComponent(beam.axis);
    this.pulses.push({
      beam,
      pos: c,
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: p.num('ds.trafficSpeed') * modScale(m, 'traffic', 0.1) * (0.6 + vel),
      life: p.num('ds.trafficLife') * (0.7 + Math.random() * 0.6),
      age: 0,
      size: p.num('ds.lineWidth') * p.num('ds.trafficSize') * (1.6 + Math.random() * 0.8),
      color: new THREE.Color(choices[Math.floor(Math.random() * choices.length)]),
    });
  }

  noteOff(e: NoteOffEvent) {
    const k = noteKey(e.note, e.channel);
    const pedal = this.ctx.signals.values.pedal >= 0.5 && this.ctx.params.bool('src.pedalSustain');
    for (const f of this.forms) if (f.noteKey === k && f.held && !pedal) { f.held = false; f.released = 0; }
  }

  control(e: ControlEvent) {
    if (e.controller === 64 && e.value < 0.5) {
      for (const f of this.forms) {
        const still = this.ctx.signals.active.has(Math.floor(f.noteKey / 64));
        if (f.held && !still) { f.held = false; f.released = 0; }
      }
    }
  }

  allNotesOff() {
    for (const f of this.forms) if (f.held) { f.held = false; f.released = 0; }
  }

  /* ----------------------------------------------------------------------------- frame */

  update(dt: number, time: number, pointers: PointerState[]) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    this.time = time;
    this.rebuildGrid();
    const g = modSums(p.routes, sig);
    if (Math.floor(time * 2) !== Math.floor((time - dt) * 2)) this.scoreCol++;

    // tutti: whole structure breathes together (spring)
    this.tuttiV += (-this.tutti * 60 - this.tuttiV * 9) * dt;
    this.tutti += this.tuttiV * dt;

    // ---- forms
    const attack = p.num('ds.attack') * modScale(g, 'snap', 0.2);
    const spring = p.num('ds.spring');
    const memory = p.num('ds.memory');
    const relief = p.num('ds.relief');
    const glowAmt = p.num('ds.glow') * modScale(g, 'glow', 0);
    let fi = 0;
    const kept: Form[] = [];
    for (const f of this.forms) {
      f.age += dt;
      if (f.released >= 0) f.released += dt;
      if (f.dying < 0 && !f.held && memory < 300 && f.released > memory) f.dying = 0;
      if (f.dying >= 0) f.dying += dt;
      if (f.dying > 0.7) {
        for (const b of f.beams) b.refs--;
        continue;
      }
      kept.push(f);
      if (f.hidden) continue;

      // pop out while held (key relief), spring back on release
      const cell = (f.max.z - f.min.z) + 0.6;
      const target = (f.held ? relief * f.velocity * 0.55 * cell : 0) + this.tutti * 0.08;
      f.popV += ((target - f.pop) * 90 - f.popV * 14) * dt;
      f.pop += f.popV * dt;
      f.glow += ((f.held ? glowAmt * f.velocity : 0) - f.glow) * (1 - Math.exp(-dt * (f.held ? 12 : 2.5)));

      const t = clamp(f.age / attack);
      let open = 1 - Math.pow(1 - t, 3) + spring * 0.45 * Math.sin(Math.PI * t) * (1 - t) * 2;
      if (f.dying >= 0) open *= 1 - smooth(f.dying / 0.7);
      open = Math.max(0.0001, open);

      tmpS.subVectors(f.max, f.min);
      tmpP.addVectors(f.max, f.min).multiplyScalar(0.5);
      const oa = f.openAxis;
      const lenOpen = tmpS.getComponent(oa) * open;
      // planes open like a shutter from one edge; blocks rise from the floor line
      tmpP.setComponent(oa, f.min.getComponent(oa) + lenOpen / 2);
      tmpS.setComponent(oa, lenOpen);
      const n = f.kind === 3 ? 2 : f.kind;
      tmpP.setComponent(n, tmpP.getComponent(n) + f.pop);
      tmpM.compose(tmpP, tmpQ.identity(), tmpS);
      if (fi < MAX_FORMS) {
        this.formMesh.setMatrixAt(fi, tmpM);
        this.formMesh.setColorAt(fi, f.color);
        this.formGlow.setX(fi, f.glow);
        fi++;
      }
    }
    this.forms = kept;
    this.formMesh.count = fi;
    this.formMesh.instanceMatrix.needsUpdate = true;
    if (this.formMesh.instanceColor) this.formMesh.instanceColor.needsUpdate = true;
    this.formGlow.needsUpdate = true;

    // ---- beams: draw outward, thicken, retract when unused
    const drawSpeed = p.num('ds.lineDraw');
    const weight = modScale(g, 'weight', 0.2);
    let bi = 0;
    for (const [k, b] of this.beams) {
      if (b.refs <= 0) {
        b.idle += dt;
        if (b.idle > 0.8) b.dying = true;
      }
      const sp = drawSpeed * dt * (b.dying ? 2.5 : 1);
      if (b.dying) {
        const c = (b.curMin + b.curMax) / 2;
        b.curMin = Math.min(c, b.curMin + sp);
        b.curMax = Math.max(c, b.curMax - sp);
        b.curThick *= Math.exp(-dt * 3);
        if (b.curMax - b.curMin < 0.01) {
          this.beams.delete(k);
          continue;
        }
      } else {
        b.curMin = b.curMin > b.min ? Math.max(b.min, b.curMin - sp) : b.min;
        b.curMax = b.curMax < b.max ? Math.min(b.max, b.curMax + sp) : b.max;
        b.curThick += (b.thick * weight * (1 + this.tutti * 0.15) - b.curThick) * (1 - Math.exp(-dt * 8));
      }
      if (bi >= MAX_BEAMS) continue;
      const len = b.curMax - b.curMin;
      const [ia, ib] = [0, 1, 2].filter((a) => a !== b.axis);
      tmpP.setComponent(b.axis, (b.curMin + b.curMax) / 2);
      tmpP.setComponent(ia, b.a);
      tmpP.setComponent(ib, b.b);
      tmpS.set(b.curThick, b.curThick, b.curThick).setComponent(b.axis, len);
      tmpM.compose(tmpP, tmpQ.identity(), tmpS);
      this.beamMesh.setMatrixAt(bi++, tmpM);
    }
    this.beamMesh.count = bi;
    this.beamMesh.instanceMatrix.needsUpdate = true;

    // ---- pulses
    let pi = 0;
    this.pulses = this.pulses.filter((q) => q.age < q.life && this.beams.has(q.beam.key));
    for (const q of this.pulses) {
      q.age += dt;
      q.pos += q.dir * q.speed * dt;
      if (q.pos > q.beam.curMax || q.pos < q.beam.curMin) {
        q.dir *= -1;
        q.pos = clamp(q.pos, q.beam.curMin, q.beam.curMax);
      }
      const fade = smooth(Math.min(q.age / 0.12, 1)) * (1 - smooth(clamp((q.age - q.life + 0.4) / 0.4)));
      const [ia, ib] = [0, 1, 2].filter((a) => a !== q.beam.axis);
      tmpP.setComponent(q.beam.axis, q.pos);
      tmpP.setComponent(ia, q.beam.a);
      tmpP.setComponent(ib, q.beam.b);
      const s = q.size * Math.max(0.001, fade);
      tmpS.set(s, s, s).setComponent(q.beam.axis, s * 1.6);
      tmpM.compose(tmpP, tmpQ.identity(), tmpS);
      this.pulseMesh.setMatrixAt(pi, tmpM);
      this.pulseMesh.setColorAt(pi, q.color);
      this.pulseGlow.setX(pi, 0.35 * fade);
      pi++;
    }
    this.pulseMesh.count = pi;
    this.pulseMesh.instanceMatrix.needsUpdate = true;
    if (this.pulseMesh.instanceColor) this.pulseMesh.instanceColor.needsUpdate = true;
    this.pulseGlow.needsUpdate = true;

    this.applyLook();

    // ---- phrase ends
    const gap = p.num('ds.phraseGap');
    const phraseEnded = this.phraseNotes >= 4 && time - this.lastNote > gap;
    if (phraseEnded) this.phraseNotes = 0;

    // ---- user hand
    for (const pt of pointers) {
      if (!pt.down) continue;
      this.userYaw -= pt.vx * dt * 4.5;
      this.userPitch = clamp(this.userPitch + pt.vy * dt * 2.5, -0.6, 1.0);
    }

    // ---- camera
    const mode = p.str('ds.camera');
    const fov = p.num('ds.fov');
    this.director.update({
      dt, time, mode,
      pace: p.num('ds.camSpeed'),
      closeness: p.num('ds.closeness'),
      revealTime: p.num('ds.revealTime'),
      handheld: p.num('ds.handheld'),
      react: p.num('ds.camReact'),
      fov,
      extent: this.extent,
      focus: this.focus,
      focusAxis: this.focusAxis,
      centroid: this.centroid,
      loudness: sig.loudness,
      density: sig.density,
      pulse: sig.pulse,
      energy: clamp((modScale(g, 'camera', 0) - 1) * p.num('ds.camReact'), 0, 2),
      distanceMod: (modScale(g, 'closeup', 0) - 1) * p.num('ds.camReact'),
      phraseEnded,
      newLine: this.newLine,
      lattice: this.centres,
      userYaw: this.userYaw,
      userPitch: this.userPitch,
      userZoom: this.userZoom,
    });
    this.newLine = null;
    const closeDist = lerp(this.extent.length() * 1.1, this.extent.length() * 0.1, p.num('ds.closeness'));
    nearFade.value = Math.min(1.6, Math.max(0.35, closeDist * 0.5));
    const proj = p.str('ds.projection');
    const useOrtho = proj === 'axonometric' || (proj === 'auto' && this.director.ortho);
    const aspect = this.width / this.height;
    const cam: THREE.Camera = useOrtho ? this.ortho : this.persp;
    const d = this.director;
    if (useOrtho) {
      const hh = d.focusDistance * Math.tan((fov * Math.PI) / 360);
      const o = this.ortho;
      o.left = -hh * aspect; o.right = hh * aspect; o.top = hh; o.bottom = -hh;
      // keep the parallel camera far back so nothing clips
      const dir = d.pos.clone().sub(d.target).normalize();
      o.position.copy(d.target).addScaledVector(dir, 60);
      o.near = 0.1; o.far = 200;
      o.lookAt(d.target);
      o.updateProjectionMatrix();
    } else {
      const c = this.persp;
      c.fov = fov;
      c.aspect = aspect;
      c.near = 0.05;
      c.far = 300;
      c.position.copy(d.pos);
      c.lookAt(d.target);
      c.updateProjectionMatrix();
    }

    // fog relative to the camera distance
    const fog = this.scene.fog as THREE.Fog;
    const fogAmt = p.num('ds.fog');
    const camDist = useOrtho ? 60 : d.focusDistance;
    fog.near = useOrtho ? 60 - this.extent.length() * 0.2 + (1 - fogAmt) * 80 : camDist * (0.9 + (1 - fogAmt) * 6);
    fog.far = fog.near + (useOrtho ? this.extent.length() * 2.4 : camDist * 1.2) * (0.6 + (1 - fogAmt) * 8);

    this.render(cam, useOrtho);
  }

  private applyLook() {
    const p = this.ctx.params;
    const pal = stijlPalette(p.str('ds.palette'));
    let bg = p.str('ds.background');
    if (bg === 'auto') bg = pal.background;
    const dark = bg === 'night' || bg === 'blue' || bg === 'red';
    this.beamMat.color.set(pal.line);
    this.beamMat.emissive.set(pal.line).multiplyScalar(dark && luma(pal.line) > 0.5 ? 0.35 : 0);
    (this.scene.fog as THREE.Fog).color.set(BG_FOG[bg] ?? '#ebe8e1');
    this.bgMat.uniforms.uMode.value = BG_MODES[bg] ?? 0;
    this.bgMat.uniforms.uAspect.value = this.width / this.height;
    this.bgMat.uniforms.uTime.value = this.time;

    const finish = p.str('ds.finish');
    if (finish !== this.finish) {
      this.finish = finish;
      const m = this.formMat;
      m.transparent = finish === 'glass';
      m.opacity = finish === 'glass' ? 0.62 : 1;
      m.depthWrite = finish !== 'glass';
      m.roughness = finish === 'gouache' ? 0.82 : finish === 'enamel' ? 0.3 : finish === 'ceramic' ? 0.16 : 0.05;
      m.clearcoat = finish === 'gouache' ? 0 : finish === 'enamel' ? 1 : 0.7;
      m.clearcoatRoughness = finish === 'enamel' ? 0.06 : 0.12;
      m.envMapIntensity = finish === 'gouache' ? 0.45 : 0.9;
      m.needsUpdate = true;
    }

    const az = (p.num('ds.lightAz') * Math.PI) / 180;
    const el = (p.num('ds.lightEl') * Math.PI) / 180;
    this.sun.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(30);
    this.sun.intensity = p.num('ds.sun');
    const amb = p.num('ds.ambient');
    this.hemi.intensity = amb;
    this.scene.environmentIntensity = 0.35 + amb * 0.4;
    this.hemi.groundColor.set(dark ? '#3a3c44' : '#d8d2c4');
    (this.floor.material as THREE.ShadowMaterial).opacity = p.num('ds.shadow') * (dark ? 0.5 : 1);
    this.floor.position.y = -this.extent.y - 0.03;
    this.root.rotation.z = p.str('ds.orientation') === 'lozenge' ? Math.PI / 4 : 0;
  }

  private render(cam: THREE.Camera, ortho: boolean) {
    const r = this.ctx.renderer;
    r.setRenderTarget(this.sceneTarget);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(this.bgScene, this.quadCam);
    r.render(this.scene, cam);

    const dof = this.ctx.params.num('ds.dof');
    if (dof > 0.001) {
      const u = this.dofMat.uniforms;
      u.uTexel.value.set(1 / this.width, 1 / this.height);
      const c = cam as THREE.PerspectiveCamera | THREE.OrthographicCamera;
      u.uNear.value = c.near;
      u.uFar.value = c.far;
      u.uOrtho.value = ortho ? 1 : 0;
      u.uFocus.value = ortho ? 60 : this.director.focusDistance;
      u.uRange.value = this.extent.length() * 1.3;
      u.uAperture.value = dof * (ortho ? 0.6 : 1);
      u.uMaxPx.value = 4 + dof * 18 * (this.height / 1080);
      r.setRenderTarget(this.outTarget);
      r.render(this.dofScene, this.quadCam);
    }
    r.setRenderTarget(null);
  }

  resize(width: number, height: number) {
    const s = this.ctx.params.num('quality.paintRes');
    this.width = Math.max(2, Math.round(width * s));
    this.height = Math.max(2, Math.round(height * s));
    this.sceneTarget.setSize(this.width, this.height);
    this.outTarget.setSize(this.width, this.height);
  }

  clear() {
    for (const f of this.forms) if (f.dying < 0) { f.held = false; f.dying = 0; }
    this.pulses = [];
    this.userYaw = 0;
    this.userPitch = 0;
    this.userZoom = 1;
  }

  dispose() {
    this.ctx.renderer.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    this.sceneTarget.dispose();
    this.outTarget.dispose();
    this.envTex.dispose();
    this.pmrem.dispose();
    for (const m of [this.formMesh, this.beamMesh, this.pulseMesh]) m.geometry.dispose();
    this.formMat.dispose();
    this.beamMat.dispose();
    this.pulseMat.dispose();
    this.bgMat.dispose();
    this.dofMat.dispose();
  }
}

/* ----------------------------------------------------------------------------------- helpers */

function planeKind() {
  // mostly frontal planes, some side walls, a few horizontal floors — a counter-construction
  const r = Math.random();
  return r < 0.58 ? 2 : r < 0.84 ? 0 : 1;
}

function noteKey(note: number, channel: number) {
  return note * 64 + (channel & 63);
}

const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};

function luma(hex: string) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/**
 * Patches a standard material with
 *  - optional per-instance emissive glow (attribute aGlow × instance colour)
 *  - a dithered near-fade, so forms dissolve instead of filling the screen when the camera passes through
 */
function withGlow(mat: THREE.MeshStandardMaterial, glow = true) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNearFade = nearFade;
    if (glow) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uNearFade;
${glow ? 'varying float vGlow;' : ''}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
{
  float dz = vViewPosition.z;
  float keep = smoothstep(uNearFade * 0.35, uNearFade, dz);
  float h = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (h > keep) discard;
}`,
      );
    if (glow) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance += vColor.rgb * vGlow;\n#endif',
      );
    }
  };
}
