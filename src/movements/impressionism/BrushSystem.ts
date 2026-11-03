import * as THREE from 'three';
import { clamp, curlAngle, simplex3, smoothstep } from '../../core/noise';

/** Brush shapes understood by the stroke shader. */
export const BRUSH_TYPES = { flat: 0, filbert: 1, round: 2, dab: 3, fan: 4, wash: 5 } as const;

export interface BrushSpec {
  x: number;
  y: number;
  angle: number;
  /** half width, canvas units */
  width: number;
  speed: number;
  colA: [number, number, number];
  colB: [number, number, number];
  opacity: number;
  thickness: number;
  load: number;
  /** distance (in brush widths) one full load lasts */
  loadLength: number;
  bristles: number;
  pickup: number;
  emission: number;
  type: number;
  /** personal turning rate rad/s */
  turn: number;
  flowFollow: number;
  flowScale: number;
  flowSpeed: number;
  tremor: number;
  lift: number;
  minTime: number;
  /** auto-release after this many seconds (for notes with known length / reflections) */
  autoRelease: number;
  delay: number;
  restroke: boolean;
  /** identifies the note holding this brush; -1 = free-running */
  key: number;
  follow?: number; // pointer id for touch-painting
}

class Brush {
  alive = false;
  s!: BrushSpec;
  x = 0; y = 0; ang = 0;
  age = 0;
  released = -1; // time since release; -1 while held
  sustained = false;
  pressure = 0;
  load = 1;
  u = 0;
  started = false;
  // previous endpoint
  px = 0; py = 0; pnx = 0; pny = 1; pw = 0; pl = 1; pu = 0;
  firstSeg = true;
  restrokes = 0;
  tremorSeed = 0;
  born = 0;
}

const MAX_SEGMENTS = 24000;

/**
 * CPU brush simulation. Each frame every brush advances along its path and appends ribbon
 * segments to an instanced geometry; the paint surface draws them with the stroke shader.
 */
export class BrushSystem {
  private pool: Brush[] = [];
  private segCount = 0;
  readonly geometry: THREE.InstancedBufferGeometry;
  private aP: Float32Array;
  private aN: Float32Array;
  private aW: Float32Array;
  private aL: Float32Array;
  private aColA: Float32Array;
  private aColB: Float32Array;
  private aX: Float32Array;
  private attrs: THREE.InstancedBufferAttribute[] = [];
  aspect = 16 / 9;
  time = 0;
  bend = 0;
  turbulence = 1;
  pointerPos = new Map<number, { x: number; y: number }>();

  constructor(capacity: number) {
    this.setCapacity(capacity);
    const g = new THREE.InstancedBufferGeometry();
    // quad: x = t along (0/1), y = side (-1/1)
    const pos = new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const mk = (name: string) => {
      const arr = new Float32Array(MAX_SEGMENTS * 4);
      const a = new THREE.InstancedBufferAttribute(arr, 4);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(name, a);
      this.attrs.push(a);
      return arr;
    };
    this.aP = mk('aP');
    this.aN = mk('aN');
    this.aW = mk('aW');
    this.aL = mk('aL');
    this.aColA = mk('aColA');
    this.aColB = mk('aColB');
    this.aX = mk('aX');
    g.instanceCount = 0;
    this.geometry = g;
  }

  setCapacity(n: number) {
    while (this.pool.length < n) this.pool.push(new Brush());
    if (this.pool.length > n) this.pool.length = n;
  }

  get activeCount() {
    let c = 0;
    for (const b of this.pool) if (b.alive) c++;
    return c;
  }

  spawn(spec: BrushSpec) {
    let b = this.pool.find((p) => !p.alive);
    if (!b) {
      // steal the most-finished brush
      let best: Brush | null = null;
      let bestScore = -Infinity;
      for (const p of this.pool) {
        const score = (p.released >= 0 ? 100 : 0) + p.age - p.load * 2;
        if (score > bestScore) { bestScore = score; best = p; }
      }
      b = best!;
    }
    b.alive = true;
    b.s = spec;
    b.x = spec.x; b.y = spec.y; b.ang = spec.angle;
    b.age = -spec.delay;
    b.released = -1;
    b.sustained = false;
    b.pressure = 0;
    b.load = spec.load;
    b.u = Math.random() * 50;
    b.started = false;
    b.firstSeg = true;
    b.restrokes = 0;
    b.tremorSeed = Math.random() * 100;
    b.born = this.time;
    return b;
  }

