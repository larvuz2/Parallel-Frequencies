import type { MovementDefinition, Preset } from '../../core/types';
import { composeReverie } from '../../input/DemoComposer';
import { VITRINE_ROUTES, VITRINE_TARGETS } from '../vitrine/params';
import { CuadroWorld } from './CuadroWorld';
import { CUADRO_GROUPS, CUADRO_PARAMS } from './params';

/** The dark-velvet basis shared by the raymarched presets: the light lives in rims, specks and the heart. */
const VELVET = {
  'cu.engine': 'raymarch', 'cu.rmKey': 0.5, 'cu.rmAmbient': 0.05, 'cu.rmRim': 1.05, 'cu.rmTranslucency': 0.4, 'cu.rmGloss': 0.3, 'cu.rmGlow': 0.7,
  'cu.rmSpeck': 1.2, 'cu.rmDust': 0.1, 'cu.rmHaze': 0.2, 'cu.rmDepthMix': 0.9,
  'cu.rmSeparation': 1.7, 'cu.rmBridge': 0.8, 'cu.rmFray': 0.25, 'cu.rmLumpy': 0.6, 'cu.rmFoldScale': 0.8, 'cu.rmTwist': 0.3,
  'cu.rmCore': 0.22, 'cu.rmThickness': 0.22, 'cu.rmFrame': 1.42, 'cu.rmThreadBundles': 4, 'cu.rmThreadOpacity': 0.18,
};

