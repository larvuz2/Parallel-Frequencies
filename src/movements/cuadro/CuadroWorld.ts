import * as THREE from 'three';
import type { ControlEvent, EngineContext, MovementInstance, NoteOffEvent, NoteOnEvent, PointerState } from '../../core/types';
import { simplex3 } from '../../core/noise';
import { VitrineWorld } from '../vitrine/VitrineWorld';
import { RaymarchCreature } from './RaymarchCreature';

/**
 * Cuadro — a living painting. The 3D creature (the Vitrine engine with its own parameters) is
 * rendered into a texture and shown on a framed panel hanging on a dark plaster wall, in a dim
 * room with drifting smoke. The viewer stands in front of it, barely moving.
 */
export class CuadroWorld implements MovementInstance {
  private inner: MovementInstance;
  private engineId = '';
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 100);
  private target: THREE.WebGLRenderTarget;
  private wallMat: THREE.MeshStandardMaterial;
  private wall: THREE.Mesh;
  private panel: THREE.Mesh;
  private panelMat: THREE.ShaderMaterial;
  private frame = new THREE.Group();
  private frameMat: THREE.MeshPhysicalMaterial;
  private hazeMat: THREE.ShaderMaterial;
  private haze: THREE.Mesh;
  private spot = new THREE.SpotLight(0xffffff, 40, 30, 0.6, 0.85, 1.4);
  private fill = new THREE.AmbientLight(0xffffff, 0.08);
  private loader = new THREE.TextureLoader();
  private width = 2;
  private height = 2;
  private wallId = '';
  private woodId = '';
  private frameKey = '';
  private panelW = 1.6;
  private panelH = 1;
  private innerSize = '';

  constructor(private ctx: EngineContext) {
    const r = ctx.renderer;
    const s = r.getDrawingBufferSize(new THREE.Vector2());
    this.width = s.x;
    this.height = s.y;
    this.target = new THREE.WebGLRenderTarget(s.x, s.y, { type: THREE.HalfFloatType, samples: 4 });
    this.engineId = ctx.params.str('cu.engine');
    this.inner = this.makeInner(this.engineId);

    this.scene.background = new THREE.Color(0x050505);
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.95, metalness: 0 });
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), this.wallMat);
    this.scene.add(this.wall);

    // the painting: the creature's render, shown as an emissive canvas behind (optional) glass
    this.panelMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: null }, uBright: { value: 1 }, uGlass: { value: 0.04 }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform float uBright; uniform float uGlass; uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(uMap, vUv).rgb * uBright;
          // a soft diagonal sheen of glass and a faint inner shadow along the frame
          float sheen = smoothstep(0.35, 0.0, abs((vUv.x - vUv.y * 0.6) - 0.15 - 0.05 * sin(uTime * 0.05))) * uGlass;
          vec2 e = min(vUv, 1.0 - vUv);
          float inner = smoothstep(0.0, 0.025, min(e.x, e.y * 1.6));
          gl_FragColor = vec4(c * (0.55 + 0.45 * inner) + vec3(sheen * 0.35), 1.0);
        }
      `,
    });
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.panelMat);
    this.panel.position.z = 0.02;
    this.scene.add(this.panel);

    this.frameMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 });
    this.scene.add(this.frame);

    // drifting smoke in the room, kept off the painting itself
    this.hazeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uAmt: { value: 0.45 }, uColor: { value: new THREE.Color(0x5a5f68) }, uPanel: { value: new THREE.Vector2(0.4, 0.3) },
        uVig: { value: 0.7 }, uAspect: { value: 1.7 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAmt, uVig, uAspect; uniform vec3 uColor; uniform vec2 uPanel;
        varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.02 + 7.3; a *= 0.5; } return s; }
        void main() {
          vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
          float t = uTime * 0.015;
          float smoke = fbm(q * 2.2 + vec2(t, -t * 0.6) + fbm(q * 1.3 - t) * 1.2);
          smoke = smoothstep(0.35, 0.95, smoke);
          // stay off the painting
          vec2 d = abs(vUv - 0.5) - uPanel;
          float outside = smoothstep(-0.01, 0.06, max(d.x, d.y));
          float vig = smoothstep(0.25, 1.05, length(q * vec2(0.8, 1.1)));
          vec3 col = uColor * smoke * uAmt * (0.35 + 0.65 * outside) * 0.35;
          float dark = vig * uVig;
          gl_FragColor = vec4(col * (1.0 - dark * 0.6), dark * 0.85);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.hazeMat);
    this.haze.frustumCulled = false;
    this.haze.renderOrder = 100;
    this.scene.add(this.haze);

    this.spot.position.set(0, 4.5, 3.2);
    this.spot.target.position.set(0, 0.1, 0);
    this.scene.add(this.spot, this.spot.target, this.fill);
  }

  get output() {
    return this.ctx.params.bool('cu.room') ? this.target.texture : this.inner.output;
  }

  private makeInner(id: string): MovementInstance {
    return id === 'strands' ? new VitrineWorld(this.ctx, { prefix: 'cu.' }) : new RaymarchCreature(this.ctx);
  }

  /* ---------------------------------------------------------------------------- music */
  noteOn(e: NoteOnEvent) { this.inner.noteOn(e); }
  noteOff(e: NoteOffEvent) { this.inner.noteOff(e); }
  control(e: ControlEvent) { this.inner.control(e); }
  allNotesOff() { this.inner.allNotesOff(); }

  /* ---------------------------------------------------------------------------- room */

  private loadTex(url: string, srgb: boolean, repeat: boolean) {
    const t = this.loader.load(url);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = this.ctx.renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  private buildFrame(border: number, depth: number) {
    for (const c of [...this.frame.children]) {
      this.frame.remove(c);
      (c as THREE.Mesh).geometry.dispose();
    }
    const W = this.panelW, H = this.panelH, b = border;
    const bar = (w: number, h: number, x: number, y: number, vertical: boolean) => {
      const g = new THREE.BoxGeometry(w, h, depth);
      // grain runs along each bar
      const uv = g.attributes.uv;
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const a = vertical ? pos.getY(i) : pos.getX(i);
        const c = vertical ? pos.getX(i) + pos.getZ(i) : pos.getY(i) + pos.getZ(i);
        uv.setXY(i, a / 1.2 + x * 0.37, c / 0.3 + 0.4);
      }
      const m = new THREE.Mesh(g, this.frameMat);
      m.position.set(x, y, depth / 2);
      this.frame.add(m);
    };
    bar(W + 2 * b, b, 0, H / 2 + b / 2, false);
    bar(W + 2 * b, b, 0, -H / 2 - b / 2, false);
    bar(b, H, -W / 2 - b / 2, 0, true);
    bar(b, H, W / 2 + b / 2, 0, true);
  }

  update(dt: number, time: number, pointers: PointerState[]) {
    const p = this.ctx.params;
    const room = p.bool('cu.room');
    const eng = p.str('cu.engine');
    if (eng !== this.engineId) {
      this.engineId = eng;
      this.inner.dispose();
      this.inner = this.makeInner(eng);
      this.innerSize = '';
    }

    // ---- size of the painting, and the creature's render to match it
    const aspect = p.num('cu.panelAspect');
    this.panelH = 1;
    this.panelW = aspect;
    const ph = room ? Math.round(this.height * p.num('cu.panelSize') * 1.1) : this.height;
    const pw = room ? Math.round(ph * aspect) : this.width;
    const key = `${pw}x${ph}`;
    if (key !== this.innerSize) {
      this.innerSize = key;
      this.inner.resize(Math.max(2, pw), Math.max(2, ph));
    }
    this.inner.update(dt, time, pointers);
    if (!room) return;

    // ---- the wall
    const wallTex = p.str('cu.wallTexture');
    if (wallTex !== this.wallId) {
      this.wallId = wallTex;
      this.wallMat.map?.dispose();
      this.wallMat.map = wallTex === 'none' ? null : this.loadTex(`${import.meta.env.BASE_URL}textures/wall/${wallTex}.jpg`, true, true);
      this.wallMat.needsUpdate = true;
    }
    this.wallMat.map?.repeat.set(3.2 * p.num('cu.wallScale'), 2 * p.num('cu.wallScale'));
    this.wallMat.color.set(p.str('cu.wallColor'));

    // ---- the frame
    const wood = p.str('cu.frameWood');
    if (wood !== this.woodId) {
      this.woodId = wood;
      this.frameMat.map?.dispose();
      this.frameMat.normalMap?.dispose();
      const base = `${import.meta.env.BASE_URL}textures/wood/${wood}`;
      this.frameMat.map = this.loadTex(`${base}.jpg`, true, true);
      this.frameMat.normalMap = this.loadTex(`${base}-normal.jpg`, false, true);
      this.frameMat.needsUpdate = true;
    }
    this.frameMat.color.set(p.str('cu.frameTint'));
    this.frameMat.clearcoat = p.num('cu.frameGloss');
    const fk = `${aspect.toFixed(3)}|${p.num('cu.frameBorder').toFixed(4)}|${p.num('cu.frameDepth').toFixed(4)}`;
    if (fk !== this.frameKey) {
      this.frameKey = fk;
      this.buildFrame(p.num('cu.frameBorder'), p.num('cu.frameDepth'));
      this.panel.scale.set(this.panelW, this.panelH, 1);
    }

    // ---- the painting
    const pu = this.panelMat.uniforms;
    pu.uMap.value = this.inner.output;
    pu.uBright.value = p.num('cu.panelBright');
    pu.uGlass.value = p.num('cu.glass');
    pu.uTime.value = time;

    // ---- light
    this.spot.color.set(p.str('cu.lightColor'));
    this.spot.intensity = 40 * p.num('cu.wallLight');
    this.fill.intensity = 0.05 + 0.08 * p.num('cu.wallLight');

    // ---- the viewer: the painting fills panelSize of the view height
    const cam = this.camera;
    cam.aspect = this.width / this.height;
    cam.fov = 30;
    const frac = p.num('cu.panelSize');
    const dist = ((this.panelH / 2 + p.num('cu.frameBorder')) / Math.tan((cam.fov * Math.PI) / 360) / frac) * p.num('cu.roomZoom');
    const sway = p.num('cu.roomSway');
    cam.position.set(simplex3(time * 0.03, 1.3, 0) * 0.12 * sway * dist, simplex3(time * 0.025, 4.7, 0) * 0.06 * sway * dist, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();

    // ---- haze, kept off the painting
    const hu = this.hazeMat.uniforms;
    hu.uTime.value = time;
    hu.uAmt.value = p.num('cu.haze');
    hu.uColor.value.set(p.str('cu.hazeColor'));
    hu.uVig.value = p.num('cu.wallVignette');
    hu.uAspect.value = cam.aspect;
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * dist;
    hu.uPanel.value.set((this.panelW / 2 + p.num('cu.frameBorder')) / (halfH * cam.aspect) / 2, (this.panelH / 2 + p.num('cu.frameBorder')) / halfH / 2);

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
    this.innerSize = '';
  }

  clear() {
    this.inner.clear();
  }

  dispose() {
    this.inner.dispose();
    this.target.dispose();
    this.wallMat.map?.dispose();
    this.wallMat.dispose();
    this.frameMat.map?.dispose();
    this.frameMat.normalMap?.dispose();
    this.frameMat.dispose();
    this.panelMat.dispose();
    this.hazeMat.dispose();
    for (const c of this.frame.children) (c as THREE.Mesh).geometry.dispose();
  }
}
