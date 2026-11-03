import { rng } from '../../core/noise';
import { sortEvents, type SeqEvent, type Sequence } from '../../input/MidiFilePlayer';

/**
 * "Prelude and Canon — after Bach". The Prelude in C major, BWV 846 (1722, public domain):
 * one broken chord per bar, the two lower notes held. Then a three-voice canon on the subject of
 * The Art of Fugue, BWV 1080, with a running countersubject — so the voices visibly weave.
 */
const n = (s: string) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s)!;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'];
  return (parseInt(m[3], 10) + 1) * 12 + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};

const PRELUDE: string[] = [
  'C4 E4 G4 C5 E5', 'C4 D4 A4 D5 F5', 'B3 D4 G4 D5 F5', 'C4 E4 G4 C5 E5', 'C4 E4 A4 E5 A5', 'C4 D4 F#4 A4 D5',
  'B3 D4 G4 D5 G5', 'B3 C4 E4 G4 C5', 'A3 C4 E4 G4 C5', 'D3 A3 D4 F#4 C5', 'G3 B3 D4 G4 B4', 'G3 Bb3 E4 G4 C#5',
  'F3 A3 D4 A4 D5', 'F3 Ab3 D4 F4 B4', 'E3 G3 C4 G4 C5', 'E3 F3 A3 C4 F4', 'D3 F3 A3 C4 F4', 'G2 D3 G3 B3 F4',
  'C3 E3 G3 C4 E4', 'C3 G3 Bb3 C4 E4', 'F2 F3 A3 C4 E4', 'F#2 C3 A3 C4 Eb4', 'Ab2 F3 B3 C4 D4', 'G2 F3 G3 B3 D4',
  'G2 E3 G3 C4 E4', 'G2 D3 G3 C4 F4', 'G2 D3 G3 B3 F4', 'G2 Eb3 A3 C4 F#4', 'G2 E3 G3 C4 G4', 'G2 D3 G3 C4 F4',
  'G2 D3 G3 B3 F4', 'C2 C3 G3 Bb3 E4',
];

export function composeBach(seed = 5): Sequence {
  const r = rng(seed);
  const ev: SeqEvent[] = [];
  const N = (t: number, note: number, vel: number, dur: number, ch: number) => {
    vel = Math.max(0.1, Math.min(1, vel + (r() - 0.5) * 0.05));
    ev.push({ t, type: 0, note, vel, ch, dur, cc: 0, val: 0 });
    ev.push({ t: t + dur * 0.96, type: 1, note, vel: 0, ch, dur: 0, cc: 0, val: 0 });
  };
  const S = 0.14; // sixteenth
  let t = 0.3;

  // ---------------------------------------------------------------- Prelude in C
  PRELUDE.forEach((bar, b) => {
    const c = bar.split(' ').map(n);
    const arc = 0.42 + 0.25 * Math.sin((b / PRELUDE.length) * Math.PI) + (b > 22 && b < 31 ? 0.12 : 0);
    for (let half = 0; half < 2; half++) {
      const t0 = t + half * 8 * S;
      N(t0, c[0], arc * 0.95, 8 * S, 3);
      N(t0 + S, c[1], arc * 0.85, 7 * S, 2);
      const fig = [c[2], c[3], c[4], c[2], c[3], c[4]];
      fig.forEach((x, i) => N(t0 + (2 + i) * S, x, arc * (i % 3 === 2 ? 1 : 0.88), S * 1.1, i % 3 === 0 ? 1 : 0));
    }
    t += 16 * S * (b === PRELUDE.length - 1 ? 1.15 : 1);
  });
  // the closing bars over the tonic pedal, and the final chord
  const closing = ['C2 C3 F3 A3 E4', 'C2 B2 F3 G3 D4'];
  for (const bar of closing) {
    const c = bar.split(' ').map(n);
    N(t, c[0], 0.5, 16 * S, 3);
    N(t + S, c[1], 0.45, 15 * S, 2);
    const fig = [c[2], c[3], c[4], c[3], c[2], c[3], c[2], c[1]];
    fig.forEach((x, i) => N(t + (2 + i) * S, x, 0.5, S * 1.1, i % 2 ? 0 : 1));
    t += 16 * S;
  }
  ['C2', 'C3', 'E3', 'G3', 'C4', 'E4'].forEach((x, i) => N(t + i * 0.05, n(x), 0.62, 3.2, i < 2 ? 3 : i < 4 ? 2 : 0));
  t += 4.2;

  // ---------------------------------------------------------------- Canon on the Art of Fugue subject
  const Q = 0.42;
  // D A F D C# D E F G F E D (half, half, half, half, quarter…)
  const subject: [number, number][] = [
    [0, 2], [7, 2], [3, 2], [0, 2], [-1, 1], [0, 0.5], [2, 0.5], [3, 1], [5, 0.5], [3, 0.5], [2, 0.5], [0, 0.5], [2, 1], [0, 2],
  ];
  const len = subject.reduce((s, x) => s + x[1], 0);
  const play = (start: number, base: number, ch: number, vel: number) => {
    let tt = start;
    for (const [iv, d] of subject) {
      N(tt, base + iv, vel, d * Q * 0.97, ch);
      tt += d * Q;
    }
    return tt;
  };
  // running countersubject (eighths in D minor)
  const dm = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];
  const counter = (start: number, base: number, beats: number, ch: number, vel: number) => {
    let idx = 4;
    for (let i = 0; i < beats * 2; i++) {
      idx = Math.max(0, Math.min(dm.length - 1, idx + (r() < 0.5 ? 1 : -1) * (r() < 0.2 ? 2 : 1)));
      N(start + i * Q * 0.5, base + dm[idx], vel * (i % 2 ? 0.85 : 1), Q * 0.48, ch);
    }
  };
  const D4 = n('D4');
  const e1 = t;
  play(e1, D4, 0, 0.62);                         // soprano (dux)
  const e2 = e1 + len * Q * 0.5;
  play(e2, D4 - 5 - 12 + 12, 1, 0.58);           // alto, a fourth below (comes)
  counter(e2, D4 + 7, len * 0.5, 0, 0.5);
  const e3 = e1 + len * Q;
  play(e3, D4 - 12, 2, 0.6);                      // tenor, an octave below
  counter(e3, D4 - 5, len * 0.5, 1, 0.48);
  const e4 = e1 + len * Q * 1.5;
  play(e4, D4 - 24, 3, 0.66);                     // bass, two octaves below
  counter(e4, D4 - 12, len * 0.5, 2, 0.5);
  counter(e4, D4 + 3, len * 0.5, 0, 0.52);
  t = e4 + len * Q + 0.2;
  // stretto and the final Picardy cadence
  play(t, D4 + 12, 0, 0.75);
  play(t + 2 * Q, D4, 1, 0.7);
  play(t + 4 * Q, D4 - 12, 2, 0.72);
  t += (len + 4) * Q;
  const fin = ['D2', 'D3', 'A3', 'D4', 'F#4', 'A4', 'D5'].map(n);
  fin.forEach((x, i) => N(t + i * 0.04, x, 0.95, 4.5, Math.min(3, Math.floor((6 - i) / 2))));
  t += 5.5;

  return { name: 'Prelude and Canon — after Bach (demo)', duration: t + 0.5, events: sortEvents(ev) };
}
