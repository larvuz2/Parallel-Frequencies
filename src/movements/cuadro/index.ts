import type { MovementDefinition, Preset } from '../../core/types';
import { composeReverie } from '../../input/DemoComposer';
import { VITRINE_ROUTES, VITRINE_TARGETS } from '../vitrine/params';
import { CuadroWorld } from './CuadroWorld';
import { CUADRO_GROUPS, CUADRO_PARAMS } from './params';

const PRESETS: Preset[] = [
  {
    id: 'nocturne', label: 'Nocturne — the living painting',
    description: 'Navy folded velvet with an amber heart, glittering specks and silk threads, on a dark plaster wall.',
    values: { 'cu.engine': 'raymarch' },
  },
  {
    id: 'rosegarden', label: 'Rose & emerald',
    description: 'Emerald velvet folds around a glowing dusty-rose heart; rose silk threads and copper specks.',
    values: {
      'cu.engine': 'raymarch',
      'cu.rmOuter': '#1d4d3c', 'cu.rmInner': '#b86c78', 'cu.rmDepthMix': 0.9, 'cu.rmCore': 0.32, 'cu.rmFray': 0.18, 'cu.rmBridge': 0.75, 'cu.rmFoldScale': 0.75, 'cu.rmFrame': 1.18, 'cu.rmLumpy': 0.6, 'cu.rmDust': 0.2, 'cu.rmKey': 0.75, 'cu.rmThickness': 0.2, 'cu.rmGlowColor': '#ff9a8a', 'cu.rmNoteColor': '#ffb8a0',
      'cu.rmRimColor': '#4f9c80', 'cu.rmSpeckColor': '#e08a5a', 'cu.rmDustColor': '#2f6b55', 'cu.rmLightColor': '#fff0ea',
      'cu.rmThreadColor': '#f2b8b0', 'cu.rmThreadsPer': 24, 'cu.rmThreadBundles': 6, 'cu.rmThreadOpacity': 0.25,
      'cu.rmSpeck': 0.35, 'cu.rmGlow': 1.4, 'cu.rmTranslucency': 0.7, 'cu.rmSeparation': 2.1, 'cu.rmBalance': 0.25, 'cu.rmTilt': 0.2,
      'cu.wallColor': '#33373d', 'cu.lightColor': '#e6ecf2',
    },
  },
  {
    id: 'ember', label: 'Ember tide',
    description: 'Charcoal folds lit from inside by a burning orange heart.',
    values: { 'cu.engine': 'raymarch', 'cu.rmOuter': '#2a2c38', 'cu.rmInner': '#7a3a24', 'cu.rmGlowColor': '#ff6a2a', 'cu.rmNoteColor': '#ffb04a',
      'cu.rmRimColor': '#ffb08a', 'cu.rmSpeckColor': '#ff8a3a', 'cu.rmDustColor': '#a8705a', 'cu.rmGlow': 2, 'cu.rmSpeck': 1, 'cu.lightColor': '#ffe2c4', 'cu.frameWood': 'wenge' },
  },
  {
    id: 'glacial', label: 'Glacial',
    description: 'Ice-blue translucent sheets around a pale glowing heart, in an ebony frame on honed stone.',
    values: { 'cu.engine': 'raymarch', 'cu.rmOuter': '#5f9ccc', 'cu.rmInner': '#cfe6f6', 'cu.rmGlowColor': '#bfe8ff', 'cu.rmNoteColor': '#ffffff',
      'cu.rmRimColor': '#e2f6ff', 'cu.rmSpeckColor': '#9fd8ff', 'cu.rmDustColor': '#a8d0ec', 'cu.rmTranslucency': 1.2, 'cu.rmThickness': 0.09,
      'cu.wallTexture': 'stone', 'cu.frameWood': 'ebony' },
  },
  {
    id: 'orchid', label: 'Orchid serpent',
    description: 'Violet folds, rose heart, a long twisting body.',
    values: { 'cu.engine': 'raymarch', 'cu.rmOuter': '#4a2f8a', 'cu.rmInner': '#c66aa8', 'cu.rmGlowColor': '#ff7ab8', 'cu.rmNoteColor': '#ffb0e0',
      'cu.rmRimColor': '#c8a8ff', 'cu.rmSpeckColor': '#ff9ad0', 'cu.rmDustColor': '#9a7ad0', 'cu.rmTwist': 0.9, 'cu.rmSeparation': 2.8, 'cu.wallTexture': 'limewash' },
  },
  {
    id: 'strands', label: 'Strand engine — navy',
    description: 'The earlier technique: combed strands and particles (the Vitrine engine).',
    values: { 'cu.engine': 'strands' },
  },
  {
    id: 'fullscreen', label: 'Canvas only',
    description: 'No room — the living painting fills the whole screen.',
    values: { 'cu.engine': 'raymarch', 'cu.room': false },
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
  featured: ['cu.engine', 'cu.wallTexture', 'cu.frameWood'],
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
