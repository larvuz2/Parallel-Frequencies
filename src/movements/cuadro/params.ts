import type { ParamDef, ParamGroup, ParamValue } from '../../core/types';
import { VITRINE_GROUPS, VITRINE_PARAMS } from '../vitrine/params';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const x2 = (v: number) => v.toFixed(2);
const x3 = (v: number) => v.toFixed(3);

/** The look of the reference: a navy, snaking body flecked with amber, membranes, webs and dust. */
const LOOK: Record<string, ParamValue> = {
  // shape
  radius: 0.9, width: 2.05, height: 0.72, depth: 0.85, lobes: 0.95, lobeScale: 1.45, folds: 0.3, foldScale: 0.8, warp: 0.6,
  bend: 0.24, bendFreq: 1.7, roundness: 0.25, breathe: 1, evolve: 0.02,
  // strands: short and fine, so the skin reads as a grainy, sparkling surface
  strands: '65536', matterColor: '#33479f', albedo: 0.5, toneVar: 0.7, strandWidth: 1.7, strandLength: 0.1, contour: 0.3, sweep: 1.4, thickness: 0.18,
  // the reference is a smooth velvety skin, not combed fibres
  skinStrands: false, velvet: 1, velvetSheen: 1.1, velvetGloss: 0.55, softEdge: 0.7, grainAmt: 0.7, streaks: 0, body: true, fibreOpacity: 0,
  webBundle: 12, webSpread: 0.3,
  // smoke & dust
  smokeStrands: 0.12, smokeOpacity: 0.16, smokeColor: '#28324c', smokeTint: 0.3, warmShare: 0.06, smokeLength: 1.5, smokeWidth: 0.7, frontFade: 0.9,
  dotOpacity: 0.14, dotSize: 0.7, wisps: 0.25, wispReach: 0.5,
  webs: 180, webOpacity: 0.22, webColor: '#b8c8ff',
  // light & colour
  palette: 'nocturne', veinA: '#ff9a3c', veinB: '#7aa0ff', veinC: '#9fb8ff', veinShare: 0.025, crestGlow: 0.35, veinThreshold: 0.9,
  patch: 0.8, patchScale: 2.1, patchCover: 0.25, cells: 0.55, cellScale: 9,
  key: 1.1, keyColor: '#c4d4ff', rim: 1.9, rimColor: '#9fb4ff', ambient: 0.35, sheen: 0.45,
  // the painting is pure black behind the creature
  frame: false, floor: false, bgColor: '#000000',
  camera: 'gallery', frameW: 4.4, frameH: 2.6, frameD: 1.6, zoom: 0.9, sway: 0.25, fov: 26,
  // growth
  accumulate: true,
};

/** Groups that belong to the vitrine's own set (its frame and floor) are hidden in this mode. */
const HIDDEN_GROUPS = new Set(['frame', 'stage']);

export const CUADRO_INNER_PARAMS: ParamDef[] = VITRINE_PARAMS.map((d) => {
  const name = d.key.slice(3);
  const def = { ...d, key: 'cu.' + name } as ParamDef;
  if (name in LOOK) (def as { default: ParamValue }).default = LOOK[name];
  if (HIDDEN_GROUPS.has(d.group) || name === 'frame' || name === 'floor') def.hidden = true;
  return def;
});

export const CUADRO_GROUPS: ParamGroup[] = [
  { id: 'engine', label: 'Creature', blurb: 'Which technique draws the living matter, and how it grows with the music.' },
  { id: 'rmShape', label: 'Shape', blurb: 'Two lobes of folded cloth joined by a bridge; the folds are thin sheets inside them.' },
  { id: 'rmColour', label: 'Colour', blurb: 'Outer folds, inner heart, glow, rim, specks and dust.' },
  { id: 'rmLight', label: 'Light & velvet', blurb: 'Soft key light, velvet rim, translucency and grain.', collapsed: true },
  { id: 'rmGlow', label: 'Glow & notes', blurb: 'The luminous heart, and the light each note kindles.', collapsed: true },
  { id: 'rmThreads', label: 'Threads', blurb: 'Fine silk threads in parallel bundles spanning the gap.', collapsed: true },
  { id: 'rmView', label: 'View & quality', blurb: 'Framing inside the painting, and raymarching quality.', collapsed: true },
  { id: 'room', label: 'Room & painting', blurb: 'The wall, the frame and how the living painting hangs in the room.', collapsed: true },
  ...VITRINE_GROUPS.filter((g) => !HIDDEN_GROUPS.has(g.id)).map((g) => ({ ...g, label: 'Strand engine · ' + g.label, collapsed: true })),
];

