import * as THREE from 'three';
import type { ControlEvent, EngineContext, MovementInstance, NoteOffEvent, NoteOnEvent, PointerState } from '../../core/types';
import { clamp, curlAngle, gauss, lerp, simplex3 } from '../../core/noise';
import { modOffset, modScale, modSums } from '../../core/Modulation';
import { durationNorm, pitchNorm } from '../../core/Signals';
import { BRUSH_TYPES, BrushSystem, angDiff, type BrushSpec } from './BrushSystem';
import { PaintSurface } from './PaintSurface';
import { Atmosphere } from './Atmosphere';
import { groundById, hexToRgb, paletteById, type Palette } from './palettes';

type RGB = [number, number, number];

const GROUND_KIND: Record<string, number> = { linen: 0, coarse: 1, paper: 2, gesso: 3, smooth: 4 };
const TYPE_WIDTH = [1.15, 1, 0.75, 0.9, 1.4, 2.4];
const TYPE_BRISTLES = [1.2, 1, 0.55, 0.5, 0.45, 1.6];

/**
 * Impressionism × Debussy.
 * Every note is a gesture of the painter's hand: where it lands (composition), which brush and
 * pigment it takes (register, harmony), how hard it presses (velocity), how far it travels
 * (duration), and how it bends (harmonic tension, flow of the air).
 */
export class ImpressionismWorld implements MovementInstance {
  private surface: PaintSurface;
  private brushes: BrushSystem;
  private atmosphere: Atmosphere;
  private time = 0;
  private aspect = 16 / 9;

  // painter's attention
  private fx = 0.5;
  private fy = 0.5;
  private scoreX = 0.05;
  private lastOnset = -1;
  private clusterX = 0;
  private clusterAngle = 0;
  private clusterY = 0;

  // accumulators (half-float friendly)
  private pendFade = 0;
  private pendDry = 0;
  private pendEm = 0;
  private wash = 0;
  private lastAccent = -1;

  private paintingPointers = new Set<number>();
  private lightAz = 135;
  private lightEl = 38;
  private paletteCache: { id: string; colors: RGB[]; accent: RGB; haze: RGB; light: RGB } | null = null;

  constructor(private ctx: EngineContext) {
    const p = ctx.params;
    this.brushes = new BrushSystem(p.num('quality.maxStrokes'));
    const size = ctx.renderer.getDrawingBufferSize(new THREE.Vector2());
    const s = p.num('quality.paintRes');
    this.surface = new PaintSurface(ctx.renderer, this.brushes.geometry, size.x * s, size.y * s);
    this.aspect = size.x / size.y;
    this.atmosphere = new Atmosphere();
    ctx.stage.add(this.atmosphere.points);
    this.fx = this.aspect * 0.5;
  }

  get output() {
    return this.surface.output.texture;
  }

  /* --------------------------------------------------------------------------------------------- */
  /*  Notes                                                                                         */
  /* --------------------------------------------------------------------------------------------- */

  noteOn(e: NoteOnEvent) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    const values = {
      ...sig,
      velocity: e.velocity,
      pitch: pitchNorm(e.note),
      duration: e.duration !== undefined ? durationNorm(e.duration) : 0.35,
    };
    const m = modSums(p.routes, values);
    const key = noteKey(e.note, e.channel);
    const A = this.aspect;
    const margin = p.num('im.margin');
    const lo = p.num('im.lowNote');
    const hi = Math.max(lo + 1, p.num('im.highNote'));
    const pn = clamp((e.note - lo) / (hi - lo));
    const layout = p.str('im.layout');
    const pal = this.palette();

    // chord detection — notes within ~70 ms are one gesture
    const cohesion = p.num('im.cluster');
    const inChord = this.time - this.lastOnset < 0.07;
    this.lastOnset = this.time;