const PRESETS: Preset[] = [
  {
    id: 'nocturne', label: 'Nocturne — the living painting',
    description: 'Navy folded velvet with an amber heart, glittering specks and silk threads, on a dark plaster wall.',
    values: {
      'cu.engine': 'raymarch',
      // near-black navy velvet; the light lives in pale-blue rims and amber glitter
      'cu.rmOuter': '#141c44', 'cu.rmInner': '#1c2758', 'cu.rmDepthMix': 0.8, 'cu.rmGlowColor': '#ff8a3a', 'cu.rmNoteColor': '#ffb070',
      'cu.rmRimColor': '#6f88e0', 'cu.rmSpeckColor': '#ff9a3c', 'cu.rmDustColor': '#6a80c8', 'cu.rmLightColor': '#c8d6ff',
      'cu.rmKey': 0.5, 'cu.rmAmbient': 0.05, 'cu.rmRim': 1.05, 'cu.rmTranslucency': 0.35, 'cu.rmGloss': 0.3, 'cu.rmGlow': 0.6,
      'cu.rmSpeck': 1.6, 'cu.rmDust': 0.1, 'cu.rmHaze': 0.2,
      'cu.rmSeparation': 1.6, 'cu.rmBridge': 0.8, 'cu.rmFray': 0.25, 'cu.rmLumpy': 0.6, 'cu.rmFoldScale': 0.8, 'cu.rmTwist': 0.35,
      'cu.rmCore': 0.2, 'cu.rmThickness': 0.22, 'cu.rmFrame': 1.42,
      'cu.rmThreadBundles': 4, 'cu.rmThreadOpacity': 0.18, 'cu.rmThreadColor': '#c8d4ff',
    },
  },
  {
    id: 'rosegarden', label: 'Rose & emerald',
    description: 'Emerald velvet folds around a glowing dusty-rose heart; rose silk threads and copper specks.',
    values: {
      'cu.engine': 'raymarch',
      'cu.rmOuter': '#1d4d3c', 'cu.rmInner': '#b86c78', 'cu.rmDepthMix': 0.9, 'cu.rmCore': 0.32, 'cu.rmFray': 0.18, 'cu.rmBridge': 0.75, 'cu.rmFoldScale': 0.75, 'cu.rmFrame': 1.18, 'cu.rmLumpy': 0.6, 'cu.rmDust': 0.08, 'cu.rmHaze': 0.25, 'cu.rmKey': 0.75, 'cu.rmThickness': 0.2, 'cu.rmGlowColor': '#ff9a8a', 'cu.rmNoteColor': '#ffb8a0',
      'cu.rmRimColor': '#4f9c80', 'cu.rmSpeckColor': '#e08a5a', 'cu.rmDustColor': '#2f6b55', 'cu.rmLightColor': '#fff0ea',
      'cu.rmThreadColor': '#f2b8b0', 'cu.rmThreadsPer': 24, 'cu.rmThreadBundles': 6, 'cu.rmThreadOpacity': 0.25,
      'cu.rmSpeck': 0.35, 'cu.rmGlow': 1.4, 'cu.rmTranslucency': 0.7, 'cu.rmSeparation': 2.1, 'cu.rmBalance': 0.25, 'cu.rmTilt': 0.2,
      'cu.wallColor': '#33373d', 'cu.lightColor': '#e6ecf2',
    },
  },
  {
    id: 'ember', label: 'Ember tide',
    description: 'Charred folds lit from inside by a burning orange heart.',
    values: { ...VELVET, 'cu.rmOuter': '#2a1810', 'cu.rmInner': '#5a2a18', 'cu.rmGlowColor': '#ff6a2a', 'cu.rmNoteColor': '#ffb04a',
      'cu.rmRimColor': '#e0805a', 'cu.rmSpeckColor': '#ffb04a', 'cu.rmDustColor': '#8a5a3a', 'cu.rmLightColor': '#ffe2c4', 'cu.rmGlow': 1.1,
      'cu.rmThreadColor': '#ffc8a0', 'cu.lightColor': '#ffe2c4', 'cu.frameWood': 'wenge' },
  },
  {
    id: 'glacial', label: 'Glacial',
    description: 'Deep-blue translucent sheets around a pale icy heart, in an ebony frame on honed stone.',
    values: { ...VELVET, 'cu.rmOuter': '#1a3348', 'cu.rmInner': '#5f8fb0', 'cu.rmGlowColor': '#a8dcff', 'cu.rmNoteColor': '#ffffff',
      'cu.rmRimColor': '#9fd0f0', 'cu.rmSpeckColor': '#e2f6ff', 'cu.rmDustColor': '#6a9cc0', 'cu.rmLightColor': '#e2f0ff', 'cu.rmTranslucency': 0.9,
      'cu.rmThickness': 0.14, 'cu.rmSpeck': 0.8, 'cu.rmThreadColor': '#d8ecff', 'cu.wallTexture': 'stone', 'cu.frameWood': 'ebony' },
  },
  {
    id: 'orchid', label: 'Orchid serpent',
    description: 'Violet folds around a rose heart, a long twisting body.',
    values: { ...VELVET, 'cu.rmOuter': '#2a1850', 'cu.rmInner': '#7a3a78', 'cu.rmGlowColor': '#ff6ab0', 'cu.rmNoteColor': '#ffb0e0',
      'cu.rmRimColor': '#b090f0', 'cu.rmSpeckColor': '#ff9ad0', 'cu.rmDustColor': '#7a5ab0', 'cu.rmLightColor': '#f0e2ff',
      'cu.rmTwist': 0.8, 'cu.rmSeparation': 2.4, 'cu.rmBridge': 0.6, 'cu.rmThreadColor': '#f0c0e8', 'cu.wallTexture': 'limewash' },
  },
  {
    id: 'strands', label: 'Strand engine — navy',
    description: 'The earlier technique: combed strands and particles (the Vitrine engine).',
    values: { 'cu.engine': 'strands' },
  },
  {
    id: 'fullscreen', label: 'Canvas only',
    description: 'No room — the living painting fills the whole screen.',
    values: { ...VELVET, 'cu.rmOuter': '#141c44', 'cu.rmInner': '#1c2758', 'cu.rmGlowColor': '#ff8a3a', 'cu.rmRimColor': '#6f88e0', 'cu.rmSpeckColor': '#ff9a3c', 'cu.rmDustColor': '#6a80c8', 'cu.room': false },
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
