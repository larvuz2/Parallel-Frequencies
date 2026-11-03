import type { NoteBus } from '../core/NoteBus';
import type { Signals } from '../core/Signals';
import type { AudioEngine } from './AudioEngine';
import type { Transport } from './Transport';

const FFT = 8192;
const MAX_VOICES = 6;

/**
 * Plays an audio recording (mp3 / wav / ogg / m4a) and listens to it: spectral-flux onset
 * detection plus spectral-peak pitch estimation turn the recording into approximate note
 * events, so a recorded performance paints the canvas just like MIDI does.
 * Loudness and spectral brightness are streamed continuously as global signals.
 */
export class AudioFilePlayer implements Transport {
  readonly kind = 'audio' as const;
  loop = false;
  onEnd?: () => void;
  private el: HTMLAudioElement;
  private analyser: AnalyserNode;
  private spec: Float32Array;
  private prevMag: Float32Array;
  private time: Float32Array;
  private fluxHist: number[] = [];
  private active = new Map<number, { level: number; born: number }>();
  private lastOnset = 0;
  private url: string;
  private _profile: number[] | null = null;
  private source: MediaElementAudioSourceNode;

  constructor(file: File, private audio: AudioEngine, private bus: NoteBus, private signals: Signals) {
    this.url = URL.createObjectURL(file);
    this.el = new Audio();
    this.el.src = this.url;
    this.el.preload = 'auto';
    this.el.crossOrigin = 'anonymous';
    this.name = file.name.replace(/\.[^.]+$/, '');
    const ctx = audio.context;
    this.source = ctx.createMediaElementSource(this.el);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = FFT;
    this.analyser.smoothingTimeConstant = 0.2;
    this.source.connect(this.analyser);
    audio.connectExternal(this.source);
    this.spec = new Float32Array(this.analyser.frequencyBinCount);
    this.prevMag = new Float32Array(this.analyser.frequencyBinCount);
    this.time = new Float32Array(FFT);
    this.el.addEventListener('ended', () => {
      if (this.loop) {
        this.el.currentTime = 0;
        this.el.play();
      } else {
        this.release();
        this.onEnd?.();
      }
    });
    this.computeProfile(file);
  }

  readonly name: string;

  get duration() {
    return isFinite(this.el.duration) ? this.el.duration : 0;
  }
  get position() {
    return this.el.currentTime;
  }
  get playing() {
    return !this.el.paused;
  }
  get rate() {
    return this.el.playbackRate;
  }
  set rate(r: number) {
    this.el.playbackRate = r;
  }

  play() {
    this.el.play().catch(() => {});
  }
  pause() {
    this.el.pause();
    this.release();
  }
  seek(t: number) {
    this.el.currentTime = Math.max(0, Math.min(this.duration, t));
    this.release();
  }

  private release() {
    for (const n of this.active.keys()) this.bus.noteOff({ note: n, channel: 0, source: 'audio' });
    this.active.clear();
  }

