import { rng } from '../../core/noise';
import { sortEvents, type SeqEvent, type Sequence } from '../../input/MidiFilePlayer';

/**
 * "Vers la flamme — after Scriabin". An algorithmic study on the mystic chord (C F♯ B♭ E A D),
 * transposed by minor thirds and tritones as Scriabin did: a trembling low pedal, rising quartal
 * arpeggios, shimmering trills, an ecstatic accelerating climax of repeated chords, and dissolution.
 */
export function composeScriabin(seed = 9): Sequence {
  const r = rng(seed);
  const ev: SeqEvent[] = [];
  const N = (t: number, note: number, vel: number, dur: number, ch = 0) => {
    if (note < 21 || note > 108) return;
    vel = Math.max(0.08, Math.min(1, vel + (r() - 0.5) * 0.06));
    ev.push({ t, type: 0, note, vel, ch, dur, cc: 0, val: 0 });
    ev.push({ t: t + dur, type: 1, note, vel: 0, ch, dur: 0, cc: 0, val: 0 });
  };
  const pedal = (t: number) => {
    ev.push({ t: Math.max(0, t - 0.03), type: 2, note: 0, vel: 0, ch: 0, dur: 0, cc: 64, val: 0 });
    ev.push({ t: t + 0.04, type: 2, note: 0, vel: 0, ch: 0, dur: 0, cc: 64, val: 1 });
  };
  const mystic = (root: number) => [0, 6, 10, 16, 21, 26].map((x) => root + x);
  const roots = [36, 39, 42, 45, 36, 42, 39, 45];

  let t = 0.4;
  // I. Shimmer from the depths
  for (let b = 0; b < 6; b++) {
    const ch = mystic(roots[b % 4]);
    pedal(t);
    for (let k = 0; k < 10; k++) N(t + k * 0.11, ch[0] - 12 + (k % 2) * 12, 0.25 + b * 0.03, 0.12, 3); // tremolo
    ch.forEach((n, i) => N(t + 0.4 + i * 0.32, n + 12, 0.28 + i * 0.04 + b * 0.03, 2.4, 1));
    for (let k = 0; k < 14; k++) N(t + 2.2 + k * 0.07, (k % 2 ? ch[5] : ch[4]) + 24, 0.22 + b * 0.02, 0.08, 2); // trill
    t += 3.6;
  }
  // II. Rising flights — quartal arpeggios sweeping up, transposed by minor thirds
  for (let b = 0; b < 10; b++) {
    const root = roots[b % roots.length] + (b > 5 ? 12 : 0);
    const ch = mystic(root);
    const swell = b / 9;
    pedal(t);
    N(t, ch[0] - 12, 0.5 + swell * 0.3, 3, 3);
    N(t, ch[1] - 12, 0.4 + swell * 0.3, 3, 3);
    for (let k = 0; k < 18; k++) {
      const n = ch[k % 6] + 12 * Math.floor(k / 6);
      N(t + 0.15 + k * (0.09 - swell * 0.03), n, 0.35 + swell * 0.45 + (k / 18) * 0.15, 0.6, 1);
    }
    // a melodic call of rising fourths
    const m = ch[3] + 12;
    [m, m + 5, m + 11, m + 16].forEach((x, i) => N(t + 1.6 + i * 0.28, x, 0.5 + swell * 0.4, 0.5, 0));
    t += 2.9 - swell * 0.8;
  }
  // III. Vers la flamme — repeated chords, accelerating, fortissimo
  let step = 0.32;
  for (let k = 0; k < 40; k++) {
    const root = roots[Math.floor(k / 8) % roots.length] + 12;
    if (k % 8 === 0) pedal(t);
    const ch = mystic(root);
    const v = Math.min(1, 0.55 + k / 40 * 0.5);
    [ch[0] - 12, ...ch].forEach((x, i) => N(t + i * 0.006, x, v, step * 0.8, i < 2 ? 3 : 1));
    if (k % 4 === 3) for (let j = 0; j < 6; j++) N(t + j * 0.04, ch[5] + 12 + j * 2, v, 0.15, 2);
    t += step;
    step = Math.max(0.12, step * 0.96);
  }
  // blaze
  pedal(t);
  [24, 36, 42, 46, 52, 57, 62, 66, 70, 76, 81, 86, 90, 96].forEach((x, i) => N(t + i * 0.015, x, 1, 5, i < 3 ? 3 : 1));
  for (let k = 0; k < 40; k++) N(t + 0.3 + k * 0.06, k % 2 ? 98 : 96, 0.7 - k * 0.012, 0.07, 2);
  t += 5.5;
  // IV. Dissolution — bell tones fading into the light
  for (let b = 0; b < 8; b++) {
    const ch = mystic(roots[(b * 3) % roots.length] + 24);
    pedal(t);
    N(t, ch[Math.floor(r() * 6)], 0.35 - b * 0.03, 3.5, 0);
    N(t + 0.8, ch[Math.floor(r() * 6)] + 12, 0.25 - b * 0.02, 3, 2);
    t += 2.1;
  }
  ev.push({ t: t + 2, type: 2, note: 0, vel: 0, ch: 0, dur: 0, cc: 64, val: 0 });
  return { name: 'Vers la flamme — after Scriabin (demo)', duration: t + 2.5, events: sortEvents(ev) };
}
