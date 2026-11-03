import type { MovementDefinition } from '../../core/types';
import { composeReverie } from '../../input/DemoComposer';
import { VitrineWorld } from './VitrineWorld';
import { VITRINE_CAMERA, VITRINE_GROUPS, VITRINE_PARAMS, VITRINE_ROUTES, VITRINE_TARGETS } from './params';
import { VITRINE_PRESETS } from './presets';
import { VEIN_PALETTES, WOODS } from './palettes';

export const vitrine: MovementDefinition = {
  id: 'vitrine',
  title: 'Vitrine',
  pairing: 'Custom · living matter',
  musical: 'Any music',
  description:
    'A mass of combed, living matter grows inside a walnut vitrine as the music plays — folding slowly, breathing out smoke, its folds lit by veins of coral, lavender and cyan.',
  available: true,
  params: VITRINE_PARAMS,
  groups: VITRINE_GROUPS,
  presets: VITRINE_PRESETS,
  modTargets: VITRINE_TARGETS,
  defaultRoutes: VITRINE_ROUTES,
  featured: ['vt.palette', 'vt.wood', 'vt.camera'],
  keepOnPreset: ['vt.count', 'vt.strands'],
  engineDefaults: {
    'post.tonemap': 'aces', 'post.bloom': 0.55, 'post.bloomThreshold': 0.7, 'post.bloomRadius': 0.75, 'post.drift': 0,
    'post.vignette': 0.45, 'post.grain': 0.04, 'post.exposure': 1.15,
  },
  demo: composeReverie,
  demoDescription: 'Rêverie — slow Debussy-like harmony; watch the matter accumulate.',
  isDark: () => true,
  randomise: () => {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    return {
      'vt.palette': pick(VEIN_PALETTES).id,
      'vt.wood': pick(WOODS).id,
      'vt.camera': pick(VITRINE_CAMERA).value,
      'vt.folds': r(0.35, 0.85),
      'vt.foldScale': r(0.6, 1.4),
      'vt.warp': r(0.4, 1.4),
      'vt.wisps': r(0.05, 0.25),
      'vt.flow': r(0.2, 0.6),
    };
  },
  create: (ctx) => new VitrineWorld(ctx),
};