const WOOD_OPTIONS = [
  { value: 'walnut', label: 'American walnut', swatches: ['#4a2a1a', '#7a4428'] },
  { value: 'oak', label: 'Smoked oak', swatches: ['#6b5a4a', '#9a8670'] },
  { value: 'ebony', label: 'Macassar ebony', swatches: ['#120c08', '#8a4a20'] },
  { value: 'wenge', label: 'Wenge', swatches: ['#2a1a12', '#7a3e22'] },
  { value: 'whiteoak', label: 'White oak', swatches: ['#d8bb92', '#c79b62'] },
  { value: 'charred', label: 'Charred cedar', swatches: ['#1a1a1a', '#5a5a5a'] },
];

export const CUADRO_ROOM_PARAMS: ParamDef[] = [
  { key: 'cu.room', label: 'Show the room', group: 'room', type: 'toggle', default: true, hint: 'Off: the living painting fills the whole screen.' },
  { key: 'cu.roomZoom', label: 'View distance', group: 'room', type: 'range', min: 0.6, max: 1.8, step: 0.01, default: 1, format: (v) => `${x2(v)}×` },
  { key: 'cu.roomSway', label: 'Viewer sway', group: 'room', type: 'range', min: 0, max: 1, step: 0.01, default: 0.25, format: pct, hint: 'A slow, barely perceptible drift of the viewpoint.' },
  { key: 'cu.panelAspect', label: 'Painting proportion', group: 'room', type: 'range', min: 1, max: 2.4, step: 0.01, default: 1.62, format: (v) => `${x2(v)} : 1` },
  { key: 'cu.panelSize', label: 'Painting size', group: 'room', type: 'range', min: 0.4, max: 0.98, step: 0.01, default: 0.74, format: pct, hint: 'Height of the painting relative to the view.' },
  { key: 'cu.panelBright', label: 'Painting brightness', group: 'room', type: 'range', min: 0.3, max: 2.5, step: 0.01, default: 1.05, format: x2 },
  { key: 'cu.glass', label: 'Glass reflection', group: 'room', type: 'range', min: 0, max: 0.4, step: 0.005, default: 0.012, format: pct, hint: 'A faint sheen across the painting, as if behind glass.' },
  { key: 'cu.frameWood', label: 'Frame wood', group: 'room', type: 'select', default: 'walnut', options: WOOD_OPTIONS },
  { key: 'cu.frameTint', label: 'Frame tint', group: 'room', type: 'color', default: '#7a6658' },
  { key: 'cu.frameBorder', label: 'Frame width', group: 'room', type: 'range', min: 0.004, max: 0.09, step: 0.001, default: 0.016, format: x3 },
  { key: 'cu.frameDepth', label: 'Frame depth', group: 'room', type: 'range', min: 0.005, max: 0.12, step: 0.001, default: 0.03, format: x3 },
  { key: 'cu.frameGloss', label: 'Frame varnish', group: 'room', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, format: pct },
  {
    key: 'cu.wallTexture', label: 'Wall', group: 'room', type: 'select', default: 'plaster',
    hint: 'Wall surfaces generated with FLUX (fal.ai) and made seamless.',
    options: [
      { value: 'plaster', label: 'Venetian plaster' },
      { value: 'limewash', label: 'Limewash' },
      { value: 'stone', label: 'Honed stone' },
      { value: 'fabric', label: 'Felt panels' },
      { value: 'none', label: 'Plain' },
    ],
  },
  { key: 'cu.wallColor', label: 'Wall colour', group: 'room', type: 'color', default: '#3a3d42' },
  { key: 'cu.wallScale', label: 'Wall texture scale', group: 'room', type: 'range', min: 0.3, max: 4, step: 0.01, default: 1, format: (v) => `${x2(v)}×` },
  { key: 'cu.wallLight', label: 'Light on the wall', group: 'room', type: 'range', min: 0, max: 3, step: 0.01, default: 1, format: x2 },
  { key: 'cu.lightColor', label: 'Room light colour', group: 'room', type: 'color', default: '#e8ecf5' },
  { key: 'cu.wallVignette', label: 'Shadowed corners', group: 'room', type: 'range', min: 0, max: 1, step: 0.01, default: 0.7, format: pct },
  { key: 'cu.haze', label: 'Smoky haze', group: 'room', type: 'range', min: 0, max: 1, step: 0.01, default: 0.45, format: pct, hint: 'Slow drifting smoke in the room, around the painting.' },
  { key: 'cu.hazeColor', label: 'Haze colour', group: 'room', type: 'color', default: '#5a5f68' },
];

