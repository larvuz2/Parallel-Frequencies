import type { MovementDefinition } from '../../core/types';
import { ImpressionismWorld } from './ImpressionismWorld';
import { IMPRESSIONISM_GROUPS, IMPRESSIONISM_PARAMS, IMPRESSIONISM_ROUTES, IMPRESSIONISM_TARGETS } from './params';
import { IMPRESSIONISM_PRESETS } from './presets';

export const impressionism: MovementDefinition = {
  id: 'impressionism',
  title: 'Impressionism',
  pairing: 'Monet × Debussy',
  musical: 'Musical Impressionism',
  description:
    'Monet dissolves solid forms into light and colour; Debussy softens harmonic direction into timbre and atmosphere. Every note becomes a brushstroke — pressed, dragged and lifted by the music.',
  available: true,
  params: IMPRESSIONISM_PARAMS,
  groups: IMPRESSIONISM_GROUPS,
  presets: IMPRESSIONISM_PRESETS,
  modTargets: IMPRESSIONISM_TARGETS,
  defaultRoutes: IMPRESSIONISM_ROUTES,
  create: (ctx) => new ImpressionismWorld(ctx),
};