    // ---- where ---------------------------------------------------------------------------------
    const spread = p.num('im.spread') * modScale(m, 'spread');
    let x = 0, y = 0;
    const pc = e.note % 12;
    const yPitch = margin + pn * (1 - 2 * margin);
    switch (layout) {
      case 'horizon':
        x = this.fx + gauss(Math.random) * spread * A * 0.5;
        y = yPitch + gauss(Math.random) * 0.025;
        break;
      case 'focus':
        x = this.fx + gauss(Math.random) * spread * A * 0.22;
        y = this.fy + gauss(Math.random) * spread * 0.22 + (pn - 0.5) * 0.35;
        break;
      case 'pitchclass':
        x = margin + ((pc + 0.5) / 12) * (A - 2 * margin) + gauss(Math.random) * spread * 0.03 * A;
        y = yPitch + gauss(Math.random) * 0.02;
        break;
      case 'score':
        x = this.scoreX + gauss(Math.random) * spread * 0.04;
        y = yPitch + gauss(Math.random) * 0.015;
        break;
      case 'radial': {
        const a = (((pc * 7) % 12) / 12) * Math.PI * 2 + Math.PI / 2 + gauss(Math.random) * 0.08 * spread;
        const r = 0.06 + pn * 0.46 + gauss(Math.random) * 0.03 * spread;
        x = A / 2 + Math.cos(a) * r * Math.min(A, 1.6) * 0.9;
        y = 0.5 + Math.sin(a) * r;
        break;
      }
      default:
        x = margin + Math.random() * (A - 2 * margin);
        y = margin + (pn * 0.45 + Math.random() * 0.55) * (1 - 2 * margin);
    }
    if (inChord && cohesion > 0) {
      x = lerp(x, this.clusterX + gauss(Math.random) * 0.02, cohesion);
      if (layout === 'focus' || layout === 'scatter') y = lerp(y, this.clusterY + (pn - 0.5) * 0.1, cohesion * 0.7);
    } else {
      this.clusterX = x;
      this.clusterY = y;
    }
    x = reflectInto(x, margin, A - margin);
    y = reflectInto(y, margin, 1 - margin);

    // ---- which brush ---------------------------------------------------------------------------
    // one luminous accent per gesture — the sun is a single focal point, not every loud note
    const accent = e.velocity >= p.num('im.accentThreshold') && this.time - this.lastAccent > 0.35;
    if (accent) this.lastAccent = this.time;
    let type = brushTypeFor(p.str('im.brush'), pn);
    if (accent) type = type === BRUSH_TYPES.dab ? BRUSH_TYPES.dab : BRUSH_TYPES.round;

    // ---- direction -----------------------------------------------------------------------------
    const horizon = p.num('im.horizon');
    let hz = p.num('im.horizontality');
    if (layout === 'horizon') hz = y < horizon ? Math.min(1, hz * 1.2) : hz * 0.85;
    if (type === BRUSH_TYPES.wash) hz = Math.max(hz, 0.6);
    let angle: number;
    if (inChord && cohesion > 0.2) {
      angle = this.clusterAngle + gauss(Math.random) * 0.12 * (1 - cohesion);
    } else {
      const fs = p.num('im.flowScale');
      let fa = curlAngle(x * fs, y * fs, this.time * p.num('im.flowSpeed') * 0.4);
      // the sky is swept by a consistent wind slant; the water lies flat
      const sky = layout === 'horizon' && y >= horizon;
      const slant = sky ? 0.32 + simplex3(this.time * 0.02, 9.1, 0) * 0.25 : 0;
      const horiz = (Math.random() < 0.5 ? slant : slant + Math.PI) + gauss(Math.random) * 0.07;
      if (Math.abs(angDiff(fa, horiz)) > Math.PI / 2) fa += Math.PI;
      angle = horiz + angDiff(fa, horiz) * (1 - hz);
      this.clusterAngle = angle;
    }

