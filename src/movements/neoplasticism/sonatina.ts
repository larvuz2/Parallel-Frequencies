import { rng } from '../../core/noise';
import { sortEvents, type SeqEvent, type Sequence } from '../../input/MidiFilePlayer';

/**
 * "Sonatina — after Mozart". Opens with the first bars of the Sonata facile, K. 545 (1788,
 * public domain), then continues in the classical style: Alberti bass, balanced 4 + 4 bar phrases,
 * scale runs, a cadential trill, a brief excursion to the dominant and a return home.
 */
export function composeSonatina(seed = 3): Sequence {
  const r = rng(seed);
  const ev: SeqEvent[] = [];
  const Q = 0.48; // quarter note
  const N = (t: number, note: number, vel: number, dur: number, ch = 0) => {
    vel = Math.max(0.1, Math.min(1, vel + (r() - 0.5) * 0.05));
    ev.push({ t, type: 0, note, vel, ch, dur, cc: 0, val: 0 });
    ev.push({ t: t + dur * 0.92, type: 1, note, vel: 0, ch, dur: 0, cc: 0, val: 0 });
  };
  const line = (t: number, notes: [number, number][], vel: number, ch = 0) => {
    for (const [n, d] of notes) {
      if (n > 0) N(t, n, vel, d * Q, ch);
      t += d * Q;
    }
    return t;
  };
  /** Alberti bass: low – high – middle – high, in eighths */
  const alberti = (t: number, chord: [number, number, number], beats: number, vel: number) => {
    const pat = [chord[0], chord[2], chord[1], chord[2]];
    for (let i = 0; i < beats * 2; i++) N(t + i * Q * 0.5, pat[i % 4], vel * (i % 4 === 0 ? 1 : 0.8), Q * 0.45, 1);
  };

  // ---------------------------------------------------------------- K. 545, bars 1–8
  let t = 0.3;
  const C = 48, G = 43;
  const bars: { rh: [number, number][]; lh: [number, number, number][] }[] = [
    { rh: [[72, 2], [76, 1], [79, 1]], lh: [[C, C + 4, C + 7], [C, C + 4, C + 7]] },
    { rh: [[71, 1.5], [72, 0.25], [74, 0.25], [72, 2]], lh: [[G + 7, G + 10, G + 12 + 0], [C, C + 4, C + 7]] },
    { rh: [[81, 2], [79, 1], [84, 1]], lh: [[C, C + 5, C + 9], [C, C + 5, C + 9]] },
    { rh: [[79, 1], [77, 0.5], [76, 0.5], [77, 0.5], [76, 0.5], [76, 1]], lh: [[C, C + 4, C + 7], [G, G + 5, G + 9]] },
  ];
  for (const b of bars) {
    line(t, b.rh, 0.62);
    alberti(t, b.lh[0], 2, 0.42);
    alberti(t + 2 * Q, b.lh[1], 2, 0.42);
    t += 4 * Q;
  }
  // the scale passages (bars 5–8)
  const scales = [69, 67, 65, 64];
  const lhChords: [number, number, number][] = [[41, 45, 48], [40, 43, 48], [38, 41, 45], [36, 40, 43]];
  const major = [0, 2, 4, 5, 7, 9, 11];
  /** move k diatonic steps (k may be negative) in the major key of `tonic`; snaps chromatic notes into the key */
  const stepIn = (n: number, k: number, tonic = 60) => {
    let rel = n - tonic;
    let oct = Math.floor(rel / 12);
    let pc = ((rel % 12) + 12) % 12;
    let d = major.indexOf(pc);
    if (d < 0) d = major.findIndex((x) => x > pc);
    d += k;
    oct += Math.floor(d / 7);
    d = ((d % 7) + 7) % 7;
    return tonic + oct * 12 + major[d];
  };
  const stepUp = (n: number, k: number) => stepIn(n, k, 60);
  for (let i = 0; i < 4; i++) {
    const start = scales[i];
    for (let k = 0; k < 8; k++) N(t + k * Q * 0.25, stepUp(start, k), 0.5 + k * 0.03, Q * 0.24);
    for (let k = 0; k < 8; k++) N(t + 2 * Q + k * Q * 0.25, stepUp(start, 7 - k), 0.55 - k * 0.02, Q * 0.24);
    const ch = lhChords[i];
    ch.forEach((n) => N(t, n, 0.45, Q * 1.9, 1));
    ch.forEach((n) => N(t + 2 * Q, n, 0.4, Q * 1.9, 1));
    t += 4 * Q;
  }
  // cadential trill and half cadence on G
  for (let k = 0; k < 12; k++) N(t + k * Q * 0.125, k % 2 ? 76 : 74, 0.5, Q * 0.12);
  [43, 50, 55, 59].forEach((n) => N(t, n, 0.5, Q * 1.4, 1));
  t += 1.5 * Q;
  N(t, 79, 0.7, Q * 2);
  [43, 47, 50].forEach((n) => N(t, n, 0.55, Q * 2, 1));
  t += 3 * Q;

  // ---------------------------------------------------------------- continuation in G, then home
  const keyPhrase = (start: number, tonic: number, vel: number) => {
    // I I IV V | I vi ii V7–I   (scale degrees as triads in close position)
    const prog = [0, 0, 3, 4, 0, 5, 1, 4];
    const triad = (deg: number): [number, number, number] => {
      const root = tonic - 12 + major[deg];
      const third = tonic - 12 + major[(deg + 2) % 7] + (deg + 2 >= 7 ? 12 : 0);
      const fifth = tonic - 12 + major[(deg + 4) % 7] + (deg + 4 >= 7 ? 12 : 0);
      return [root, third, fifth];
    };
    let tt = start;
    let mel = tonic + 16;
    for (let b = 0; b < prog.length; b++) {
      const deg = prog[b];
      const tri = triad(deg);
      const arc = Math.sin(((b + 0.5) / prog.length) * Math.PI);
      alberti(tt, tri, 4, vel * 0.7);
      // melody: chord tones on strong beats, stepwise motion between, occasional run
      const rhythmic = [[1, 1, 1, 1], [2, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [1.5, 0.5, 2], [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 2]][Math.floor(r() * 5)];
      let mt = tt;
      for (let i = 0; i < rhythmic.length; i++) {
        const strong = i === 0;
        if (strong) {
          const targets = tri.map((x) => x + 24).flatMap((x) => [x, x + 12]);
          mel = targets.reduce((best, x) => (Math.abs(x - mel) < Math.abs(best - mel) ? x : best), targets[0]);
        } else {
          mel = stepIn(mel, r() < 0.55 ? 1 : -1, tonic);
        }
        N(mt, mel, vel * (0.85 + arc * 0.3) * (strong ? 1.05 : 0.9), rhythmic[i] * Q * 0.95);
        mt += rhythmic[i] * Q;
      }
      tt += 4 * Q;
    }
    // authentic cadence
    const I = triad(0);
    [I[0] - 12, I[0], I[1], I[2]].forEach((n) => N(tt, n, vel * 1.2, Q * 2, 1));
    N(tt, tonic + 24, vel * 1.25, Q * 2);
    return tt + 3 * Q;
  };
  t = keyPhrase(t, 55, 0.5); // G major
  t = keyPhrase(t, 55, 0.62);

  // retransition: rising sequence of scales over a dominant pedal
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 8; k++) N(t + k * Q * 0.25, stepUp(62 + i * 2, k), 0.45 + i * 0.1, Q * 0.24);
    [43, 50, 53].forEach((n) => N(t, n, 0.45 + i * 0.08, Q * 1.9, 1));
    t += 2 * Q;
  }
  t += Q;

  // recapitulation of the opening, louder
  for (const b of bars) {
    line(t, b.rh, 0.75);
    alberti(t, b.lh[0], 2, 0.5);
    alberti(t + 2 * Q, b.lh[1], 2, 0.5);
    t += 4 * Q;
  }
  t = keyPhrase(t, 60, 0.6); // C major

  // closing: I – IV – V7 – I and three fortissimo chords
  const close: number[][] = [[36, 48, 52, 55, 60, 64], [41, 53, 57, 60, 65, 69], [43, 55, 59, 62, 65, 71], [36, 48, 52, 55, 60, 72]];
  for (const c of close) {
    c.forEach((n) => N(t, n, 0.72, Q * 1.8, n < 50 ? 1 : 0));
    t += 2 * Q;
  }
  for (let k = 0; k < 3; k++) {
    [36, 48, 55, 60, 64, 67, 72, 76, 84].forEach((n) => N(t, n, 0.95, Q * (k === 2 ? 3 : 0.4), n < 50 ? 1 : 0));
    t += k === 2 ? 4 * Q : Q;
  }
  return { name: 'Sonatina — after Mozart (demo)', duration: t + 0.5, events: sortEvents(ev) };
}
