import * as Tone from 'tone';

// Bundled with the app (public/audio/salamander) so the installation works offline.
const SALAMANDER = `${import.meta.env.BASE_URL}audio/salamander/`;
const SAMPLE_NOTES = ['A0', 'C1', 'D#1', 'F#1', 'A1', 'C2', 'D#2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4', 'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5', 'C6', 'D#6', 'F#6', 'A6', 'C7', 'D#7', 'F#7', 'A7', 'C8'];

/**
 * Sound. A sampled concert grand (Salamander) through a soft hall reverb, with a synth fallback
 * if samples cannot load. Handles the sustain pedal like a real piano: released keys keep
 * ringing until the pedal lifts.
 */
export class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private synth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb;
  private out: Tone.Volume;
  private started = false;
  private pedal = false;
  private sustained = new Set<number>();
  private held = new Set<number>();
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  instrument: 'piano' | 'soft' = 'piano';
  pianoReady = false;
  onStatus?: (s: string) => void;

  constructor() {
    this.out = new Tone.Volume(-4).toDestination();
    this.reverb = new Tone.Reverb({ decay: 3.8, preDelay: 0.02, wet: 0.24 }).connect(this.out);
  }

  get context(): AudioContext {
    return Tone.getContext().rawContext as AudioContext;
  }

  get now() {
    return Tone.now();
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  async start() {
    if (this.started) return;
    await Tone.start();
    this.started = true;
    this.load();
  }

  get isStarted() {
    return this.started;
  }

  private load() {
    if (this.sampler || this.synth) return;
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 1.2,
      envelope: { attack: 0.01, decay: 1.2, sustain: 0.15, release: 1.6 },
      modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.8 },
      volume: -14,
    }).connect(this.reverb);
    this.synth.maxPolyphony = 48;
    this.onStatus?.('Loading piano…');
    const urls: Record<string, string> = {};
    for (const n of SAMPLE_NOTES) urls[n] = `${n.replace('#', 's')}.mp3`;
    this.sampler = new Tone.Sampler({
      urls,
      baseUrl: SALAMANDER,
      release: 1.4,
      attack: 0,
      curve: 'exponential',
      onload: () => {
        this.pianoReady = true;
        this.onStatus?.('Piano ready');
      },
      onerror: () => this.onStatus?.('Piano samples unavailable — using synth'),
    }).connect(this.reverb);
  }

  setVolume(v: number) {
    this.out.volume.rampTo(v <= 0.001 ? -Infinity : Tone.gainToDb(v) - 2, 0.05);
  }

  private voice() {
    if (this.instrument === 'piano' && this.pianoReady && this.sampler) return this.sampler;
    return this.synth;
  }

  noteOn(note: number, velocity: number, time?: number) {
    if (!this.started) return;
    const v = this.voice();
    if (!v) return;
    const f = Tone.Frequency(note, 'midi').toNote();
    this.sustained.delete(note);
    this.held.add(note);
    try {
      v.triggerAttack(f, time ?? Tone.now(), Math.max(0.05, velocity) * 0.95);
    } catch {
      /* voice stealing edge cases */
    }
  }

  noteOff(note: number, time?: number) {
    if (!this.started) return;
    this.held.delete(note);
    if (this.pedal) {
      this.sustained.add(note);
      return;
    }
    this.release(note, time);
  }

  private release(note: number, time?: number) {
    const f = Tone.Frequency(note, 'midi').toNote();
    try {
      this.sampler?.triggerRelease(f, time ?? Tone.now());
      this.synth?.triggerRelease(f, time ?? Tone.now());
    } catch {
      /* ignore */
    }
  }

  setPedal(down: boolean, time?: number) {
    this.pedal = down;
    if (!down) {
      for (const n of this.sustained) if (!this.held.has(n)) this.release(n, time);
      this.sustained.clear();
    }
  }

  releaseAll() {
    this.pedal = false;
    this.sustained.clear();
    this.held.clear();
    try {
      this.sampler?.releaseAll();
      this.synth?.releaseAll();
    } catch {
      /* ignore */
    }
  }

  /** Connect an external native node (e.g. an <audio> element source) into the output. */
  connectExternal(node: AudioNode) {
    Tone.connect(node, this.out);
  }

  /** A MediaStream of everything audible, for recording video with sound. */
  recordStream(): MediaStream | null {
    if (!this.started) return null;
    if (!this.recordDest) {
      this.recordDest = this.context.createMediaStreamDestination();
      this.out.connect(this.recordDest);
    }
    return this.recordDest.stream;
  }
}
