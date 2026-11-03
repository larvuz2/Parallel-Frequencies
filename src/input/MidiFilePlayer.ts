import { Midi } from '@tonejs/midi';
import type { NoteBus } from '../core/NoteBus';
import type { AudioEngine } from './AudioEngine';
import type { Transport } from './Transport';

export interface SeqEvent {
  t: number;
  /** 0 = note on, 1 = note off, 2 = control change */
  type: 0 | 1 | 2;
  note: number;
  vel: number;
  ch: number;
  dur: number;
  cc: number;
  val: number;
}

export interface Sequence {
  name: string;
  duration: number;
  events: SeqEvent[];
}

export function parseMidi(buf: ArrayBuffer, name: string): Sequence {
  const midi = new Midi(buf);
  const events: SeqEvent[] = [];
  midi.tracks.forEach((track, ti) => {
    const ch = track.channel === 9 ? -1 : ti; // skip GM drums visually
    if (ch < 0) return;
    for (const n of track.notes) {
      events.push({ t: n.time, type: 0, note: n.midi, vel: n.velocity, ch, dur: n.duration, cc: 0, val: 0 });
      events.push({ t: n.time + n.duration, type: 1, note: n.midi, vel: 0, ch, dur: 0, cc: 0, val: 0 });
    }
    for (const cc of [64, 67, 1]) {
      for (const c of track.controlChanges[cc] ?? []) {
        events.push({ t: c.time, type: 2, note: 0, vel: 0, ch, dur: 0, cc, val: c.value });
      }
    }
  });
  return { name: midi.name || name, duration: midi.duration, events: sortEvents(events) };
}

export function sortEvents(ev: SeqEvent[]) {
  // at equal times: offs before ons (so repeated notes retrigger cleanly), controls first
  const order = [2, 0, 1];
  const o = (e: SeqEvent) => (e.type === 1 ? -1 : order.indexOf(e.type));
  return ev.sort((a, b) => a.t - b.t || o(a) - o(b));
}

/**
 * Sample-accurate MIDI playback: audio is scheduled ahead on the AudioContext clock, and the
 * same events are released to the visuals when the audio clock reaches them, so sound and
 * brushstrokes stay locked together. Supports seeking, speed and looping.
 */
export class MidiFilePlayer implements Transport {
  readonly kind: 'midi' | 'demo';
  private _rate = 1;
  loop = false;
  onEnd?: () => void;
  private idx = 0;
  private _playing = false;
  private songStart = 0;
  private audioStart = 0;
  private pausedAt = 0;
  private queue: { at: number; e: SeqEvent }[] = [];
  private timer = 0;
  private readonly lookahead = 0.12;
  /** silent playback (visuals only) — used by the idle dream */
  muted = false;
  private useAudio = true;

  constructor(private seq: Sequence, private audio: AudioEngine, private bus: NoteBus, kind: 'midi' | 'demo' = 'midi') {
    this.kind = kind;
  }

  /** The audio clock when sound is running; otherwise the page clock (e.g. before any click). */
  private get now() {
    return this.useAudio ? this.audio.now : performance.now() / 1000;
  }

  get name() {
    return this.seq.name;
  }
  get duration() {
    return this.seq.duration;
  }
  get playing() {
    return this._playing;
  }
  get position() {
    if (!this._playing) return this.pausedAt;
    return Math.min(this.duration, this.songStart + (this.now - this.audioStart) * this._rate);
  }

  get rate() {
    return this._rate;
  }
  set rate(r: number) {
    const pos = this.position;
    this._rate = r;
    if (this._playing) {
      this.songStart = pos;
      this.audioStart = this.now;
    }
  }

  play() {
    if (this._playing) return;
    if (this.pausedAt >= this.duration - 0.01) this.pausedAt = 0;
    this._playing = true;
    this.anchor(this.pausedAt);
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  pause() {
    if (!this._playing) return;
    this.pausedAt = this.position;
    this._playing = false;
    clearInterval(this.timer);
    this.silence();
  }

  seek(t: number) {
    t = Math.max(0, Math.min(this.duration, t));
    this.silence();
    // restore controller state at the new position
    let pedal = 0;
    for (const e of this.seq.events) {
      if (e.t > t) break;
      if (e.type === 2 && e.cc === 64) pedal = e.val;
    }
    if (pedal >= 0.5) {
      this.bus.control({ controller: 64, value: pedal, channel: 0, source: this.src });
      this.audio.setPedal(true);
    }
    if (this._playing) this.anchor(t);
    else {
      this.pausedAt = t;
      this.idx = this.lowerBound(t);
    }
  }

  private get src() {
    return this.kind === 'demo' ? ('demo' as const) : ('file' as const);
  }

  private anchor(t: number) {
    this.useAudio = this.audio.isStarted && this.audio.context.state === 'running';
    this.songStart = t;
    this.audioStart = this.now + 0.06;
    this.idx = this.lowerBound(t);
    this.queue = [];
  }

  private silence() {
    this.queue = [];
    this.audio.releaseAll();
    this.bus.control({ controller: 64, value: 0, channel: 0, source: this.src });
    this.bus.allNotesOff();
  }

  private lowerBound(t: number) {
    let lo = 0, hi = this.seq.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.seq.events[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private schedule() {
    if (!this._playing) return;
    const ev = this.seq.events;
    const horizon = this.now + this.lookahead;
    while (this.idx < ev.length) {
      const e = ev[this.idx];
      const at = this.audioStart + (e.t - this.songStart) / this.rate;
      if (at > horizon) break;
      this.idx++;
      if (this.useAudio && !this.muted) {
        if (e.type === 0) this.audio.noteOn(e.note, e.vel, at);
        else if (e.type === 1) this.audio.noteOff(e.note, at);
        else if (e.cc === 64) this.audio.setPedal(e.val >= 0.5, at);
      }
      this.queue.push({ at, e });
    }
  }

  tick() {
    if (!this._playing) return;
    const now = this.now;
    while (this.queue.length && this.queue[0].at <= now) {
      const { e } = this.queue.shift()!;
      if (e.type === 0) this.bus.noteOn({ note: e.note, velocity: e.vel, channel: e.ch, source: this.src, duration: e.dur / this.rate });
      else if (e.type === 1) this.bus.noteOff({ note: e.note, channel: e.ch, source: this.src });
      else this.bus.control({ controller: e.cc, value: e.val, channel: e.ch, source: this.src });
    }
    if (this.position >= this.duration - 0.001 && this.idx >= this.seq.events.length && !this.queue.length) {
      if (this.loop) {
        this.silence();
        this.anchor(0);
      } else {
        this.pausedAt = this.duration;
        this._playing = false;
        clearInterval(this.timer);
        this.silence();
        this.onEnd?.();
      }
    }
  }

  profile(bins: number) {
    const out = new Array(bins).fill(0);
    for (const e of this.seq.events) {
      if (e.type !== 0) continue;
      const i = Math.min(bins - 1, Math.floor((e.t / Math.max(0.001, this.duration)) * bins));
      out[i] += 0.4 + e.vel;
    }
    const m = Math.max(1e-6, ...out);
    return out.map((v) => Math.sqrt(v / m));
  }

  dispose() {
    clearInterval(this.timer);
    if (this._playing) this.silence();
    this._playing = false;
  }
}