  release(key: number) {
    for (const b of this.pool) if (b.alive && b.s.key === key && b.released < 0 && !b.sustained) b.released = 0;
  }

  sustain(key: number) {
    for (const b of this.pool) if (b.alive && b.s.key === key && b.released < 0) b.sustained = true;
  }

  releaseSustained() {
    for (const b of this.pool) if (b.alive && b.sustained && b.released < 0) { b.sustained = false; b.released = 0; }
  }

  releaseAll() {
    for (const b of this.pool) if (b.alive && b.released < 0) b.released = 0;
  }

  releasePointer(id: number) {
    for (const b of this.pool) if (b.alive && b.s.follow === id && b.released < 0) b.released = 0;
  }

  kill() {
    for (const b of this.pool) b.alive = false;
  }

  /** Advance all brushes and fill the segment buffer. Returns number of segments. */
  update(dt: number): number {
    this.time += dt;
    this.segCount = 0;
    for (const b of this.pool) if (b.alive) this.step(b, dt);
    this.geometry.instanceCount = this.segCount;
    if (this.segCount) for (const a of this.attrs) { a.clearUpdateRanges(); a.addUpdateRange(0, this.segCount * 4); a.needsUpdate = true; }
    return this.segCount;
  }

  private step(b: Brush, dt: number) {
    const s = b.s;
    b.age += dt;
    if (b.age < 0) return; // delayed start
    if (s.autoRelease > 0 && b.released < 0 && !b.sustained && b.age >= s.autoRelease) b.released = 0;
    const effectiveRelease = b.released >= 0 && b.age >= s.minTime;
    if (b.released >= 0 && effectiveRelease) b.released += dt;

    // pressure envelope: loaded touch-down, slow piano-like decay while held, eased lift-off
    const attack = 0.55 + 0.45 * smoothstep(0, 0.07, b.age);
    const sustainDecay = 1 - 0.38 * (1 - Math.exp(-b.age / 2.8));
    const liftT = effectiveRelease ? clamp(b.released / Math.max(0.02, s.lift)) : 0;
    const lift = 1 - liftT * liftT * (3 - 2 * liftT);
    b.pressure = attack * sustainDecay * lift;

    if ((effectiveRelease && liftT >= 1) || b.load < -0.2) {
      if (b.released < 0 && s.restroke && b.restrokes < 4 && b.load < -0.2) {
        this.restroke(b);
        return;
      }
      b.alive = false;
      return;
    }

    // speed: accelerate from rest, cruise, slight flick on lift
    let speed = s.speed * (0.3 + 0.7 * smoothstep(0, 0.16, b.age)) * (1 + 0.6 * liftT);
    if (s.follow !== undefined) speed = 0;

    const total = speed * dt;
    const maxStep = Math.max(s.width * 0.6, 0.0015);
    const n = Math.max(1, Math.min(8, Math.ceil(total / maxStep)));
    const sdt = dt / n;

    for (let i = 0; i < n; i++) {
      if (!b.started) {
        b.started = true;
        b.px = b.x; b.py = b.y;
        b.pnx = -Math.sin(b.ang); b.pny = Math.cos(b.ang);
        b.pw = s.width * (0.62 + 0.38 * b.pressure);
        b.pl = b.load; b.pu = b.u;
      }

      if (s.follow !== undefined) {
        const p = this.pointerPos.get(s.follow);
        if (p) {
          const tx = p.x * this.aspect;
          const ty = p.y;
          const dx = tx - b.x, dy = ty - b.y;
          const d = Math.hypot(dx, dy);
          if (d > 1e-5) {
            const k = 1 - Math.exp(-sdt * 30);
            b.x += dx * k; b.y += dy * k;
            const ta = Math.atan2(dy, dx);
            b.ang += angDiff(ta, b.ang) * Math.min(1, sdt * 25);
          }
        }
      } else {
        // steering: personal arc + flow field + tremor + pitch bend
        const t = this.time;
        const fa = curlAngle(b.x * s.flowScale, b.y * s.flowScale, t * s.flowSpeed * 0.4);
        const follow = clamp(s.flowFollow * this.turbulence, 0, 1.5);
        let da = angDiff(fa, b.ang);
        if (Math.abs(da) > Math.PI / 2) da = angDiff(fa + Math.PI, b.ang); // flow is a direction, not a heading
        b.ang += da * follow * sdt * 2.2;
        b.ang += s.turn * sdt * (0.6 + 0.4 * b.pressure);
        b.ang += simplex3(b.tremorSeed, t * 3.0, 0) * s.tremor * sdt * 3.5;
        b.ang += this.bend * sdt * 1.5;
        const v = speed * sdt;
        b.x += Math.cos(b.ang) * v;
        b.y += Math.sin(b.ang) * v;
      }

      const dx = b.x - b.px, dy = b.y - b.py;
      const ds = Math.hypot(dx, dy);
      if (ds < 1e-6) continue;
      // tremor also wobbles the width a little
      const wob = 1 + simplex3(b.tremorSeed + 7, b.u * 40, 1) * 0.08 * s.tremor;
      const w = s.width * (0.62 + 0.38 * b.pressure) * wob;
      b.u += ds;
      b.load -= (ds / (s.width * s.loadLength)) * (0.5 + 0.7 * b.pressure);
      const nx = -Math.sin(b.ang), ny = Math.cos(b.ang);
      this.emit(b, b.px, b.py, b.x, b.y, b.pnx, b.pny, nx, ny, b.pw, w, b.pu, b.u, b.pl, b.load);
      b.px = b.x; b.py = b.y; b.pnx = nx; b.pny = ny; b.pw = w; b.pl = b.load; b.pu = b.u;
    }
  }

