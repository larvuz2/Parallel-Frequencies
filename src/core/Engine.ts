import * as THREE from 'three';
import {
  BlendFunction,
  BloomEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import type { EngineContext, MovementDefinition, MovementInstance, PointerState } from './types';
import { ParamStore } from './ParamStore';
import { Signals } from './Signals';
import { NoteBus } from './NoteBus';
import { simplex3 } from './noise';

const TONE: Record<string, ToneMappingMode> = {
  linear: ToneMappingMode.LINEAR,
  neutral: ToneMappingMode.NEUTRAL,
  agx: ToneMappingMode.AGX,
  aces: ToneMappingMode.ACES_FILMIC,
};

/**
 * Shared audiovisual engine. Owns the WebGL renderer, the 3D stage the painting lives in,
 * post-processing, pointer input and the frame loop. A movement plugs in and renders its world
 * into a texture that is displayed on the canvas plane.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly stage = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  readonly params: ParamStore;
  readonly signals = new Signals();
  readonly bus = new NoteBus();
  readonly pointers: PointerState[] = [];

  private composer: EffectComposer;
  private bloom: BloomEffect;
  private vignette: VignetteEffect;
  private noise: NoiseEffect;
  private tone: ToneMappingEffect;
  private plane: THREE.Mesh;
  private planeMat: THREE.ShaderMaterial;
  private movement: MovementInstance | null = null;
  private definition: MovementDefinition | null = null;
  private clock = new THREE.Clock();
  private time = 0;
  private running = false;
  private snapshotCb: ((b: Blob | null) => void) | null = null;
  private frameHooks = new Set<(dt: number) => void>();
  private lastSize = new THREE.Vector2();
  fps = 60;

  constructor(private container: HTMLElement, params: ParamStore) {
    this.params = params;
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      stencil: false,
      depth: false,
      powerPreference: 'high-performance',
    });
    if (!this.renderer.capabilities.isWebGL2) throw new Error('WebGL2 is required');
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.autoClear = false;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add('stage-canvas');

    this.camera.position.set(0, 0, 1 / Math.tan(THREE.MathUtils.degToRad(15)));
    this.camera.lookAt(0, 0, 0);

    this.planeMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: null } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D uMap; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(uMap, vUv).rgb, 1.0); }`,
      depthWrite: false,
      depthTest: false,
    });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.planeMat);
    this.plane.frustumCulled = false;
    this.stage.add(this.plane);

    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(this.stage, this.camera));
    this.bloom = new BloomEffect({ mipmapBlur: true, intensity: 0.5, luminanceThreshold: 0.75, luminanceSmoothing: 0.2, radius: 0.7 });
    this.vignette = new VignetteEffect({ offset: 0.3, darkness: 0.35 });
    this.noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.LINEAR });
    this.composer.addPass(new EffectPass(this.camera, this.bloom, this.vignette, this.noise, this.tone));

    this.bindPointers();
    window.addEventListener('resize', () => this.resize());
    this.bus.subscribe(this.signals);
    this.bus.subscribe({
      noteOn: (e) => this.movement?.noteOn(e),
      noteOff: (e) => this.movement?.noteOff(e),
      control: (e) => this.movement?.control(e),
      allNotesOff: () => this.movement?.allNotesOff(),
    });
    this.resize();
  }

  get context(): EngineContext {
    return { renderer: this.renderer, params: this.params, signals: this.signals, stage: this.stage, stageCamera: this.camera };
  }

  get currentMovement() {
    return this.definition;
  }

  setMovement(def: MovementDefinition) {
    this.movement?.dispose();
    this.movement = null;
    this.definition = def;
    if (def.create) {
      this.movement = def.create(this.context);
      this.resize(true);
    }
  }

  onFrame(fn: (dt: number) => void) {
    this.frameHooks.add(fn);
    return () => this.frameHooks.delete(fn);
  }

  clear() {
    this.movement?.clear();
  }

  snapshot(): Promise<Blob | null> {
    return new Promise((res) => (this.snapshotCb = res));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.frame();
    };
    requestAnimationFrame(loop);
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.time += dt;
    this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05;
    this.params.tick(dt);
    for (const h of this.frameHooks) h(dt);
    this.signals.update(dt);

    const pr = this.params.num('quality.pixelRatio') * Math.min(window.devicePixelRatio || 1, 2);
    if (Math.abs(this.renderer.getPixelRatio() - pr) > 0.01) {
      this.renderer.setPixelRatio(pr);
      this.resize(true);
    }

    for (const p of this.pointers) {
      p.vx = p.ax / dt;
      p.vy = p.ay / dt;
      p.ax = 0;
      p.ay = 0;
    }

    if (this.movement) {
      this.movement.update(dt, this.time, this.pointers);
      this.planeMat.uniforms.uMap.value = this.movement.output;
    }

    this.applyPost();
    this.applyDrift();
    this.composer.render(dt);

    if (this.snapshotCb) {
      const cb = this.snapshotCb;
      this.snapshotCb = null;
      this.renderer.domElement.toBlob((b) => cb(b), 'image/png');
    }
  }

  private applyPost() {
    const p = this.params;
    this.bloom.intensity = p.num('post.bloom');
    this.bloom.luminanceMaterial.threshold = p.num('post.bloomThreshold');
    this.bloom.mipmapBlurPass.radius = p.num('post.bloomRadius');
    this.vignette.darkness = p.num('post.vignette');
    this.vignette.offset = 0.35;
    this.noise.blendMode.opacity.value = p.num('post.grain');
    const mode = TONE[p.str('post.tonemap')] ?? ToneMappingMode.LINEAR;
    if (this.tone.mode !== mode) this.tone.mode = mode;
  }

  private applyDrift() {
    const d = this.params.num('post.drift');
    const t = this.time;
    const aspect = this.camera.aspect;
    const over = 1 + 0.07 * d;
    this.plane.scale.set(aspect * over, over, 1);
    this.plane.rotation.x = simplex3(t * 0.03, 1.3, 0) * 0.045 * d;
    this.plane.rotation.y = simplex3(t * 0.025, 4.1, 0) * 0.06 * d;
    this.plane.position.z = simplex3(t * 0.02, 8.2, 0) * 0.05 * d;
    const dist = 1 / Math.tan(THREE.MathUtils.degToRad(15));
    this.camera.position.x = simplex3(t * 0.02, 2.2, 3) * 0.05 * d;
    this.camera.position.y = simplex3(t * 0.02, 5.2, 3) * 0.03 * d;
    this.camera.position.z = dist;
    this.camera.lookAt(0, 0, 0);
  }

  resize(force = false) {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (!force && this.lastSize.x === w && this.lastSize.y === h) return;
    this.lastSize.set(w, h);
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.movement?.resize(size.x, size.y);
  }

  /* ---------------------------------------------------------------- pointers */

  private bindPointers() {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    const toUv = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
    };
    const get = (e: PointerEvent) => {
      let p = this.pointers.find((q) => q.id === e.pointerId);
      if (!p) {
        const uv = toUv(e);
        p = { id: e.pointerId, x: uv.x, y: uv.y, vx: 0, vy: 0, ax: 0, ay: 0, down: false, active: true };
        this.pointers.push(p);
      }
      return p;
    };
    el.addEventListener('pointerdown', (e) => {
      const p = get(e);
      const uv = toUv(e);
      p.x = uv.x; p.y = uv.y; p.ax = 0; p.ay = 0;
      p.down = true;
      p.active = true;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      const p = get(e);
      const uv = toUv(e);
      p.ax += uv.x - p.x;
      p.ay += uv.y - p.y;
      p.x = uv.x;
      p.y = uv.y;
      p.active = true;
    });
    const up = (e: PointerEvent) => {
      const p = get(e);
      p.down = false;
      if (e.pointerType !== 'mouse') this.pointers.splice(this.pointers.indexOf(p), 1);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', (e) => {
      const p = this.pointers.find((q) => q.id === e.pointerId);
      if (p && !p.down) p.active = false;
    });
  }
}
