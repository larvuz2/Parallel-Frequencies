import type { Preset } from '../../core/types';

/**
 * Style presets — variations within Impressionism (and its neighbours). Each preset only sets
 * the parameters that define its character; everything else keeps its current value.
 * Numeric values glide when switched during a performance.
 */
const PRESETS: Preset[] = [
  {
    id: 'soleil-levant',
    label: 'Monet — Impression, soleil levant',
    description: 'Le Havre at dawn: horizontal dashes on water, a veiled sky, the red sun and its broken reflection.',
    values: {
      'im.layout': 'horizon', 'im.horizon': 0.42, 'im.palette': 'soleil-levant', 'im.colorMode': 'register', 'im.paletteShift': 0,
      'im.ground': 'linen', 'im.groundTone': 'grey-imprimatura', 'im.brush': 'auto', 'im.size': 0.018, 'im.sizeVar': 0.35,
      'im.speed': 0.12, 'im.lift': 0.22, 'im.strokes': 1, 'im.horizontality': 0.75, 'im.curvature': 0.25, 'im.flowFollow': 0.35,
      'im.brokenColor': 0.55, 'im.pickup': 0.4, 'im.impasto': 0.75, 'im.opacity': 0.85, 'im.reflections': true, 'im.reflectAmt': 0.5,
      'im.ripple': 0.65, 'im.haze': 0.06, 'im.accentThreshold': 0.88, 'im.accentGlow': 1.1, 'im.dryBrush': 0.7, 'im.load': 1,
      'im.lightEl': 38, 'im.relief': 6, 'im.liquidity': 0.2, 'im.bleed': 0.15, 'im.bristles': 24, 'im.tremor': 0.25,
    },
  },
  {
    id: 'nympheas',
    label: 'Monet — Nymphéas',
    description: 'No horizon: an endless surface of water, lilies and reflected sky in soft, layered strokes.',
    values: {
      'im.layout': 'focus', 'im.palette': 'nympheas', 'im.colorMode': 'harmony', 'im.ground': 'coarse', 'im.groundTone': 'blue-grey',
      'im.brush': 'filbert', 'im.size': 0.021, 'im.sizeVar': 0.5, 'im.speed': 0.14, 'im.horizontality': 0.85, 'im.curvature': 0.45,
      'im.flowFollow': 0.5, 'im.spread': 0.7, 'im.brokenColor': 0.7, 'im.pickup': 0.6, 'im.impasto': 0.9, 'im.liquidity': 0.4,
      'im.bleed': 0.3, 'im.haze': 0.05, 'im.reflections': false, 'im.accentThreshold': 0.9, 'im.lightEl': 32, 'im.shimmer': 0.3,
    },
  },
  {
    id: 'rouen',
    label: 'Monet — Rouen Cathedral',
    description: 'Thick, crusted paint in full sunlight. Low raking light reveals every ridge.',
    values: {
      'im.layout': 'pitchclass', 'im.palette': 'rouen', 'im.colorMode': 'register', 'im.ground': 'coarse', 'im.groundTone': 'ochre',
      'im.brush': 'dab', 'im.size': 0.015, 'im.sizeVar': 0.4, 'im.speed': 0.09, 'im.horizontality': 0.3, 'im.curvature': 0.15,
      'im.impasto': 1.9, 'im.heightCarry': 0.9, 'im.dryBrush': 0.95, 'im.load': 0.8, 'im.lightEl': 16, 'im.relief': 11,
      'im.sheen': 0.45, 'im.pickup': 0.25, 'im.brokenColor': 0.6, 'im.haze': 0.04, 'im.strokes': 2,
    },
  },
  {
    id: 'parliament',
    label: 'Monet — Parliament in fog',
    description: 'Violet fog over the Thames; forms dissolve in vapour, the sun burns through as an orange glow.',
    values: {
      'im.layout': 'horizon', 'im.horizon': 0.38, 'im.palette': 'parliament', 'im.ground': 'paper', 'im.groundTone': 'rose',
      'im.brush': 'auto', 'im.size': 0.024, 'im.sizeVar': 0.5, 'im.speed': 0.16, 'im.opacity': 0.55, 'im.pickup': 0.7,
      'im.liquidity': 0.5, 'im.bleed': 0.5, 'im.haze': 0.2, 'im.memoryMode': 'haze', 'im.accentGlow': 2, 'im.accentThreshold': 0.82,
      'im.impasto': 0.4, 'im.reflections': true, 'im.reflectAmt': 0.4, 'im.ripple': 0.8, 'im.motes': 4000, 'im.moteGlow': 0.8,
    },
  },
  {
    id: 'pissarro',
    label: 'Pissarro — Boulevard, winter',
    description: 'Tight, patient hatching in cool greys; the painting advances like a score.',
    values: {
      'im.layout': 'score', 'im.palette': 'saint-lazare', 'im.colorMode': 'register', 'im.ground': 'linen', 'im.groundTone': 'cream',
      'im.brush': 'flat', 'im.size': 0.009, 'im.sizeVar': 0.2, 'im.speed': 0.1, 'im.strokes': 3, 'im.restroke': true,
      'im.curvature': 0.08, 'im.flowFollow': 0.1, 'im.horizontality': 0.2, 'im.brokenColor': 0.4, 'im.impasto': 0.6,
      'im.tremor': 0.1, 'im.haze': 0.03,
    },
  },
  {
    id: 'sisley',
    label: 'Sisley — Flood at Port-Marly',
    description: 'A great pale sky in broad scumbles over still floodwater.',
    values: {
      'im.layout': 'horizon', 'im.horizon': 0.36, 'im.palette': 'flood', 'im.ground': 'linen', 'im.groundTone': 'lead-white',
      'im.brush': 'wash', 'im.size': 0.03, 'im.sizeVar': 0.4, 'im.speed': 0.22, 'im.opacity': 0.6, 'im.dryBrush': 0.9,
      'im.load': 0.7, 'im.horizontality': 0.85, 'im.impasto': 0.35, 'im.reflections': true, 'im.reflectAmt': 0.6, 'im.ripple': 0.5,
    },
  },
  {
    id: 'renoir',
    label: 'Renoir — dappled light',
    description: 'Feathery, soft strokes melting into each other; warm sun through leaves.',
    values: {
      'im.layout': 'focus', 'im.palette': 'moulin', 'im.colorMode': 'pitchclass', 'im.ground': 'linen', 'im.groundTone': 'cream',
      'im.brush': 'round', 'im.size': 0.019, 'im.sizeVar': 0.5, 'im.speed': 0.12, 'im.bristleContrast': 0.35, 'im.edgeRough': 0.8,
      'im.pickup': 0.75, 'im.bleed': 0.4, 'im.brokenColor': 0.8, 'im.curvature': 0.5, 'im.impasto': 0.5, 'im.spread': 0.6,
      'im.haze': 0.05, 'im.shimmer': 0.25,
    },
  },
  {
    id: 'morisot',
    label: 'Morisot — summer’s day',
    description: 'Fast, airy zigzags in silvery whites. Barely touching the canvas.',
    values: {
      'im.layout': 'scatter', 'im.palette': 'morisot', 'im.colorMode': 'random', 'im.ground': 'gesso', 'im.groundTone': 'gallery-white',
      'im.brush': 'filbert', 'im.size': 0.013, 'im.speed': 0.45, 'im.lift': 0.4, 'im.restroke': true, 'im.tremor': 0.45,
      'im.curvature': 0.55, 'im.load': 0.65, 'im.dryBrush': 0.8, 'im.opacity': 0.75, 'im.impasto': 0.4, 'im.haze': 0.02,
    },
  },
  {
    id: 'seurat',
    label: 'Seurat — pointillism',
    description: 'Pure dots of unmixed colour; the eye does the mixing.',
    values: {
      'im.layout': 'scatter', 'im.palette': 'grande-jatte', 'im.colorMode': 'pitchclass', 'im.ground': 'gesso', 'im.groundTone': 'cream',
      'im.brush': 'dab', 'im.size': 0.0065, 'im.sizeVar': 0.2, 'im.speed': 0.012, 'im.minLen': 0.004, 'im.lift': 0.05, 'im.strokes': 6,
      'im.spread': 0.6, 'im.brokenColor': 0, 'im.colorJitter': 0.5, 'im.pickup': 0, 'im.impasto': 0.5, 'im.restroke': false,
      'im.reflections': false, 'im.liquidity': 0, 'im.bleed': 0, 'im.accentThreshold': 1.01, 'im.haze': 0.02, 'im.cluster': 0.2,
    },
  },
  {
    id: 'signac',
    label: 'Signac — divisionist mosaic',
    description: 'Square tesserae of pure colour laid like a mosaic.',
    values: {
      'im.layout': 'focus', 'im.palette': 'grande-jatte', 'im.colorMode': 'harmony', 'im.ground': 'gesso', 'im.groundTone': 'lead-white',
      'im.brush': 'flat', 'im.size': 0.009, 'im.sizeVar': 0.15, 'im.speed': 0.03, 'im.minLen': 0.012, 'im.lift': 0.06, 'im.strokes': 3,
      'im.spread': 0.75, 'im.brokenColor': 0.1, 'im.pickup': 0, 'im.impasto': 0.7, 'im.restroke': false, 'im.horizontality': 0.5,
      'im.curvature': 0, 'im.flowFollow': 0.6, 'im.liquidity': 0, 'im.bleed': 0,
    },
  },
  {
    id: 'turner',
    label: 'Turner — vapour and light',
    description: 'Proto-impressionist: dissolving golden vapour and blinding light.',
    values: {
      'im.layout': 'radial', 'im.palette': 'turner', 'im.colorMode': 'register', 'im.ground': 'paper', 'im.groundTone': 'cream',
      'im.brush': 'wash', 'im.size': 0.03, 'im.sizeVar': 0.6, 'im.speed': 0.25, 'im.opacity': 0.5, 'im.pickup': 0.8,
      'im.liquidity': 0.65, 'im.bleed': 0.6, 'im.haze': 0.14, 'im.accentGlow': 2.4, 'im.accentThreshold': 0.8, 'im.curvature': 0.6,
      'im.flowFollow': 0.7, 'im.impasto': 0.3, 'im.memoryMode': 'haze',
    },
  },
  {
    id: 'faune',
    label: 'Debussy — Prélude à l’après-midi d’un faune',
    description: 'A nocturne: deep blue air, a flute line drawn in light, glints like heat in the reeds.',
    values: {
      'im.layout': 'focus', 'im.palette': 'faune', 'im.colorMode': 'register', 'im.ground': 'linen', 'im.groundTone': 'night',
      'im.brush': 'auto', 'im.size': 0.017, 'im.sizeVar': 0.45, 'im.speed': 0.14, 'im.lift': 0.45, 'im.curvature': 0.45,
      'im.flowFollow': 0.6, 'im.horizontality': 0.45, 'im.brokenColor': 0.6, 'im.pickup': 0.5, 'im.impasto': 0.7, 'im.paletteShift': 0.28,
      'im.accentGlow': 1.8, 'im.accentThreshold': 0.85, 'im.haze': 0.04, 'im.motes': 3200, 'im.moteGlow': 0.8, 'im.ambient': 0.6,
      'im.groundRelief': 0.12,
      'im.liquidity': 0.35, 'im.shimmer': 0.3,
    },
  },
  {
    id: 'swirl',
    label: 'Post-impressionist swirl',
    description: 'Heavy impasto pulled into turbulent, curling rhythms.',
    values: {
      'im.layout': 'scatter', 'im.palette': 'starry', 'im.colorMode': 'register', 'im.ground': 'coarse', 'im.groundTone': 'night',
      'im.paletteShift': 0.15, 'im.groundRelief': 0.15, 'im.brush': 'filbert', 'im.size': 0.012, 'im.sizeVar': 0.3, 'im.speed': 0.22, 'im.strokes': 2, 'im.curvature': 0.85,
      'im.flowFollow': 0.95, 'im.flowScale': 2.6, 'im.horizontality': 0, 'im.impasto': 2, 'im.heightCarry': 0.85, 'im.load': 1.3,
      'im.relief': 10, 'im.lightEl': 24, 'im.pickup': 0.3, 'im.accentGlow': 1.6, 'im.haze': 0.02,
    },
  },
  {
    id: 'etretat',
    label: 'Monet — Étretat, rough sea',
    description: 'Wind-driven strokes; cliffs and turquoise water in strong, broken colour.',
    values: {
      'im.layout': 'horizon', 'im.horizon': 0.55, 'im.palette': 'etretat', 'im.ground': 'coarse', 'im.groundTone': 'raw-linen',
      'im.brush': 'auto', 'im.size': 0.018, 'im.speed': 0.35, 'im.curvature': 0.5, 'im.flowFollow': 0.6, 'im.flowSpeed': 0.35,
      'im.horizontality': 0.5, 'im.impasto': 1.2, 'im.brokenColor': 0.65, 'im.tremor': 0.4, 'im.reflections': false, 'im.haze': 0.03,
    },
  },
];

/** Built-in presets set the look only; your Mapping connections are kept when switching. */
export const IMPRESSIONISM_PRESETS: Preset[] = PRESETS;
