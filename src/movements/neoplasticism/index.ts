import type { MovementDefinition } from '../../core/types';
import { StijlWorld } from './StijlWorld';
import { CAMERA_MODES, STIJL_GROUPS, STIJL_PARAMS, STIJL_ROUTES, STIJL_TARGETS } from './params';
import { STIJL_PRESETS } from './presets';
import { DARK_BACKGROUNDS, STIJL_PALETTES, stijlPalette } from './palettes';
import { composeSonatina } from './sonatina';

export const neoplasticism: MovementDefinition = {
  id: 'neoplasticism',
  title: 'De Stijl',
  pairing: 'Mondrian × Mozart',
  musical: 'Classical clarity',
  description:
    'Mondrian’s balance of unequal parts meets Mozart’s poise of question and answer. The music builds an architecture in space — planes, blocks and lines — and the camera walks through it.',
  available: true,
  params: STIJL_PARAMS,
  groups: STIJL_GROUPS,
  presets: STIJL_PRESETS,
  modTargets: STIJL_TARGETS,
  defaultRoutes: STIJL_ROUTES,
  featured: ['ds.palette', 'ds.background', 'ds.finish'],
  engineDefaults: {
    'post.tonemap': 'neutral', 'post.bloom': 0.3, 'post.bloomThreshold': 1.05, 'post.drift': 0, 'post.vignette': 0.2, 'post.grain': 0.035,
  },
  demo: composeSonatina,
  demoDescription: 'Opens with the Sonata facile, K. 545, then continues in Mozart’s style: Alberti bass, scale runs, trills and cadences.',
  isDark: (v) => {
    let bg = v['ds.background'] as string;
    if (bg === 'auto') bg = stijlPalette(v['ds.palette'] as string).background;
    return DARK_BACKGROUNDS.has(bg);
  },
  randomise: () => {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    return {
      'ds.palette': pick(STIJL_PALETTES).id,
      'ds.background': 'auto',
      'ds.camera': pick(CAMERA_MODES).value,
      'ds.form': pick(['mixed', 'mixed', 'planes', 'blocks']),
      'ds.finish': pick(['gouache', 'gouache', 'enamel', 'ceramic', 'glass']),
      'ds.seed': Math.floor(r(1, 99)),
      'ds.irregular': r(0.4, 1),
      'ds.colorAmount': r(0.25, 0.65),
      'ds.lineReach': pick([0.2, 0.6, 0.85, 1]),
      'ds.span': r(1.4, 3),
      'ds.lightAz': r(150, 280),
      'ds.lightEl': r(30, 70),
      'ds.dof': r(0.2, 0.7),
    };
  },
  create: (ctx) => new StijlWorld(ctx),
};
