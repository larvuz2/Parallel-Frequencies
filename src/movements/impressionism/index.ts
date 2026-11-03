import type { MovementDefinition } from '../../core/types';
import { composeReverie } from '../../input/DemoComposer';
import { GROUND_TONES, PALETTES } from './palettes';
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
  featured: ['im.palette', 'im.groundTone', 'im.ground'],
  keepOnPreset: ['im.touch', 'im.touchPaint', 'im.pointerLight', 'im.atmosphere', 'im.groundDensity', 'im.touchRadius', 'im.touchStrength'],
  demo: composeReverie,
  demoDescription: 'An algorithmic study in Debussy’s idiom: the faun’s flute arabesque, planed ninth chords, whole-tone mist and sunken bells.',
  isDark: (v) => {
    const hex = GROUND_TONES.find((g) => g.id === v['im.groundTone'])?.color ?? '#ffffff';
    return luminance(hex) < 0.45;
  },
  randomise: () => {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    return {
      'im.palette': pick(PALETTES).id,
      'im.groundTone': pick(GROUND_TONES).id,
      'im.ground': pick(['linen', 'linen', 'coarse', 'paper', 'gesso']),
      'im.layout': pick(['horizon', 'horizon', 'focus', 'scatter', 'radial', 'pitchclass']),
      'im.colorMode': pick(['register', 'register', 'pitchclass', 'harmony', 'height']),
      'im.brush': pick(['auto', 'auto', 'filbert', 'flat', 'round', 'dab']),
      'im.size': r(0.01, 0.026),
      'im.speed': r(0.06, 0.25),
      'im.curvature': r(0, 0.7),
      'im.flowFollow': r(0.1, 0.8),
      'im.horizontality': r(0.2, 0.9),
      'im.brokenColor': r(0.3, 0.8),
      'im.pickup': r(0.2, 0.7),
      'im.impasto': r(0.4, 1.6),
      'im.bristleContrast': r(0.4, 0.9),
      'im.lightAz': r(60, 200),
      'im.lightEl': r(18, 55),
      'im.haze': r(0, 0.12),
    };
  },
  create: (ctx) => new ImpressionismWorld(ctx),
};

export function luminance(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