const deg = (v: number) => `${Math.round(v)}°`;
export const CUADRO_RM_PARAMS: ParamDef[] = [
  {
    key: 'cu.engine', label: 'Technique', group: 'engine', type: 'select', default: 'raymarch',
    hint: 'Raymarched cloth: smooth folded sheets with a glowing heart (closest to the reference images). Strand engine: the Vitrine’s combed strands and particles.',
    options: [
      { value: 'raymarch', label: 'Raymarched cloth' },
      { value: 'strands', label: 'Strand engine (Vitrine)' },
    ],
  },
  { key: 'cu.rmStart', label: 'Starting size', group: 'engine', type: 'range', min: 0, max: 1, step: 0.01, default: 0.15, format: pct, hint: 'How much of the creature exists before any note.' },
  { key: 'cu.rmPerNote', label: 'Growth per note', group: 'engine', type: 'range', min: 0, max: 0.05, step: 0.0005, default: 0.008, format: (v) => `${(v * 100).toFixed(2)}%` },
  { key: 'cu.rmIdleGrowth', label: 'Slow growth', group: 'engine', type: 'range', min: 0, max: 0.05, step: 0.0005, default: 0.002, format: (v) => `${(v * 100).toFixed(2)}%/s` },
  { key: 'cu.rmSilent', label: 'Silence before shrinking', group: 'engine', type: 'range', min: 5, max: 300, step: 1, default: 45, format: (v) => `${v} s` },
  { key: 'cu.rmDissolve', label: 'Shrink speed', group: 'engine', type: 'range', min: 0, max: 0.05, step: 0.0005, default: 0.006, format: (v) => `${(v * 100).toFixed(2)}%/s` },

  { key: 'cu.rmSize', label: 'Size', group: 'rmShape', type: 'range', min: 0.4, max: 1.8, step: 0.01, default: 1, format: x2 },
  { key: 'cu.rmSeparation', label: 'Lobe separation', group: 'rmShape', type: 'range', min: 0, max: 4, step: 0.01, default: 2.1, format: x2, hint: 'Distance between the two masses. 0 = one mass.' },
  { key: 'cu.rmBalance', label: 'Lobe balance', group: 'rmShape', type: 'range', min: -1, max: 1, step: 0.01, default: 0.15, format: x2, hint: 'Which of the two masses is bigger.' },
  { key: 'cu.rmTilt', label: 'Tilt', group: 'rmShape', type: 'range', min: -1, max: 1, step: 0.01, default: 0.25, format: x2 },
  { key: 'cu.rmBridge', label: 'Bridge', group: 'rmShape', type: 'range', min: 0.05, max: 2, step: 0.01, default: 0.9, format: x2, hint: 'How broadly the two masses merge in the middle.' },
  { key: 'cu.rmLumpy', label: 'Lumpiness', group: 'rmShape', type: 'range', min: 0, max: 1.2, step: 0.01, default: 0.45, format: x2, hint: 'Irregular outline of the masses.' },
  { key: 'cu.rmFoldScale', label: 'Fold scale', group: 'rmShape', type: 'range', min: 0.3, max: 3, step: 0.01, default: 1.05, format: x2, hint: 'Small: a few large folds. Large: many small ones.' },
  { key: 'cu.rmLayers', label: 'Fold layers', group: 'rmShape', type: 'range', min: 1, max: 4, step: 0.01, default: 1, format: x2, hint: 'How many nested sheets of cloth.' },
  { key: 'cu.rmThickness', label: 'Cloth thickness', group: 'rmShape', type: 'range', min: 0.02, max: 0.5, step: 0.005, default: 0.16, format: x3, hint: 'Thin: delicate translucent sheets. Thick: heavy velvet.' },
  { key: 'cu.rmWarp', label: 'Crumple', group: 'rmShape', type: 'range', min: 0, max: 3, step: 0.01, default: 1.2, format: x2, hint: 'How twisted and crumpled the folds are.' },
  { key: 'cu.rmFray', label: 'Fraying', group: 'rmShape', type: 'range', min: 0.02, max: 1, step: 0.01, default: 0.2, format: x2, hint: 'How far in from the outline the folds thin away. Low: full folds right to the edge.' },
  { key: 'cu.rmTwist', label: 'Twist', group: 'rmShape', type: 'range', min: -1.5, max: 1.5, step: 0.01, default: 0.2, format: x2 },
  { key: 'cu.rmCore', label: 'Heart size', group: 'rmShape', type: 'range', min: 0, max: 1, step: 0.01, default: 0.32, format: pct, hint: 'A solid inner core that shows through the folds.' },
  { key: 'cu.rmEvolve', label: 'Slow change', group: 'rmShape', type: 'range', min: 0, max: 0.3, step: 0.001, default: 0.04, format: x3, hint: 'How fast the folds move. Tension speeds it up (Mapping).' },
  { key: 'cu.rmSwell', label: 'Swell under notes', group: 'rmShape', type: 'range', min: 0, max: 3, step: 0.01, default: 0.8, format: x2 },

  { key: 'cu.rmOuter', label: 'Outer folds', group: 'rmColour', type: 'color', default: '#1f3f9a' },
  { key: 'cu.rmInner', label: 'Inner folds', group: 'rmColour', type: 'color', default: '#2d3f8a' },
  { key: 'cu.rmDepthMix', label: 'Inner colour reach', group: 'rmColour', type: 'range', min: 0, max: 4, step: 0.01, default: 2.2, format: x2, hint: 'How quickly folds turn to the inner colour as they lie deeper.' },
  { key: 'cu.rmGlowColor', label: 'Heart glow', group: 'rmColour', type: 'color', default: '#ff9a4a' },
  { key: 'cu.rmNoteColor', label: 'Note light', group: 'rmColour', type: 'color', default: '#ffb070' },
  { key: 'cu.rmRimColor', label: 'Rim', group: 'rmColour', type: 'color', default: '#9fb4ff' },
  { key: 'cu.rmSpeckColor', label: 'Specks', group: 'rmColour', type: 'color', default: '#ff9a3c' },
  { key: 'cu.rmDustColor', label: 'Dust & haze', group: 'rmColour', type: 'color', default: '#8ea2d8' },
  { key: 'cu.rmLightColor', label: 'Key light', group: 'rmColour', type: 'color', default: '#e8eeff' },

  { key: 'cu.rmKey', label: 'Key light', group: 'rmLight', type: 'range', min: 0, max: 3, step: 0.01, default: 1.0, format: x2 },
  { key: 'cu.rmLightAz', label: 'Light direction', group: 'rmLight', type: 'range', min: 0, max: 180, step: 1, default: 130, format: deg, hint: '0° from the right, 90° from above, 180° from the left.' },
  { key: 'cu.rmLightEl', label: 'Light height', group: 'rmLight', type: 'range', min: -60, max: 85, step: 1, default: 40, format: deg },
  { key: 'cu.rmAmbient', label: 'Ambient', group: 'rmLight', type: 'range', min: 0, max: 1, step: 0.01, default: 0.12, format: x2 },
  { key: 'cu.rmRim', label: 'Velvet rim', group: 'rmLight', type: 'range', min: 0, max: 3, step: 0.01, default: 1.1, format: x2, hint: 'The fuzzy lit edge of velvet.' },
  { key: 'cu.rmTranslucency', label: 'Translucency', group: 'rmLight', type: 'range', min: 0, max: 2, step: 0.01, default: 0.5, format: x2, hint: 'Light passing through thin sheets.' },
  { key: 'cu.rmGloss', label: 'Silky highlights', group: 'rmLight', type: 'range', min: 0, max: 2, step: 0.01, default: 0.35, format: x2 },
  { key: 'cu.rmGrain', label: 'Grain', group: 'rmLight', type: 'range', min: 0, max: 2, step: 0.01, default: 0.8, format: x2 },
  { key: 'cu.rmAO', label: 'Shadows in the folds', group: 'rmLight', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.7, format: x2 },

  { key: 'cu.rmGlow', label: 'Heart glow', group: 'rmGlow', type: 'range', min: 0, max: 4, step: 0.01, default: 1.0, format: x2, hint: 'Light gathered between the folds deep inside.' },
  { key: 'cu.rmSpeck', label: 'Specks', group: 'rmGlow', type: 'range', min: 0, max: 3, step: 0.01, default: 0.6, format: x2, hint: 'Glittering specks scattered over patches of the skin.' },
  { key: 'cu.rmDust', label: 'Dusty edges', group: 'rmGlow', type: 'range', min: 0, max: 3, step: 0.01, default: 0.35, format: x2, hint: 'Fine grain dissolving the silhouette into dust.' },
  { key: 'cu.rmDustSize', label: 'Dust reach', group: 'rmGlow', type: 'range', min: 0.1, max: 4, step: 0.01, default: 1, format: x2 },
  { key: 'cu.rmHaze', label: 'Haze', group: 'rmGlow', type: 'range', min: 0, max: 3, step: 0.01, default: 0.4, format: x2 },
  { key: 'cu.rmNoteGlow', label: 'Note glow', group: 'rmGlow', type: 'range', min: 0, max: 4, step: 0.01, default: 1.2, format: x2 },
  { key: 'cu.rmNoteReach', label: 'Note reach', group: 'rmGlow', type: 'range', min: 0.1, max: 2, step: 0.01, default: 0.55, format: x2 },
  { key: 'cu.rmNoteDecay', label: 'Note afterglow', group: 'rmGlow', type: 'range', min: 0.1, max: 8, step: 0.05, default: 1.6, format: (v) => `${v.toFixed(2)} s` },

  { key: 'cu.rmThreadBundles', label: 'Bundles', group: 'rmThreads', type: 'range', min: 0, max: 20, step: 1, default: 5 },
  { key: 'cu.rmThreadsPer', label: 'Threads per bundle', group: 'rmThreads', type: 'range', min: 1, max: 60, step: 1, default: 18 },
  { key: 'cu.rmThreadSpread', label: 'Spread', group: 'rmThreads', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.45, format: x2 },
  { key: 'cu.rmThreadBow', label: 'Curve', group: 'rmThreads', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.45, format: x2 },
  { key: 'cu.rmThreadOpacity', label: 'Brightness', group: 'rmThreads', type: 'range', min: 0, max: 2, step: 0.01, default: 0.22, format: x2 },
  { key: 'cu.rmThreadColor', label: 'Colour', group: 'rmThreads', type: 'color', default: '#c8d4ff' },
  { key: 'cu.rmSeed', label: 'Variation', group: 'rmThreads', type: 'range', min: 1, max: 99, step: 1, default: 7, hint: 'A different arrangement of the bundles.' },

  { key: 'cu.rmFrame', label: 'Framing', group: 'rmView', type: 'range', min: 0.6, max: 2, step: 0.01, default: 1.4, format: (v) => `${x2(v)}×`, hint: 'How much of the painting the creature fills (higher = smaller).' },
  { key: 'cu.rmYaw', label: 'Turn', group: 'rmView', type: 'range', min: -60, max: 60, step: 1, default: 0, format: deg },
  { key: 'cu.rmPitch', label: 'Look from above', group: 'rmView', type: 'range', min: -40, max: 40, step: 1, default: 6, format: deg },
  { key: 'cu.rmOffsetY', label: 'Vertical offset', group: 'rmView', type: 'range', min: -1, max: 1, step: 0.01, default: 0, format: x2 },
  { key: 'cu.rmFov', label: 'Lens', group: 'rmView', type: 'range', min: 15, max: 70, step: 1, default: 28, format: deg },
  { key: 'cu.rmResolution', label: 'March resolution', group: 'rmView', type: 'range', min: 0.2, max: 1, step: 0.05, default: 0.5, format: pct, hint: 'Pixels raymarched relative to the screen. Lower for speed.' },
  { key: 'cu.rmSteps', label: 'Ray steps', group: 'rmView', type: 'range', min: 32, max: 220, step: 4, default: 96 },
  { key: 'cu.rmSharpen', label: 'Sharpen', group: 'rmView', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, format: pct },
];

export const CUADRO_PARAMS: ParamDef[] = [...CUADRO_RM_PARAMS, ...CUADRO_ROOM_PARAMS, ...CUADRO_INNER_PARAMS];
