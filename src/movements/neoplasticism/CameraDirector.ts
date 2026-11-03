import * as THREE from 'three';
import { clamp, lerp, simplex3, smoothstep } from '../../core/noise';

export interface DirectorInput {
  dt: number;
  time: number;
  mode: string;
  pace: number;
  closeness: number;
  revealTime: number;
  handheld: number;
  react: number;
  fov: number;
  /** half extents of the structure */
  extent: THREE.Vector3;
  /** where the latest note landed, and the axis of its newest line */
  focus: THREE.Vector3;
  focusAxis: number;
  /** centroid of recent activity */
  centroid: THREE.Vector3;
  loudness: number;
  density: number;
  pulse: number;
  energy: number;
  /** push in (<0) or out (>0) */
  distanceMod: number;
  phraseEnded: boolean;
  /** a line was just started: origin + axis */
  newLine: { origin: THREE.Vector3; axis: number } | null;
  /** cell centres of the lattice, per axis (for the fly-through) */
  lattice: [number[], number[], number[]];
  userYaw: number;
  userPitch: number;
  userZoom: number;
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const UP = new THREE.Vector3(0, 1, 0);
const DEG = Math.PI / 180;

/** Classical drawing viewpoints: isometric, dimetric, elevations, plan. [azimuth, elevation] */
const VIEWS: [number, number][] = [
  [45, 35.26], [-45, 35.26], [135, 30], [-135, 30], [30, 18], [-60, 22], [0, 2], [90, 2], [20, 70], [-20, 55], [60, 10],
];

/**
 * The camera operator. Each move computes where it *wants* to be; a critically damped spring
 * carries the real camera there, so every move — even a cut to a new close-up — is a glide.
 */
export class CameraDirector {
  readonly pos = new THREE.Vector3(14, 8, 18);
  readonly target = new THREE.Vector3();
  private vPos = new THREE.Vector3();
  private vTarget = new THREE.Vector3();
  private wantPos = new THREE.Vector3();
  private wantTarget = new THREE.Vector3();
  ortho = false;
  focusDistance = 10;

  // reveal
  private cycleStart = -1e9;
  private cycleFocus = new THREE.Vector3();
  private cycleAxis = 0;
  private cycleAz = 0.5;
  private cycleSide = 1;
  // follow
  private lineOrigin = new THREE.Vector3();
  private lineAxis = 0;
  private lineSince = -1e9;
  private lineSide = 1;
  // fly-through
  private flyPos = new THREE.Vector3(0, 0, 0);
  private flyAxis = 0;
  private flyDir = 1;
  // phrase
  private viewIdx = 0;
  private viewSince = -1e9;
  // breathe
  private breath = 0.5;
  private lastMode = '';
  private az = 0.6;

