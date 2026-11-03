import type { MovementDefinition } from '../../core/types';
import { SymbolismWorld } from './SymbolismWorld';
import { SYMBOLISM_GROUPS, SYMBOLISM_PARAMS, SYMBOLISM_ROUTES, SYMBOLISM_TARGETS, VISION_CAMERA, VISION_SHAPES } from './params';
import { SYMBOLISM_PRESETS } from './presets';
import { VISION_PALETTES, visionPalette } from './palettes';
import { composeScriabin } from './scriabin';

export const symbolism: MovementDefinition = {
  id: 'symbolism',
  title: 'Symbolism',
  pairing: 'Redon × Scriabin',
  musical: 'Synaesthesia',
  description:
    'Redon painted dreams — floating eyes, impossible flowers; Scriabin heard colours. A cloud of light dreams into visions; every note bursts through it in its own colour, tension dissolves it into smoke.',
  available: true,
  params: SYMBOLISM_PARAMS,
  groups: SYMBOLISM_GROUPS,
  presets: SYMBOLISM_PRESETS,
  modTargets: SYMBOLISM_TARGETS,
  defaultRoutes: SYMBOLISM_ROUTES,
  featured: ['sy.shape', 'sy.palette', 'sy.background', 'sy.colorFrom'],
  keepOnPreset: ['sy.count'],
  engineDefaults: {
    'post.tonemap': 'aces', 'post.bloom': 0.8, 'post.bloomThreshold': 0.6, 'post.bloomRadius': 0.85, 'post.drift': 0, 'post.vignette': 0.35, 'post.grain': 0.04,
  },
  demo: composeScriabin,
  demoDescription: 'A study on Scriabin’s mystic chord: shimmering depths, rising flights, an accelerating blaze, dissolution.',
  isDark: (v) => {
    let bg = v['sy.background'] as string;
    if (bg === 'auto') bg = visionPalette(v['sy.palette'] as string).background;
    return bg === 'nebula' || bg === 'void';
  },
  randomise: () => {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    return {
      'sy.shape': pick(VISION_SHAPES).value,
      'sy.palette': pick(VISION_PALETTES).id,
      'sy.background': 'auto',
      'sy.camera': pick(VISION_CAMERA).value,
      'sy.flow': r(0.3, 1.4),
      'sy.coherence': r(0.8, 2.4),
      'sy.trails': r(0.5, 0.9),
      'sy.burst': r(0.8, 2.2),
      'sy.spin': r(-0.3, 0.3),
    };
  },
  create: (ctx) => new SymbolismWorld(ctx),
};
