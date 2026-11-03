import type { MovementDefinition, Preset } from '../../core/types';
import { composeReverie } from '../../input/DemoComposer';
import { VITRINE_ROUTES, VITRINE_TARGETS } from '../vitrine/params';
import { CuadroWorld } from './CuadroWorld';
import { CUADRO_GROUPS, CUADRO_PARAMS } from './params';

const PRESETS: Preset[] = [
  {
    id: 'nocturne', label: 'Nocturne — the living painting',
    description: 'A navy, snaking body flecked with amber light, glowing membranes and silk threads, on a dark plaster wall.',
    values: { 'cu.palette': 'nocturne', 'cu.veinA': '#ff9a3c', 'cu.veinB': '#7aa0ff', 'cu.veinC': '#cfe0ff', 'cu.matterColor': '#5672d6' },
  },
  {
    id: 'ember', label: 'Ember tide',
    description: 'Darker body, the amber spreads; warm room light.',
    values: { 'cu.palette': 'ember', 'cu.veinA': '#ff4a2a', 'cu.veinB': '#ff8f3a', 'cu.veinC': '#ffd27a', 'cu.matterColor': '#3a3f5c', 'cu.patch': 2.4, 'cu.patchCover': -0.1, 'cu.lightColor': '#ffe2c4', 'cu.frameWood': 'wenge' },
  },
  {
    id: 'glacial', label: 'Glacial',
    description: 'Ice-blue creature with pale membranes in an ebony frame on honed stone.',
    values: { 'cu.palette': 'glacier', 'cu.veinA': '#3fb8ff', 'cu.veinB': '#5fe2e4', 'cu.veinC': '#e2f6ff', 'cu.matterColor': '#7fb4e8', 'cu.cells': 1.6, 'cu.patch': 0.8, 'cu.wallTexture': 'stone', 'cu.frameWood': 'ebony' },
  },
  {
    id: 'orchid', label: 'Orchid serpent',
    description: 'A longer, more twisted body in violet, rose light in the folds.',
    values: { 'cu.palette': 'orchid', 'cu.veinA': '#ff5fa8', 'cu.veinB': '#b39bff', 'cu.veinC': '#7a6aff', 'cu.matterColor': '#7a5ad0', 'cu.bend': 0.7, 'cu.bendFreq': 1.6, 'cu.wallTexture': 'limewash' },
  },
  {
    id: 'fullscreen', label: 'Canvas only',
    description: 'No room — the living painting fills the whole screen.',
    values: { 'cu.palette': 'nocturne', 'cu.veinA': '#ff9a3c', 'cu.veinB': '#7aa0ff', 'cu.veinC': '#cfe0ff', 'cu.room': false },
  },
];

export const cuadro: MovementDefinition = {
  id: 'cuadro',
  title: 'Cuadro',
  pairing: 'Custom · living painting',
  musical: 'Any music',
  description:
    'A painting comes alive on a dark wall: a navy, snaking creature flecked with amber light, with glowing membranes and silk threads, growing and breathing with the music.',
  available: true,
  params: CUADRO_PARAMS,
  groups: CUADRO_GROUPS,
  presets: PRESETS,
  modTargets: VITRINE_TARGETS,
  defaultRoutes: VITRINE_ROUTES,
  featured: ['cu.palette', 'cu.wallTexture', 'cu.frameWood'],
  keepOnPreset: ['cu.count', 'cu.strands'],
  engineDefaults: {
    'post.tonemap': 'aces', 'post.bloom': 0.6, 'post.bloomThreshold': 0.65, 'post.bloomRadius': 0.75, 'post.drift': 0,
    'post.vignette': 0.3, 'post.grain': 0.05, 'post.exposure': 1.1,
  },
  demo: composeReverie,
  demoDescription: 'Rêverie — slow Debussy-like harmony; watch the painting come alive.',
  isDark: () => true,
  create: (ctx) => new CuadroWorld(ctx),
};