  private restroke(b: Brush) {
    const s = b.s;
    b.restrokes++;
    const side = b.restrokes % 2 ? 1 : -1;
    const nx = -Math.sin(b.ang), ny = Math.cos(b.ang);
    b.x += nx * s.width * 1.7 * side;
    b.y += ny * s.width * 1.7 * side;
    b.ang += Math.PI + (Math.random() - 0.5) * 0.5;
    b.load = s.load * 0.8;
    b.started = false;
    b.firstSeg = true;
    b.age = 0.02;
  }

  private emit(
    b: Brush,
    x0: number, y0: number, x1: number, y1: number,
    n0x: number, n0y: number, n1x: number, n1y: number,
    w0: number, w1: number, u0: number, u1: number, l0: number, l1: number,
  ) {
    if (this.segCount >= MAX_SEGMENTS) return;
    const i = this.segCount * 4;
    const s = b.s;
    this.aP[i] = x0; this.aP[i + 1] = y0; this.aP[i + 2] = x1; this.aP[i + 3] = y1;
    this.aN[i] = n0x; this.aN[i + 1] = n0y; this.aN[i + 2] = n1x; this.aN[i + 3] = n1y;
    this.aW[i] = w0; this.aW[i + 1] = w1; this.aW[i + 2] = u0; this.aW[i + 3] = u1;
    this.aL[i] = l0; this.aL[i + 1] = l1; this.aL[i + 2] = (b.tremorSeed % 1) + (b.born % 7) * 0.13; this.aL[i + 3] = s.type;
    this.aColA[i] = s.colA[0]; this.aColA[i + 1] = s.colA[1]; this.aColA[i + 2] = s.colA[2]; this.aColA[i + 3] = s.opacity;
    this.aColB[i] = s.colB[0]; this.aColB[i + 1] = s.colB[1]; this.aColB[i + 2] = s.colB[2]; this.aColB[i + 3] = s.thickness;
    const cap = b.firstSeg ? (s.type === BRUSH_TYPES.wash ? 0.6 : s.type === BRUSH_TYPES.flat ? 0.35 : 0.9) : 0;
    this.aX[i] = s.bristles; this.aX[i + 1] = s.pickup; this.aX[i + 2] = s.emission; this.aX[i + 3] = cap;
    b.firstSeg = false;
    this.segCount++;
  }
}

export function angDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
