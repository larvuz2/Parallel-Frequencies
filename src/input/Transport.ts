/** Anything that can be played, paused and scrubbed — MIDI files, the demo, audio files. */
export interface Transport {
  readonly kind: 'midi' | 'audio' | 'demo';
  readonly name: string;
  readonly duration: number;
  readonly position: number;
  readonly playing: boolean;
  rate: number;
  loop: boolean;
  play(): void;
  pause(): void;
  seek(t: number): void;
  /** Called every animation frame: dispatch due events / analyse audio. */
  tick(): void;
  /** Note density over time, for the scrubber background. */
  profile(bins: number): number[];
  dispose(): void;
  onEnd?: () => void;
}
