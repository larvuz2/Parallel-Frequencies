import type { ModRoute } from './types';
import { MOD_SOURCES } from './Signals';

const scopeOf = new Map(MOD_SOURCES.map((s) => [s.id, s.scope]));

/**
 * Sum every route into its target.
 *  - Per-note sources (velocity, pitch, duration, interval) are bipolar: they swing around their
 *    midpoint, so a medium-velocity note leaves the target unchanged.
 *  - Global sources (pedal, density, tension…) are unipolar: at rest they do nothing and add on top.
 */
export function modSums(routes: ModRoute[], values: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of routes) {
    const v = values[r.source];
    if (v === undefined) continue;
    const s = scopeOf.get(r.source) === 'note' ? v * 2 - 1 : v;
    out[r.target] = (out[r.target] ?? 0) + r.amount * s;
  }
  return out;
}

/** Multiplicative view of a modulation sum (never reaches zero). */
export const modScale = (sums: Record<string, number>, target: string, floor = 0.05) =>
  Math.max(floor, 1 + (sums[target] ?? 0));

/** Additive view of a modulation sum. */
export const modOffset = (sums: Record<string, number>, target: string) => sums[target] ?? 0;
