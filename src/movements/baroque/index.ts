import type { MovementDefinition } from '../../core/types';
import { BaroqueWorld } from './BaroqueWorld';
import { BAROQUE_CAMERA, BAROQUE_GROUPS, BAROQUE_PARAMS, BAROQUE_ROUTES, BAROQUE_TARGETS } from './params';
import { BAROQUE_PRESETS } from './presets';
import { BAROQUE_PALETTES, baroquePalette } from './palettes';
import { composeBach } from './bach';

export const baroque: MovementDefinition = {
  id: 'baroque',
  title: 'Baroque',
  pairing: 'Caravaggio × Bach',
  musical: 'Counterpoint',
  description:
    'Caravaggio carves figures out of darkness with a single light; Bach weaves independent voices into one architecture. Here each voice is a light travelling its own spiral through a fractal chapel.',
  available: true,
  params: BAROQUE_PARAMS,
  groups: BAROQUE_GROUPS,
  presets: BAROQUE_PRESETS,
  modTargets: BAROQUE_TARGETS,
  defaultRoutes: BAROQUE_ROUTES,
  featured: ['bq.form', 'bq.palette', 'bq.background', 'bq.material'],
  engineDefaults: {
    'post.tonemap': 'aces', 'post.bloom': 0.9, 'post.bloomThreshold': 0.55, 'post.bloomRadius': 0.8, 'post.drift': 0,
    'post.vignette': 0.5, 'post.grain': 0.06, 'post.exposure': 1.1,
  },
  demo: composeBach,
  demoDescription: 'The Prelude in C, BWV 846, then a four-voice canon on the subject of The Art of Fugue.',
  isDark: (v) => {
    let bg = v['bq.background'] as string;
    if (bg === 'auto') bg = baroquePalette(v['bq.palette'] as string).background;
    return bg !== 'dawn';
  },
  randomise: () => {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    return {
      'bq.form': pick(['monstrance', 'monstrance', 'baldacchino', 'baldacchino', 'ornament', 'organ', 'vault']),
      'bq.palette': pick(BAROQUE_PALETTES).id,
      'bq.background': 'auto',
      'bq.material': pick(['gilded', 'gilded', 'bronze', 'marble', 'obsidian']),
      'bq.camera': pick(BAROQUE_CAMERA).value,
      'bq.keyAz': r(80, 200),
      'bq.keyEl': r(25, 65),
      'bq.godRays': r(0.2, 1.2),
      'bq.weave': r(0.2, 0.9),
      'bq.morph': r(0.3, 0.9),
    };
  },
  create: (ctx) => new BaroqueWorld(ctx),
};