    // ---- size, motion, paint -------------------------------------------------------------------
    const sizeVar = p.num('im.sizeVar');
    let width = p.num('im.size') * modScale(m, 'size', 0.15) * TYPE_WIDTH[type] * Math.max(0.25, 1 + gauss(Math.random) * sizeVar * 0.45);
    if (accent) width *= p.num('im.accentSize');
    let speed = p.num('im.speed') * modScale(m, 'length', 0.1);
    if (type === BRUSH_TYPES.dab) speed *= 0.35;
    const minTime = Math.min(1.5, p.num('im.minLen') / Math.max(0.005, speed));
    const opacity = clamp(p.num('im.opacity') * modScale(m, 'opacity') * (type === BRUSH_TYPES.wash ? 0.45 : 1));
    const thickness = p.num('im.impasto') * modScale(m, 'impasto') * (type === BRUSH_TYPES.wash ? 0.4 : 1);
    const load = p.num('im.load') * modScale(m, 'load');
    // how many brush-widths one load of paint lasts — Monet's dashes are short; long notes re-dip and hatch
    const loadLength = (type === BRUSH_TYPES.dab ? 4 : type === BRUSH_TYPES.wash ? 9 : type === BRUSH_TYPES.round ? 11 : 9) * Math.max(0.2, load);
    const pickup = clamp(p.num('im.pickup') * modScale(m, 'wetness'), 0, 1);
    const curv = p.num('im.curvature') * modScale(m, 'curvature');
    const lift = p.num('im.lift') * modScale(m, 'lift');
    const emission = accent ? 1 : clamp(modOffset(m, 'glow') * 0.5);

    // ---- colour --------------------------------------------------------------------------------
    const jitter = p.num('im.colorJitter') * modScale(m, 'jitter');
    let [colA, colB] = accent
      ? [jitterColor(pal.accent, jitter * 0.5), jitterColor(mixRGB(pal.accent, pal.colors[pal.colors.length - 1], 0.35), jitter * 0.5)]
      : this.pickColors(e.note, pn, y, e.velocity, modOffset(m, 'value'), jitter, pal);
    if (type === BRUSH_TYPES.wash) {
      // washes are thin veils of air-mixed colour, never mud
      colA = mixRGB(colA, pal.haze, 0.45);
      colB = mixRGB(colB, pal.haze, 0.3);
    }

    const base: BrushSpec = {
      x, y, angle, width, speed,
      colA, colB, opacity, thickness, load, loadLength,
      bristles: Math.max(3, p.num('im.bristles') * TYPE_BRISTLES[type] * (0.8 + Math.random() * 0.4)),
      pickup, emission, type,
      turn: (Math.random() - 0.5) * 2 * curv * 0.9 * (type === BRUSH_TYPES.wash ? 0.2 : 1),
      flowFollow: p.num('im.flowFollow') * (type === BRUSH_TYPES.wash ? 0.3 : 1),
      flowScale: p.num('im.flowScale'),
      flowSpeed: p.num('im.flowSpeed'),
      tremor: p.num('im.tremor'),
      lift, minTime, autoRelease: 0, delay: 0,
      restroke: p.bool('im.restroke'),
      key,
    };

    const count = Math.max(1, Math.round(p.num('im.strokes')));
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    for (let k = 0; k < count; k++) {
      const off = (k - (count - 1) / 2) * width * (count > 2 ? 3.2 : 2.3);
      const along = count > 1 ? gauss(Math.random) * width * 1.5 : 0;
      const spec: BrushSpec = {
        ...base,
        x: x + nx * off + Math.cos(angle) * along + (count > 3 ? gauss(Math.random) * width * 2 : 0),
        y: y + ny * off + Math.sin(angle) * along + (count > 3 ? gauss(Math.random) * width * 2 : 0),
        angle: angle + gauss(Math.random) * 0.06,
        delay: k * 0.025,
        colA: k === 0 ? colA : jitterColor(colA, jitter * 0.6),
      };
      this.brushes.spawn(spec);
    }

