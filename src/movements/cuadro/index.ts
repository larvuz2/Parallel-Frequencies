import type { MovementDefinition, Preset } from '../../core/types';
import { composeReverie } from '../../input/DemoComposer';
import { VITRINE_ROUTES, VITRINE_TARGETS } from '../vitrine/params';
import { CuadroWorld } from './CuadroWorld';
import { CUADRO_GROUPS, CUADRO_PARAMS } from './params';

const PRESETS: Preset[] = [
  {
    id: 'nocturne', label: 'Nocturne — the living painting',
    description: 'A navy, snaking body flecked with amber light, glowing membranes and silk threads, on a dark plaster wall.',
    values: { 'cu.palette': 'nocturne', 'cu.veinA': '#ff9a3c', 'cu.veinB': '#7aa0ff', 'cu.veinC': '#9fb8ff', 'cu.matterColor': '#3f55b0' },
  },
  {
    id: 'rosegarden', label: 'Rose & emerald',
    description: 'Emerald velvet folds around a glowing dusty-rose heart, rose silk threads and copper specks.',
    values: {
      'cu.palette': 'rosegarden', 'cu.veinA': '#e9906f', 'cu.veinB': '#e8a0a8', 'cu.veinC': '#f6c8b8',
      // two-tone velvet: emerald billows around a glowing dusty-rose heart
      'cu.matterColor': '#3c8f72', 'cu.albedo': 0.3, 'cu.coreColor': '#e898a0', 'cu.coreMix': 1, 'cu.coreSize': 0.6, 'cu.coreGlow': 1.1,
      'cu.velvet': 1, 'cu.velvetSheen': 0.9, 'cu.velvetGloss': 0.3, 'cu.softEdge': 0.75, 'cu.grainAmt': 0.8,
      'cu.rimColor': '#8fe0c0', 'cu.rim': 1.2, 'cu.keyColor': '#fff0ea', 'cu.key': 0.95,
      'cu.patch': 0.35, 'cu.patchScale': 2.6, 'cu.patchCover': 0.35, 'cu.cells': 0, 'cu.veinShare': 0, 'cu.crestGlow': 0.2,
      // fine rose threads in parallel bundles across the gaps
      'cu.webs': 264, 'cu.webBundle': 12, 'cu.webSpread': 0.35, 'cu.webOpacity': 0.28, 'cu.webColor': '#f6c0b8',
      'cu.smokeColor': '#2a5a48', 'cu.smokeTint': 0.1, 'cu.smokeStrands': 0.14, 'cu.smokeOpacity': 0.18, 'cu.dotOpacity': 0.06,
      // big soft billows of folded cloth
      'cu.bend': 0.12, 'cu.width': 2.0, 'cu.height': 0.95, 'cu.depth': 0.9, 'cu.radius': 1.0, 'cu.lobes': 0.7, 'cu.lobeScale': 1.1, 'cu.roundness': 0.3,
      'cu.folds': 0.75, 'cu.foldScale': 1.1, 'cu.warp': 1.3,
      'cu.wallColor': '#33373d', 'cu.lightColor': '#e6ecf2',
    },
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
