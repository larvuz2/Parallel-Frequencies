import * as THREE from 'three';
import { FULLSCREEN_VERT } from '../../shaders/common';
import { STROKE_FRAG, STROKE_VERT } from './shaders/stroke';
import { COMPOSITE_FRAG, COPY_FRAG, GROUND_FRAG, PROCESS_FRAG } from './shaders/surface';

function makeMRT(w: number, h: number) {
  const t = new THREE.WebGLRenderTarget(w, h, {
    count: 2,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  for (const tex of t.textures) {
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
  }
  return t;
}

/**
 * The physical painting: two ping-ponged MRT buffers holding
 *   [0] paint colour (premultiplied by coverage)
 *   [1] relief height · wetness · emission
 * plus the passes that age the surface, lay strokes, and composite the lit result.
 */
export class PaintSurface {
  private a: THREE.WebGLRenderTarget;
  private b: THREE.WebGLRenderTarget;
  readonly output: THREE.WebGLRenderTarget;
  readonly processMat: THREE.RawShaderMaterial;
  readonly strokeMat: THREE.RawShaderMaterial;
  readonly compositeMat: THREE.RawShaderMaterial;
  private copyMat: THREE.RawShaderMaterial;
  private groundMat: THREE.RawShaderMaterial;
  private ground: THREE.WebGLRenderTarget;
  private groundKey = '';
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private strokeScene = new THREE.Scene();
  private strokeMesh: THREE.Mesh;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  width = 2;
  height = 2;

  constructor(private renderer: THREE.WebGLRenderer, strokeGeometry: THREE.BufferGeometry, w: number, h: number) {
    this.width = w;
    this.height = h;
    this.a = makeMRT(w, h);
    this.b = makeMRT(w, h);
    this.output = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });

    const ptr = Array.from({ length: 4 }, () => new THREE.Vector4());
    const ptrP = Array.from({ length: 4 }, () => new THREE.Vector2());

    this.processMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: PROCESS_FRAG,
      uniforms: {
        uPaint: { value: null }, uHeight: { value: null }, uTexel: { value: new THREE.Vector2() },
        uAspect: { value: 1 }, uTime: { value: 0 }, uDt: { value: 0 }, uFade: { value: 0 }, uFadeMode: { value: 0 },
        uHaze: { value: new THREE.Color() }, uDry: { value: 0 }, uRelax: { value: 0 }, uFlow: { value: 0 },
        uFlowScale: { value: 1 }, uBleed: { value: 0 }, uPtr: { value: ptr }, uPtrP: { value: ptrP },
        uEmissionDecay: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.strokeMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: STROKE_VERT,
      fragmentShader: STROKE_FRAG,
      uniforms: {
        uPrevPaint: { value: null }, uPrevHeight: { value: null }, uGroundTex: { value: null }, uAspect: { value: 1 },
        uBristleContrast: { value: 0.7 }, uEdgeRough: { value: 0.5 },
        uDryBrush: { value: 0.7 }, uBrokenColor: { value: 0.5 }, uHeightCarry: { value: 0.6 },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquationAlpha: THREE.AddEquation,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    });

    this.compositeMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        uPaint: { value: null }, uHeight: { value: null }, uTexel: { value: new THREE.Vector2() }, uAspect: { value: 1 },
        uTime: { value: 0 }, uGroundTex: { value: null }, uGroundColor: { value: new THREE.Color() },
        uGroundRelief: { value: 0.35 }, uLightDir: { value: new THREE.Vector3(0, 0, 1) }, uLightColor: { value: new THREE.Color(1, 1, 1) },
        uRelief: { value: 14 }, uGloss: { value: 40 }, uSheen: { value: 0.3 }, uAmbient: { value: 0.55 }, uShimmer: { value: 0 },
        uAccentGlow: { value: 1 }, uHaze: { value: new THREE.Color() }, uHazeAmt: { value: 0 }, uSaturation: { value: 1 },
        uContrast: { value: 1 }, uExposure: { value: 1 }, uWarmth: { value: 0 }, uBreath: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.copyMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COPY_FRAG,
      uniforms: { uSrc: { value: null }, uSrc2: { value: null } },
      depthTest: false,
      depthWrite: false,
    });

    this.groundMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: GROUND_FRAG,
      uniforms: { uAspect: { value: 1 }, uGround: { value: 0 }, uGroundDensity: { value: 260 }, uPxPerUnit: { value: 1000 } },
      depthTest: false,
      depthWrite: false,
    });
    this.ground = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.UnsignedByteType,
      format: THREE.RedFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    this.strokeMat.uniforms.uGroundTex.value = this.ground.texture;
    this.compositeMat.uniforms.uGroundTex.value = this.ground.texture;

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.processMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.strokeMesh = new THREE.Mesh(strokeGeometry, this.strokeMat);
    this.strokeMesh.frustumCulled = false;
    this.strokeScene.add(this.strokeMesh);

    this.clear();
  }

  get current() {
    return this.a;
  }

  private draw(mat: THREE.Material, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.cam);
  }

  clear() {
    const r = this.renderer;
    const prev = r.getClearAlpha();
    const prevC = new THREE.Color();
    r.getClearColor(prevC);
    r.setClearColor(0x000000, 0);
    for (const t of [this.a, this.b]) {
      r.setRenderTarget(t);
      r.clear(true, false, false);
    }
    r.setRenderTarget(null);
    r.setClearColor(prevC, prev);
  }

  /** Re-bake the ground texture if its kind, density or the canvas size changed. */
  updateGround(kind: number, density: number, aspect: number) {
    const key = `${kind}|${density.toFixed(1)}|${this.width}x${this.height}|${aspect.toFixed(4)}`;
    if (key === this.groundKey) return;
    this.groundKey = key;
    const u = this.groundMat.uniforms;
    u.uAspect.value = aspect;
    u.uGround.value = kind;
    u.uGroundDensity.value = density;
    u.uPxPerUnit.value = this.height;
    this.draw(this.groundMat, this.ground);
    this.renderer.setRenderTarget(null);
  }

  /** Age the surface (A → B), then swap so A is current. */
  process() {
    const u = this.processMat.uniforms;
    u.uPaint.value = this.a.textures[0];
    u.uHeight.value = this.a.textures[1];
    u.uTexel.value.set(1 / this.width, 1 / this.height);
    this.draw(this.processMat, this.b);
    const t = this.a;
    this.a = this.b;
    this.b = t;
  }

  /** Lay this frame's stroke segments onto the current buffer (reads the previous one for wet pickup). */
  strokes(count: number) {
    if (!count) return;
    const u = this.strokeMat.uniforms;
    u.uPrevPaint.value = this.b.textures[0];
    u.uPrevHeight.value = this.b.textures[1];
    this.renderer.setRenderTarget(this.a);
    this.renderer.render(this.strokeScene, this.cam);
  }

  composite() {
    const u = this.compositeMat.uniforms;
    u.uPaint.value = this.a.textures[0];
    u.uHeight.value = this.a.textures[1];
    u.uTexel.value.set(1 / this.width, 1 / this.height);
    this.draw(this.compositeMat, this.output);
    this.renderer.setRenderTarget(null);
  }

  resize(w: number, h: number) {
    w = Math.max(2, Math.round(w));
    h = Math.max(2, Math.round(h));
    if (w === this.width && h === this.height) return;
    // carry the painting across the resize
    const na = makeMRT(w, h);
    const nb = makeMRT(w, h);
    this.copyMat.uniforms.uSrc.value = this.a.textures[0];
    this.copyMat.uniforms.uSrc2.value = this.a.textures[1];
    this.draw(this.copyMat, na);
    this.a.dispose();
    this.b.dispose();
    this.a = na;
    this.b = nb;
    this.copyMat.uniforms.uSrc.value = this.a.textures[0];
    this.copyMat.uniforms.uSrc2.value = this.a.textures[1];
    this.draw(this.copyMat, this.b);
    this.output.setSize(w, h);
    this.ground.setSize(w, h);
    this.groundKey = '';
    this.width = w;
    this.height = h;
    this.renderer.setRenderTarget(null);
  }

  dispose() {
    this.a.dispose();
    this.b.dispose();
    this.output.dispose();
    this.ground.dispose();
    this.groundMat.dispose();
    this.processMat.dispose();
    this.strokeMat.dispose();
    this.compositeMat.dispose();
    this.copyMat.dispose();
  }
}
