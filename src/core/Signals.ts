import type { ControlEvent, ModSource, NoteOffEvent, NoteOnEvent } from './types';
import type { NoteBusListener } from './NoteBus';

/** Every musical signal the visuals can listen to. Shown in the Mapping panel. */
export const MOD_SOURCES: ModSource[] = [
  { id: 'velocity', label: 'Velocity', scope: 'note', hint: 'How hard the key was struck (per note).' },
  { id: 'pitch', label: 'Pitch', scope: 'note', hint: 'Low → 0, high → 1 across the piano range (per note).' },
  { id: 'duration', label: 'Duration', scope: 'note', hint: 'Note length. Known ahead for files; for live playing it grows while the key is held.' },
  { id: 'interval', label: 'Interval leap', scope: 'note', hint: 'Distance from the previous note — small steps ≈ 0, wide leaps → 1.' },
  { id: 'density', label: 'Density', scope: 'global', hint: 'Notes per second, smoothed. Busy passages → 1.' },
  { id: 'tension', label: 'Harmonic tension', scope: 'global', hint: 'Dissonance of the notes currently sounding (seconds, tritones…).' },
  { id: 'loudness', label: 'Loudness', scope: 'global', hint: 'Overall dynamic level, from velocities or the audio signal.' },
  { id: 'brightness', label: 'Brightness', scope: 'global', hint: 'Average register / spectral centroid — how “high” the music sits.' },
  { id: 'pedal', label: 'Sustain pedal', scope: 'global', hint: 'CC64 — the damper pedal.' },
  { id: 'soft', label: 'Soft pedal', scope: 'global', hint: 'CC67 — una corda.' },
  { id: 'modwheel', label: 'Mod wheel', scope: 'global', hint: 'CC1 on your controller.' },
  { id: 'pulse', label: 'Onset pulse', scope: 'global', hint: 'Spikes on every attack and fades quickly.' },
];

const INTERVAL_DISSONANCE = [0, 1, 0.55, 0.15, 0.1, 0.05, 0.85, 0.05, 0.1, 0.15, 0.55, 1];

export class Signals implements NoteBusListener {
  /** live values 0–1 for global sources */
  readonly values: Record<string, number> = {
    density: 0,
    tension: 0,
    loudness: 0,
    brightness: 0.5,
    pedal: 0,
    soft: 0,
    modwheel: 0,
    pulse: 0,
    velocity: 0,
    pitch: 0.5,
    duration: 0.3,
    interval: 0,
  };
  /** midi note → velocity of everything currently sounding (held or pedal-sustained) */
  readonly active = new Map<number, number>();
  private held = new Set<number>();
  private noteTimes: number[] = [];
  private lastNote = -1;
  private audioFeatures: { loudness: number; brightness: number; t: number } | null = null;
  pitchBend = 0;
  /** pitch class 0–11 of the current harmonic root estimate */
  root = 0;

  noteOn(e: NoteOnEvent) {
    const now = performance.now() / 1000;
    this.noteTimes.push(now);
    this.active.set(e.note, e.velocity);
    this.held.add(e.note);
    this.values.velocity = e.velocity;
    this.values.pitch = pitchNorm(e.note);
    this.values.interval = this.lastNote < 0 ? 0 : Math.min(1, Math.abs(e.note - this.lastNote) / 24);
    this.values.duration = e.duration !== undefined ? durationNorm(e.duration) : 0.3;
    this.lastNote = e.note;
    this.values.pulse = Math.min(1, this.values.pulse + 0.35 + 0.65 * e.velocity);
    if (!this.audioFeatures) this.values.loudness = Math.max(this.values.loudness, e.velocity * 0.9);
    this.updateHarmony();
  }

  noteOff(e: NoteOffEvent) {
    this.held.delete(e.note);
    if (this.values.pedal < 0.5) this.active.delete(e.note);
    this.updateHarmony();
  }

  control(e: ControlEvent) {
    if (e.controller === 64) {
      this.values.pedal = e.value;
      if (e.value < 0.5) for (const n of [...this.active.keys()]) if (!this.held.has(n)) this.active.delete(n);
      this.updateHarmony();
    } else if (e.controller === 67) this.values.soft = e.value;
    else if (e.controller === 1) this.values.modwheel = e.value;
    else if (e.controller === -1) this.pitchBend = e.value;
  }

  allNotesOff() {
    this.active.clear();
    this.held.clear();
    this.values.pedal = 0;
    this.updateHarmony();
  }

  /** Audio-file analysis overrides loudness / brightness while it is running. */
  setAudioFeatures(loudness: number, brightness: number) {
    this.audioFeatures = { loudness, brightness, t: performance.now() / 1000 };
  }

  update(dt: number) {
    const now = performance.now() / 1000;
    while (this.noteTimes.length && now - this.noteTimes[0] > 2.5) this.noteTimes.shift();
    const nps = this.noteTimes.length / 2.5;
    const targetDensity = 1 - Math.exp(-nps / 6);
    this.values.density += (targetDensity - this.values.density) * (1 - Math.exp(-dt * 2));

    this.values.pulse *= Math.exp(-dt * 6);

    if (this.audioFeatures && now - this.audioFeatures.t < 0.5) {
      this.values.loudness += (this.audioFeatures.loudness - this.values.loudness) * (1 - Math.exp(-dt * 12));
      this.values.brightness += (this.audioFeatures.brightness - this.values.brightness) * (1 - Math.exp(-dt * 4));
    } else {
      this.audioFeatures = null;
      let target = 0;
      for (const v of this.active.values()) target = Math.max(target, v * 0.8);
      const k = target > this.values.loudness ? 10 : 0.8;
      this.values.loudness += (target - this.values.loudness) * (1 - Math.exp(-dt * k));
      if (this.active.size) {
        let s = 0;
        for (const n of this.active.keys()) s += pitchNorm(n);
        const b = s / this.active.size;
        this.values.brightness += (b - this.values.brightness) * (1 - Math.exp(-dt * 2));
      }
    }
    this.values.tension += (this.tensionTarget - this.values.tension) * (1 - Math.exp(-dt * 3));
  }

  private tensionTarget = 0;

  private updateHarmony() {
    const notes = [...this.active.keys()].sort((a, b) => a - b);
    if (!notes.length) {
      this.tensionTarget = 0;
      return;
    }
    this.root = notes[0] % 12;
    const pcs = [...new Set(notes.map((n) => n % 12))];
    if (pcs.length < 2) {
      this.tensionTarget = 0;
      return;
    }
    let sum = 0;
    let pairs = 0;
    for (let i = 0; i < pcs.length; i++)
      for (let j = i + 1; j < pcs.length; j++) {
        sum += INTERVAL_DISSONANCE[Math.abs(pcs[i] - pcs[j]) % 12];
        pairs++;
      }
    this.tensionTarget = Math.min(1, (sum / pairs) * 1.6);
  }
}

export function pitchNorm(note: number) {
  return Math.min(1, Math.max(0, (note - 21) / 87));
}

export function durationNorm(seconds: number) {
  return Math.min(1, Math.log2(1 + seconds * 2) / 3);
}