  update(i: DirectorInput) {
    const E = i.extent;
    const R = E.length();
    const half = Math.tan((i.fov * DEG) / 2);
    const fullDist = (R / half) * 1.02;
    const closeDist = lerp(R * 1.1, R * 0.1, i.closeness);
    const t = i.time;
    if (i.mode !== this.lastMode) {
      this.cycleStart = -1e9;
      this.lineSince = -1e9;
      this.viewSince = -1e9;
      this.lastMode = i.mode;
    }
    let stiffness = 1.3;
    this.ortho = false;

    switch (i.mode) {
      case 'reveal': {
        const age = t - this.cycleStart;
        const due = age > i.revealTime + 14 || (i.phraseEnded && age > Math.max(8, i.revealTime * 0.7));
        if (due) {
          this.cycleStart = t;
          this.cycleFocus.copy(i.focus);
          this.cycleAxis = i.focusAxis;
          this.cycleSide = Math.random() < 0.5 ? 1 : -1;
          // look almost along the line, so it recedes in perspective
          const ax = AXES[this.cycleAxis];
          const graze = (22 + Math.random() * 16) * DEG * this.cycleSide;
          this.cycleAz = this.cycleAxis === 1 ? Math.random() * Math.PI * 2 : Math.atan2(ax.x, ax.z) + graze + (Math.random() < 0.5 ? Math.PI : 0);
        }
        const a = clamp((t - this.cycleStart) / i.revealTime);
        const u = smoothstep(0.1, 1, a);
        const u2 = u * u * (3 - 2 * u);
        // during the close-up the camera dollies slowly along the line
        const along = AXES[this.cycleAxis].clone().multiplyScalar((t - this.cycleStart) * 0.06 * i.pace * (1 - u2) * this.cycleSide);
        this.wantTarget.copy(this.cycleFocus).add(along).lerp(i.centroid.clone().multiplyScalar(0.3), u2);
        const dist = lerp(closeDist, fullDist, Math.pow(u2, 1.2));
        const el = lerp(this.cycleAxis === 1 ? 38 : 9, 27, u2) * DEG;
        const azm = this.cycleAz + (t - this.cycleStart) * 0.012 * i.pace + u2 * 0.7 * this.cycleSide;
        sph(this.wantPos, this.wantTarget, azm, el, dist);
        stiffness = 0.9;
        break;
      }
      case 'follow': {
        if (i.newLine && t - this.lineSince > 2.8 / i.pace) {
          this.lineOrigin.copy(i.newLine.origin);
          this.lineAxis = i.newLine.axis;
          this.lineSince = t;
          this.lineSide = Math.random() < 0.5 ? 1 : -1;
        }
        if (this.lineSince < -1e8) {
          this.lineOrigin.copy(i.focus);
          this.lineAxis = i.focusAxis;
          this.lineSince = t;
        }
        const ax = AXES[this.lineAxis];
        const travel = (t - this.lineSince) * 0.5 * i.pace;
        const lim = this.lineAxis === 0 ? E.x : this.lineAxis === 1 ? E.y : E.z;
        const pAlong = clamp(ax.dot(this.lineOrigin) + travel * this.lineSide, -lim * 1.2, lim * 1.2);
        this.wantTarget.copy(this.lineOrigin).addScaledVector(ax, pAlong - ax.dot(this.lineOrigin));
        const side = this.lineAxis === 1 ? new THREE.Vector3(1, 0, 0.4).normalize() : new THREE.Vector3().crossVectors(ax, UP).normalize();
        const d = closeDist * 1.3;
        this.wantPos
          .copy(this.wantTarget)
          .addScaledVector(ax, -d * this.lineSide)
          .addScaledVector(side, d * 0.45)
          .addScaledVector(UP, this.lineAxis === 1 ? 0 : d * 0.22);
        stiffness = 1.1;
        break;
      }
      case 'flythrough': {
        const [cx, cy, cz] = i.lattice;
        const ax = AXES[this.flyAxis];
        this.flyPos.addScaledVector(ax, this.flyDir * i.dt * 0.9 * i.pace);
        const lim = [E.x, E.y, E.z][this.flyAxis] * 1.15;
        const coord = this.flyPos.getComponent(this.flyAxis);
        if (Math.abs(coord) > lim || !isFinite(coord)) {
          // turn at the edge into another corridor, through a lattice cell centre
          const prev = this.flyAxis;
          this.flyAxis = [0, 2, 1].filter((a) => a !== prev)[Math.random() < 0.75 ? 0 : 1];
          if (this.flyAxis === 1 && Math.random() < 0.6) this.flyAxis = prev === 0 ? 2 : 0;
          this.flyPos.setComponent(prev, clamp(coord, -lim * 0.9, lim * 0.9));
          const snap = (arr: number[], v: number) => arr.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), arr[0] ?? 0);
          if (this.flyAxis !== 0) this.flyPos.x = snap(cx, this.flyPos.x);
          if (this.flyAxis !== 1) this.flyPos.y = snap(cy, this.flyPos.y);
          if (this.flyAxis !== 2) this.flyPos.z = snap(cz, this.flyPos.z);
          this.flyDir = this.flyPos.getComponent(this.flyAxis) > 0 ? -1 : 1;
        }
        this.wantPos.copy(this.flyPos);
        this.wantTarget.copy(this.flyPos).addScaledVector(AXES[this.flyAxis], this.flyDir * 4).addScaledVector(UP, -0.15);
        stiffness = 0.8;
        break;
      }
      case 'phrase': {
        if ((i.phraseEnded && t - this.viewSince > 4 / i.pace) || this.viewSince < -1e8) {
          let n = this.viewIdx;
          while (n === this.viewIdx) n = Math.floor(Math.random() * VIEWS.length);
          this.viewIdx = n;
          this.viewSince = t;
        }
        const [az, el] = VIEWS[this.viewIdx];
        this.wantTarget.set(0, 0, 0);
        sph(this.wantPos, this.wantTarget, az * DEG + Math.sin(t * 0.03) * 0.05, el * DEG, fullDist * 0.95);
        this.ortho = true;
        stiffness = 1.0;
        break;
      }
      case 'breathe': {
        const k = clamp(i.loudness * 0.7 + i.density * 0.6);
        this.breath += (k - this.breath) * (1 - Math.exp(-i.dt * 0.35 * i.pace));
        this.az += i.dt * 0.03 * i.pace * (1 + i.energy);
        this.wantTarget.copy(i.centroid).lerp(new THREE.Vector3(), this.breath);
        sph(this.wantPos, this.wantTarget, this.az, (12 + 22 * this.breath) * DEG, lerp(closeDist * 1.6, fullDist * 1.05, this.breath));
        stiffness = 0.7;
        break;
      }
      case 'track': {
        // stay close to a moving subject (a voice), circling it slowly
        this.az += i.dt * 0.06 * i.pace * (1 + i.energy);
        this.wantTarget.copy(i.focus);
        sph(this.wantPos, this.wantTarget, this.az, (10 + 8 * Math.sin(t * 0.05)) * DEG, closeDist * 1.4);
        stiffness = 0.75;
        break;
      }
      case 'still': {
        this.wantTarget.set(0, 0, 0);
        sph(this.wantPos, this.wantTarget, 45 * DEG, 30 * DEG, fullDist * 0.95);
        this.ortho = true;
        break;
      }
      default: {
        // orbit
        this.az += i.dt * 0.07 * i.pace * (1 + i.energy);
        this.wantTarget.set(0, 0, 0);
        sph(this.wantPos, this.wantTarget, this.az, (22 + 9 * Math.sin(t * 0.04)) * DEG, fullDist);
      }
    }

