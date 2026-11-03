import { rng } from '../core/noise';
import { sortEvents, type SeqEvent, type Sequence } from './MidiFilePlayer';

/**
 * "Rêverie" — an algorithmic study in Debussy's idiom, used as the demo and the idle dream.
 * Opens with the chromatic flute arabesque and the half-diminished chord of the Faune prelude
 * (public domain, 1894), then drifts through planed ninth chords, whole-tone mist, sunken-cathedral
 * bells and back to the arabesque, dissolving in E major.
 */
export function composeReverie(seed = 7): Sequence {
  const r = rng(seed);
  const ev: SeqEvent[] = [];
  const N = (t: number, note: number, vel: number, dur: number, ch = 0) => {
    vel = Math.max(0.08, Math.min(1, vel + (r() - 0.5) * 0.06));
    ev.push({ t, type: 0, note, vel, ch, dur, cc: 0, val: 0 });
    ev.push({ t: t + dur, type: 1, note, vel: 0, ch, dur: 0, cc: 0, val: 0 });
  };
  const pedal = (t: number) => {
    ev.push({ t: Math.max(0, t - 0.04), type: 2, note: 0, vel: 0, ch: 0, dur: 0, cc: 64, val: 0 });
    ev.push({ t: t + 0.05, type: 2, note: 0, vel: 0, ch: 0, dur: 0, cc: 64, val: 1 });
  };
  const roll = (t: number, notes: number[], vel: number, spread = 0.5, dur = 3) => {
    notes.forEach((n, i) => N(t + (i / Math.max(1, notes.length - 1)) * spread * (0.8 + r() * 0.4), n, vel * (0.85 + 0.3 * (i / notes.length)), dur - i * 0.05));
  };

  // ---- I. Arabesque (the faun's flute) -------------------------------------------------------
  const flute = (t0: number, vel: number) => {
    // C#5 held, chromatic descent to G4, and the turn back upward
    const line: [number, number][] = [
      [73, 1.3], [72, 0.22], [71, 0.22], [70, 0.5], [69, 0.32], [68, 0.32], [67, 1.1],
      [68, 0.25], [70, 0.25], [71, 0.4], [73, 1.2], [72, 0.2], [71, 0.2], [70, 0.4], [69, 0.3], [68, 0.3], [67, 1.4],
    ];
    let t = t0;
    for (const [n, d] of line) {
      N(t, n, vel * (0.85 + r() * 0.15), d * 1.05, 1);
      t += d;
    }
    return t;
  };
  let t = 0.6;
  pedal(0.2);
  t = flute(t, 0.5);
  // the half-diminished chord (A#–C#–E–G#) and its resolution to B7, with harp glissando
  pedal(t);
  roll(t, [46, 52, 56, 61, 64, 68], 0.42, 0.9, 3.6);
  for (let i = 0; i < 14; i++) N(t + 0.9 + i * 0.07, [58, 61, 64, 68, 70, 73, 76, 80, 82, 85, 88, 92, 94, 97][i], 0.32 + i * 0.02, 1.6, 2);
  t += 3.8;
  pedal(t);
  roll(t, [35, 47, 54, 57, 63, 66], 0.45, 0.7, 4);
  t += 4.2;

  // ---- II. Planed ninth chords, pentatonic melody, glitter -----------------------------------
  const chords: { bass: number; tones: number[]; pent: number[] }[] = [
    { bass: 40, tones: [52, 56, 59, 63, 66], pent: [64, 66, 68, 71, 73, 76] },         // E maj9
    { bass: 37, tones: [49, 52, 56, 59, 63], pent: [61, 63, 64, 68, 71, 73] },         // C# m9
    { bass: 33, tones: [45, 49, 52, 56, 59, 63], pent: [61, 64, 66, 68, 71, 73] },     // A maj9(#11)
    { bass: 42, tones: [54, 58, 61, 64, 68], pent: [66, 68, 70, 73, 75, 78] },         // F#9
    { bass: 38, tones: [50, 54, 57, 61, 64], pent: [62, 64, 66, 69, 71, 74] },         // D maj9
    { bass: 35, tones: [47, 51, 54, 58, 61], pent: [63, 66, 68, 70, 73, 75] },         // B maj9
    { bass: 44, tones: [56, 59, 63, 66, 70], pent: [63, 66, 68, 70, 73, 75] },         // G# m11
    { bass: 36, tones: [48, 52, 55, 59, 62, 66], pent: [64, 67, 69, 71, 74, 76] },     // C maj9(#11)
  ];
  const sectionA = (start: number, bars: number, baseVel: number, barLen: number) => {
    let tt = start;
    for (let b = 0; b < bars; b++) {
      const c = chords[b % chords.length];
      const arc = Math.sin((b / bars) * Math.PI);
      const v = baseVel + arc * 0.25;
      pedal(tt);
      N(tt, c.bass, v * 0.8, barLen + 0.5);
      N(tt + 0.02, c.bass + 12, v * 0.55, barLen);
      // rolled arpeggio rising and falling
      const arp = [...c.tones, ...c.tones.map((x) => x + 12)];
      const steps = 10 + Math.floor(r() * 4);
      for (let i = 0; i < steps; i++) {
        const k = i < steps / 2 ? i : steps - i;
        N(tt + 0.25 + i * (barLen / steps) * 0.9, arp[Math.min(arp.length - 1, k + 1)], v * (0.45 + 0.2 * r()), barLen * 0.4);
      }
      // melody fragment
      if (b % 2 === 0 || r() < 0.4) {
        let mt = tt + 0.6 + r() * 0.5;
        const len = 3 + Math.floor(r() * 3);
        let idx = Math.floor(r() * c.pent.length);
        for (let i = 0; i < len; i++) {
          const d = [0.5, 0.75, 0.25, 1][Math.floor(r() * 4)];
          N(mt, c.pent[idx] + 12, v * (0.7 + 0.2 * r()), d * 1.4, 1);
          mt += d;
          idx = Math.max(0, Math.min(c.pent.length - 1, idx + (r() < 0.5 ? -1 : 1)));
        }
      }
      // glitter — high pentatonic run like light on water
      if (b % 3 === 2) {
        const up = r() < 0.5;
        for (let i = 0; i < 9; i++) {
          const n = c.pent[(up ? i : 8 - i) % c.pent.length] + 24 + (i >= c.pent.length ? 12 : 0);
          N(tt + barLen * 0.55 + i * 0.07, Math.min(105, n), 0.35 + 0.25 * arc, 0.5, 2);
        }
      }
      tt += barLen * (0.95 + r() * 0.1);
    }
    return tt;
  };
  t = sectionA(t, 12, 0.38, 4.2);

  // ---- III. Whole-tone mist, swelling to a burst of light --------------------------------------
  const wt = [0, 2, 4, 6, 8, 10];
  for (let b = 0; b < 9; b++) {
    const root = 36 + (b % 2) * 2;
    const swell = b / 8;
    pedal(t);
    N(t, root, 0.4 + swell * 0.3, 4.2);
    for (let i = 0; i < 16; i++) {
      const n = 48 + wt[i % 6] + 12 * Math.floor(i / 6) + (b % 2) * 2;
      N(t + i * 0.18, n + (i % 2 ? 12 : 0), 0.3 + swell * 0.45 + r() * 0.1, 1.2);
    }
    if (b >= 5) {
      // parallel augmented triads descending in the treble
      for (let k = 0; k < 4; k++) {
        const top = 88 - k * 2 - (b - 5) * 2;
        [top, top - 4, top - 8].forEach((n) => N(t + 0.4 + k * 0.6, n, 0.55 + swell * 0.4, 0.8, 1));
      }
    }
    t += 3.4 - swell * 0.6;
  }
  // climax: a fortissimo chord — accents, glow and reflections
  pedal(t);
  roll(t, [28, 40, 52, 59, 64, 68, 71, 76, 80, 83, 88], 0.98, 0.35, 5);
  t += 5.5;

  // ---- IV. Sunken cathedral — parallel bell chords over a deep pedal ---------------------------
  const bells = [55, 57, 59, 62, 64, 62, 59, 57, 55, 52, 55, 59, 62, 64, 67, 64];
  pedal(t);
  N(t, 24, 0.7, 14);
  N(t, 36, 0.6, 14);
  for (let i = 0; i < bells.length; i++) {
    if (i === 8) {
      pedal(t);
      N(t, 26, 0.6, 12);
      N(t, 38, 0.5, 12);
    }
    const n = bells[i];
    const v = 0.55 + Math.sin((i / bells.length) * Math.PI) * 0.35;
    [n, n + 7, n + 12, n + 19].forEach((x, k) => N(t + k * 0.012, x, v * (1 - k * 0.08), 1.6));
    t += i % 4 === 3 ? 1.6 : 0.95;
  }
  t += 1.5;

  // ---- V. Return of the arabesque over shimmer, dissolving -------------------------------------
  pedal(t);
  N(t, 28, 0.35, 16);
  for (let i = 0; i < 40; i++) {
    const shimmer = [64, 68, 71, 75, 78, 80, 83, 87][i % 8];
    N(t + i * 0.22, shimmer + (i % 3 === 0 ? 12 : 0), 0.18 + 0.12 * Math.sin(i * 0.4), 0.6, 2);
  }
  const tEnd = flute(t + 0.8, 0.5);
  t = Math.max(t + 9, tEnd);
  pedal(t);
  roll(t, [28, 40, 47, 56, 61, 66, 68, 75, 80], 0.32, 1.4, 7);
  N(t + 2.2, 92, 0.3, 4, 2);
  t += 8;
  ev.push({ t, type: 2, note: 0, vel: 0, ch: 0, dur: 0, cc: 64, val: 0 });

  return { name: 'Rêverie — after Debussy (demo)', duration: t + 0.5, events: sortEvents(ev) };
}