  tick() {
    if (this.el.paused) return;
    const a = this.analyser;
    a.getFloatFrequencyData(this.spec);
    a.getFloatTimeDomainData(this.time);
    const sr = this.audio.context.sampleRate;
    const binHz = sr / FFT;

    // loudness (RMS) and brightness (spectral centroid)
    let rms = 0;
    for (let i = 0; i < this.time.length; i++) rms += this.time[i] * this.time[i];
    rms = Math.sqrt(rms / this.time.length);
    const loud = Math.min(1, rms * 5);
    let num = 0, den = 0, flux = 0;
    const lo = Math.floor(40 / binHz), hi = Math.min(this.spec.length - 1, Math.floor(5000 / binHz));
    for (let i = lo; i < hi; i++) {
      const m = Math.pow(10, this.spec[i] / 20);
      num += m * i * binHz;
      den += m;
      const d = m - this.prevMag[i];
      if (d > 0) flux += d;
      this.prevMag[i] = m;
    }
    const centroid = den > 0 ? num / den : 0;
    this.signals.setAudioFeatures(loud, Math.min(1, Math.log2(1 + centroid / 200) / 4.5));

    // adaptive onset threshold
    this.fluxHist.push(flux);
    if (this.fluxHist.length > 43) this.fluxHist.shift();
    const mean = this.fluxHist.reduce((s, v) => s + v, 0) / this.fluxHist.length;
    const sd = Math.sqrt(this.fluxHist.reduce((s, v) => s + (v - mean) * (v - mean), 0) / this.fluxHist.length);
    const now = performance.now() / 1000;
    const onset = flux > mean + sd * 1.4 && flux > 0.002 && now - this.lastOnset > 0.06 && loud > 0.01;

    // decay / release active notes whose partial has faded
    for (const [n, v] of this.active) {
      const bin = Math.round(midiToHz(n) / binHz);
      const level = this.spec[bin] ?? -120;
      if (level < v.level - 18 || now - v.born > 6) {
        this.bus.noteOff({ note: n, channel: 0, source: 'audio' });
        this.active.delete(n);
      }
    }

    if (!onset) return;
    this.lastOnset = now;
    const peaks = this.findPeaks(binHz);
    const strength = Math.min(1, 0.25 + loud * 1.4 + (flux - mean) / (sd * 8 + 1e-6) * 0.1);
    for (const pk of peaks) {
      if (this.active.has(pk.note)) {
        this.bus.noteOff({ note: pk.note, channel: 0, source: 'audio' });
      }
      this.active.set(pk.note, { level: pk.db, born: now });
      this.bus.noteOn({ note: pk.note, velocity: Math.max(0.15, Math.min(1, strength * pk.rel)), channel: 0, source: 'audio' });
    }
  }

  private findPeaks(binHz: number) {
    const s = this.spec;
    const lo = Math.floor(55 / binHz), hi = Math.min(s.length - 2, Math.floor(4200 / binHz));
    let max = -Infinity;
    for (let i = lo; i < hi; i++) max = Math.max(max, s[i]);
    const cands: { note: number; db: number; rel: number }[] = [];
    for (let i = lo + 1; i < hi; i++) {
      const v = s[i];
      if (v < max - 26 || v <= s[i - 1] || v < s[i + 1]) continue;
      // parabolic interpolation for sub-bin accuracy
      const a = s[i - 1], b = v, c = s[i + 1];
      const p = (0.5 * (a - c)) / (a - 2 * b + c || 1e-9);
      const hz = (i + p) * binHz;
      const note = Math.round(69 + 12 * Math.log2(hz / 440));
      if (note < 21 || note > 108) continue;
      cands.push({ note, db: v, rel: 0.55 + 0.45 * Math.pow(10, (v - max) / 30) });
    }
    cands.sort((x, y) => y.db - x.db);
    const out: typeof cands = [];
    for (const c of cands) {
      // suppress harmonics of already chosen fundamentals and duplicates
      if (out.some((o) => o.note === c.note || isHarmonic(o.note, c.note))) continue;
      out.push(c);
      if (out.length >= MAX_VOICES) break;
    }
    return out;
  }

  private async computeProfile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const data = await this.audio.context.decodeAudioData(buf.slice(0));
      const ch = data.getChannelData(0);
      const bins = 400;
      const per = Math.floor(ch.length / bins);
      const out: number[] = [];
      for (let b = 0; b < bins; b++) {
        let s = 0;
        for (let i = b * per; i < (b + 1) * per; i += 32) s += ch[i] * ch[i];
        out.push(Math.sqrt(s / (per / 32)));
      }
      const m = Math.max(1e-6, ...out);
      this._profile = out.map((v) => Math.sqrt(v / m));
    } catch {
      this._profile = null;
    }
  }

  profile(bins: number) {
    if (!this._profile) return new Array(bins).fill(0.2);
    const src = this._profile;
    return Array.from({ length: bins }, (_, i) => src[Math.floor((i / bins) * src.length)]);
  }

  dispose() {
    this.pause();
    this.source.disconnect();
    this.analyser.disconnect();
    this.el.src = '';
    URL.revokeObjectURL(this.url);
  }
}

const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
function isHarmonic(f: number, h: number) {
  const d = h - f;
  return d === 12 || d === 19 || d === 24 || d === 28 || d === 31;
}