    // ---- reflections in the water --------------------------------------------------------------
    if (layout === 'horizon' && p.bool('im.reflections') && y > horizon) {
      this.reflect(base, horizon, accent, pal);
    }
  }

  private reflect(base: BrushSpec, horizon: number, accent: boolean, pal: { haze: RGB }) {
    const p = this.ctx.params;
    const amt = p.num('im.reflectAmt');
    if (amt <= 0.01) return;
    const ripple = p.num('im.ripple');
    const ry = horizon - (base.y - horizon) * 0.8;
    if (ry < p.num('im.margin')) return;
    const dashes = 1 + Math.round(ripple * 3) + (accent ? 3 : 0);
    const w = base.width * 0.8;
    for (let i = 0; i < dashes; i++) {
      const fall = 1 - i / (dashes + 1);
      const y = ry - i * w * (2.4 + ripple * 1.5) * (accent ? 1.3 : 1);
      if (y < 0.01) break;
      this.brushes.spawn({
        ...base,
        x: base.x + gauss(Math.random) * w * (1 + ripple * 3),
        y,
        angle: (Math.random() < 0.5 ? 0 : Math.PI) + gauss(Math.random) * 0.04,
        width: w * (0.65 + 0.35 * fall),
        speed: base.speed * (0.8 + Math.random() * 0.5),
        type: accent ? BRUSH_TYPES.dab : base.type === BRUSH_TYPES.wash ? BRUSH_TYPES.wash : BRUSH_TYPES.flat,
        colA: mixRGB(base.colA, pal.haze, 0.18).map((c) => c * 0.94) as RGB,
        colB: mixRGB(base.colB, pal.haze, 0.3),
        opacity: base.opacity * amt * (0.6 + 0.4 * fall),
        thickness: base.thickness * 0.6,
        emission: base.emission * 0.7,
        turn: 0,
        flowFollow: 0,
        autoRelease: (0.1 + (1 - ripple) * 0.55) * (0.6 + Math.random() * 0.8),
        minTime: 0,
        lift: 0.12,
        delay: 0.1 + i * 0.07 + Math.random() * 0.05,
        restroke: false,
        key: -1,
      });
    }
  }

  noteOff(e: NoteOffEvent) {
    const key = noteKey(e.note, e.channel);
    if (this.ctx.signals.values.pedal >= 0.5 && this.ctx.params.bool('src.pedalSustain')) this.brushes.sustain(key);
    else this.brushes.release(key);
  }

  control(e: ControlEvent) {
    if (e.controller === 64 && e.value < 0.5) this.brushes.releaseSustained();
    if (e.controller === -1) this.brushes.bend = e.value;
  }

  allNotesOff() {
    this.brushes.releaseAll();
  }

  /* --------------------------------------------------------------------------------------------- */
  /*  Colour                                                                                        */
  /* --------------------------------------------------------------------------------------------- */

  private palette() {
    const id = this.ctx.params.str('im.palette');
    if (this.paletteCache?.id !== id) {
      const p: Palette = paletteById(id);
      this.paletteCache = {
        id,
        colors: p.colors.map(hexToRgb),
        accent: hexToRgb(p.accent),
        haze: hexToRgb(p.haze),
        light: hexToRgb(p.light),
      };
    }
    return this.paletteCache!;
  }

  private pickColors(note: number, pn: number, y: number, vel: number, valueShift: number, jitter: number, pal: { colors: RGB[] }): [RGB, RGB] {
    const p = this.ctx.params;
    const n = pal.colors.length;
    let t: number;
    switch (p.str('im.colorMode')) {
      case 'pitchclass': t = ((note % 12) * 7 % 12) / 11; break;
      case 'harmony': t = ((((note - this.ctx.signals.root + 12) % 12) * 7) % 12) / 11; break;
      case 'velocity': t = vel; break;
      case 'height': t = y; break;
      case 'random': t = Math.random(); break;
      default: t = pn;
    }
    t += (p.num('im.paletteShift') + valueShift * 0.5) + gauss(Math.random) * jitter * 0.12;
    const idx = Math.round(clamp(t) * (n - 1));
    const nb = clamp(idx + (Math.random() < 0.5 ? -1 : 1), 0, n - 1);
    return [jitterColor(pal.colors[idx], jitter), jitterColor(pal.colors[nb], jitter)];
  }

  /* --------------------------------------------------------------------------------------------- */
  /*  Frame                                                                                         */
  /* --------------------------------------------------------------------------------------------- */

  update(dt: number, time: number, pointers: PointerState[]) {
    const p = this.ctx.params;
    const sig = this.ctx.signals.values;
    this.time = time;
    const A = this.aspect;
    const g = modSums(p.routes, sig);

    // wander the painter's attention
    const wander = p.num('im.wander');
    const margin = p.num('im.margin');
    const wt = time * (0.02 + wander * 0.12);
    // offsets make the attention start near the centre of the canvas
    this.fx = A * (0.5 + 0.42 * (simplex3(wt, 3.1, 0.5) - simplex3(0, 3.1, 0.5)));
    this.fy = 0.5 + 0.36 * (simplex3(7.7, wt * 0.8, 1.5) - simplex3(7.7, 0, 1.5));
    this.fx = clamp(this.fx, margin + 0.05, A - margin - 0.05);
    this.scoreX += dt * (A / 90);
    if (this.scoreX > A - margin) this.scoreX = margin + 0.02;

    // brushes
    this.brushes.aspect = A;
    this.brushes.turbulence = modScale(g, 'turbulence');
    this.brushes.setCapacity(p.num('quality.maxStrokes'));

    // touch
    const touchOn = p.bool('im.touch');
    const touchPaint = p.bool('im.touchPaint');
    const pu = this.surface.processMat.uniforms;
    const ptr = pu.uPtr.value as THREE.Vector4[];
    const ptrP = pu.uPtrP.value as THREE.Vector2[];
    for (let i = 0; i < 4; i++) ptrP[i].set(0, 0);
    let pi = 0;
    for (const pt of pointers) {
      if (touchPaint && touchOn) {
        if (pt.down && !this.paintingPointers.has(pt.id)) {
          this.paintingPointers.add(pt.id);
          this.spawnTouchBrush(pt);
        }
        if (pt.down) this.brushes.pointerPos.set(pt.id, { x: pt.x, y: pt.y });
      } else if (touchOn && pt.down && pi < 4) {
        ptr[pi].set(pt.x, pt.y, pt.vx, pt.vy);
        ptrP[pi].set(p.num('im.touchRadius'), p.num('im.touchStrength'));
        pi++;
      }
    }
    for (const id of [...this.paintingPointers]) {
      const pt = pointers.find((q) => q.id === id);
      if (!pt || !pt.down) {
        this.paintingPointers.delete(id);
        this.brushes.releasePointer(id);
        this.brushes.pointerPos.delete(id);
      }
    }

    // aging accumulators
    const memory = p.num('im.memory');
    if (memory < 1200) this.pendFade += (Math.LN2 / memory) * dt;
    if (this.wash > 0) {
      // a gentle wash: the painting dissolves over ~1.5 s, then the canvas is clean
      this.wash -= dt;
      this.pendFade += dt * 2.4;
      if (this.wash <= 0) {
        this.surface.clear();
        this.pendFade = 0;
      }
    }
    this.pendDry += dt / Math.max(0.5, p.num('im.dryTime'));
    this.pendEm += dt / 7;
    const flush = (v: number) => (v > 0.004 ? v : 0);
    const fade = flush(this.pendFade);
    const dry = flush(this.pendDry);
    const em = flush(this.pendEm);
    if (fade) this.pendFade = 0;
    if (dry) this.pendDry = 0;
    if (em) this.pendEm = 0;

    const pal = this.palette();
    pu.uAspect.value = A;
    pu.uTime.value = time;
    pu.uDt.value = dt;
    pu.uFade.value = Math.min(fade, 0.5);
    pu.uFadeMode.value = p.str('im.memoryMode') === 'haze' ? 1 : 0;
    (pu.uHaze.value as THREE.Color).setRGB(...pal.haze);
    pu.uDry.value = dry;
    pu.uRelax.value = fade * 0.3;
    pu.uFlow.value = p.num('im.liquidity') * (1 + sig.pedal * 0.5);
    pu.uFlowScale.value = p.num('im.flowScale') * 1.5;
    pu.uBleed.value = p.num('im.bleed');
    pu.uEmissionDecay.value = em;

    // stroke uniforms
    const su = this.surface.strokeMat.uniforms;
    const groundKind = GROUND_KIND[p.str('im.ground')] ?? 0;
    su.uAspect.value = A;
    this.surface.updateGround(groundKind, p.num('im.groundDensity'), A);
    su.uBristleContrast.value = p.num('im.bristleContrast');
    su.uEdgeRough.value = p.num('im.edgeRough');
    su.uDryBrush.value = p.num('im.dryBrush');
    su.uBrokenColor.value = p.num('im.brokenColor');
    su.uHeightCarry.value = p.num('im.heightCarry');

    // simulate + paint
    this.surface.process();
    const segs = this.brushes.update(dt);
    this.surface.strokes(segs);

    // light
    const drift = p.num('im.lightDrift');
    let az = p.num('im.lightAz') + Math.sin(time * 0.031) * 55 * drift + Math.sin(time * 0.013) * 25 * drift;
    let el = p.num('im.lightEl') + Math.sin(time * 0.021 + 1) * 10 * drift;
    if (p.bool('im.pointerLight')) {
      const hover = pointers.find((q) => q.active);
      if (hover) {
        const dx = (hover.x - 0.5) * A, dy = hover.y - 0.5;
        az = (Math.atan2(dy, dx) * 180) / Math.PI;
        el = 8 + 70 * Math.max(0, 1 - Math.hypot(dx, dy) * 1.6);
      }
    }
    this.lightAz += angDiff((az * Math.PI) / 180, (this.lightAz * Math.PI) / 180) * (180 / Math.PI) * (1 - Math.exp(-dt * 4));
    this.lightEl += (el - this.lightEl) * (1 - Math.exp(-dt * 4));
    const azr = (this.lightAz * Math.PI) / 180, elr = (clamp(this.lightEl, 2, 89) * Math.PI) / 180;

    const cu = this.surface.compositeMat.uniforms;
    cu.uAspect.value = A;
    cu.uTime.value = time;
    (cu.uGroundColor.value as THREE.Color).setRGB(...hexToRgb(groundById(p.str('im.groundTone')).color));
    cu.uGroundRelief.value = p.num('im.groundRelief');
    (cu.uLightDir.value as THREE.Vector3).set(Math.cos(elr) * Math.cos(azr), Math.cos(elr) * Math.sin(azr), Math.sin(elr));
    (cu.uLightColor.value as THREE.Color).setRGB(...mixRGB([1, 1, 1], pal.light, 0.6));
    cu.uRelief.value = p.num('im.relief');
    cu.uGloss.value = p.num('im.gloss');
    cu.uSheen.value = p.num('im.sheen');
    cu.uAmbient.value = p.num('im.ambient');
    cu.uShimmer.value = p.num('im.shimmer');
    cu.uAccentGlow.value = p.num('im.accentGlow');
    (cu.uHaze.value as THREE.Color).setRGB(...pal.haze);
    cu.uHazeAmt.value = clamp(p.num('im.haze') * modScale(g, 'veil'), 0, 0.9);
    cu.uSaturation.value = p.num('post.saturation');
    cu.uContrast.value = p.num('post.contrast');
    cu.uExposure.value = p.num('post.exposure');
    cu.uWarmth.value = p.num('im.warmth');
    cu.uBreath.value = p.num('im.breath');
    this.surface.composite();

    // atmosphere
    const at = this.atmosphere;
    at.points.visible = p.bool('im.atmosphere');
    at.setCount(p.num('im.motes'));
    const au = at.material.uniforms;
    const react = p.num('im.moteReact');
    au.uTime.value = time;
    au.uAspect.value = A;
    au.uSize.value = p.num('im.moteSize');
    au.uDrift.value = p.num('im.moteDrift');
    au.uGlow.value = p.num('im.moteGlow');
    au.uEnergy.value = react * clamp(modOffset(g, 'atmosphere'), 0, 2);
    au.uPulse.value = react * sig.pulse;
    (au.uColor.value as THREE.Color).setRGB(...mixRGB(pal.light, [1, 0.95, 0.85], 0.4));
    au.uPixelRatio.value = this.ctx.renderer.getPixelRatio();
    au.uViewH.value = this.ctx.renderer.domElement.height / this.ctx.renderer.getPixelRatio();
  }

  private spawnTouchBrush(pt: PointerState) {
    const p = this.ctx.params;
    const pal = this.palette();
    const [colA, colB] = this.pickColors(60 + Math.round(pt.y * 36), pt.y, pt.y, 0.7, 0, p.num('im.colorJitter'), pal);
    this.brushes.pointerPos.set(pt.id, { x: pt.x, y: pt.y });
    this.brushes.spawn({
      x: pt.x * this.aspect, y: pt.y, angle: 0, width: p.num('im.size') * 1.3, speed: 0,
      colA, colB, opacity: p.num('im.opacity'), thickness: p.num('im.impasto'), load: p.num('im.load') * 1.6,
      loadLength: 90, bristles: p.num('im.bristles'), pickup: p.num('im.pickup'), emission: 0, type: BRUSH_TYPES.filbert,
      turn: 0, flowFollow: 0, flowScale: 1, flowSpeed: 0, tremor: 0, lift: 0.15, minTime: 0, autoRelease: 0, delay: 0,
      restroke: false, key: -2, follow: pt.id,
    });
  }

  resize(width: number, height: number) {
    this.aspect = width / height;
    const s = this.ctx.params.num('quality.paintRes');
    this.surface.resize(width * s, height * s);
  }

  clear() {
    this.brushes.kill();
    this.wash = 1.5;
  }

  dispose() {
    this.ctx.stage.remove(this.atmosphere.points);
    this.atmosphere.dispose();
    this.surface.dispose();
    this.brushes.geometry.dispose();
  }
}