    // user hand on top of any move: drag turns, wheel zooms
    const off = this.wantPos.clone().sub(this.wantTarget);
    off.applyAxisAngle(UP, i.userYaw);
    const right = new THREE.Vector3().crossVectors(UP, off).normalize();
    const pitched = off.clone().applyAxisAngle(right, -i.userPitch);
    if (Math.abs(pitched.clone().normalize().y) < 0.97) off.copy(pitched);
    off.multiplyScalar(i.userZoom * (1 + i.distanceMod * 0.6) * (1 - 0.05 * i.react * i.pulse));
    this.wantPos.copy(this.wantTarget).add(off);

    // hand-held float
    if (i.handheld > 0) {
      const d = off.length();
      const hh = i.handheld * d * 0.025;
      this.wantPos.x += simplex3(t * 0.21, 1.7, 0) * hh;
      this.wantPos.y += simplex3(t * 0.19, 4.2, 0) * hh;
      this.wantPos.z += simplex3(t * 0.23, 7.9, 0) * hh;
      this.wantTarget.x += simplex3(t * 0.17, 2.4, 3) * hh * 0.4;
      this.wantTarget.y += simplex3(t * 0.15, 5.1, 3) * hh * 0.4;
    }

    // critically damped springs — every move is a glide
    const w = stiffness * Math.sqrt(i.pace) * (1 + i.energy * 0.6);
    spring(this.pos, this.vPos, this.wantPos, w, i.dt);
    spring(this.target, this.vTarget, this.wantTarget, w * 1.15, i.dt);
    this.focusDistance = this.pos.distanceTo(this.target);
  }
}

function sph(out: THREE.Vector3, target: THREE.Vector3, az: number, el: number, dist: number) {
  out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(target);
}

function spring(x: THREE.Vector3, v: THREE.Vector3, goal: THREE.Vector3, w: number, dt: number) {
  // semi-implicit critically damped spring, sub-stepped for stability
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    v.x += ((goal.x - x.x) * w * w - 2 * w * v.x) * h;
    v.y += ((goal.y - x.y) * w * w - 2 * w * v.y) * h;
    v.z += ((goal.z - x.z) * w * w - 2 * w * v.z) * h;
    x.addScaledVector(v, h);
  }
}