/* ----------------------------------------------------------------------------------------------- */

function noteKey(note: number, channel: number) {
  return note * 64 + (channel & 63);
}

function brushTypeFor(mode: string, pn: number): number {
  if (mode !== 'auto') return BRUSH_TYPES[mode as keyof typeof BRUSH_TYPES] ?? BRUSH_TYPES.filbert;
  if (pn < 0.2) return BRUSH_TYPES.wash;
  if (pn < 0.42) return BRUSH_TYPES.flat;
  if (pn < 0.72) return BRUSH_TYPES.filbert;
  if (pn < 0.88) return BRUSH_TYPES.round;
  return BRUSH_TYPES.dab;
}

function reflectInto(v: number, a: number, b: number) {
  if (b <= a) return (a + b) / 2;
  const span = b - a;
  let t = (v - a) / span;
  t = t - Math.floor(t / 2) * 2;
  if (t > 1) t = 2 - t;
  return a + t * span;
}

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function jitterColor(c: RGB, j: number): RGB {
  if (j <= 0) return [c[0], c[1], c[2]];
  const v = 1 + gauss(Math.random) * j * 0.07;
  return [
    clamp((c[0] + gauss(Math.random) * j * 0.035) * v),
    clamp((c[1] + gauss(Math.random) * j * 0.035) * v),
    clamp((c[2] + gauss(Math.random) * j * 0.035) * v),
  ];
}
