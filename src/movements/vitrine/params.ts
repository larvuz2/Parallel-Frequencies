import type { ModRoute, ModTarget, ParamDef, ParamGroup } from '../../core/types';
import { VEIN_PALETTES, WOODS } from './palettes';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const x2 = (v: number) => v.toFixed(2);
const x3 = (v: number) => v.toFixed(3);
const sec = (v: number) => (v >= 10 ? `${Math.round(v)} s` : `${v.toFixed(2)} s`);
const deg = (v: number) => `${Math.round(v)}°`;

export const VITRINE_CAMERA = [
  { value: 'gallery', label: 'Gallery — the vitrine in frame' },
  { value: 'orbit', label: 'Slow orbit' },
  { value: 'reveal', label: 'Close-up → reveal' },
  { value: 'track', label: 'Follow the notes' },
  { value: 'breathe', label: 'Breathing with dynamics' },
  { value: 'phrase', label: 'Phrase cuts' },
  { value: 'still', label: 'Still three-quarter' },
];

export const VITRINE_GROUPS: ParamGroup[] = [
  { id: 'scene', label: 'Scene & camera', blurb: 'The walnut vitrine, the floor and how we look at it.' },
  { id: 'growth', label: 'Growth', blurb: 'The mass starts empty and accumulates with the music.' },
  { id: 'form', label: 'Form', blurb: 'The crumpled shape the matter settles into.' },
  { id: 'flow', label: 'Flow', blurb: 'How the fibres travel across and away from the surface.', collapsed: true },
  { id: 'fibres', label: 'Fibres', blurb: 'Count, length and density of the combed strands.', collapsed: true },
  { id: 'light', label: 'Light', blurb: 'The soft key light, rim and fibre sheen.', collapsed: true },
  { id: 'glow', label: 'Veins of light', blurb: 'Luminous colour along the folds and where notes land.', collapsed: true },
];

export const VITRINE_PARAMS: ParamDef[] = [
  /* scene */
  { key: 'vt.camera', label: 'Camera', group: 'scene', type: 'select', default: 'gallery', options: VITRINE_CAMERA, hint: 'Keys 1–7 switch live. Gallery keeps the whole vitrine in frame with a slow breathing sway.' },
  { key: 'vt.camSpeed', label: 'Camera pace', group: 'scene', type: 'range', min: 0.1, max: 3, step: 0.01, default: 0.6, format: (v) => `${x2(v)}×` },
  { key: 'vt.sway', label: 'Sway', group: 'scene', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.4, format: pct },
  { key: 'vt.fov', label: 'Lens', group: 'scene', type: 'range', min: 12, max: 70, step: 1, default: 21, format: deg },
  { key: 'vt.frame', label: 'Wooden frame', group: 'scene', type: 'toggle', default: true },
  { key: 'vt.wood', label: 'Wood', group: 'scene', type: 'select', default: 'walnut', options: WOODS.map((w) => ({ value: w.id, label: w.label, swatches: [w.base, w.light] })) },
  { key: 'vt.floor', label: 'Floor', group: 'scene', type: 'toggle', default: true },
  { key: 'vt.woodLight', label: 'Light on the wood', group: 'scene', type: 'range', min: 0, max: 3, step: 0.01, default: 0.9, format: x2 },
  { key: 'vt.keyAz', label: 'Light direction', group: 'scene', type: 'range', min: -180, max: 180, step: 1, default: -35, format: deg },
  { key: 'vt.keyEl', label: 'Light height', group: 'scene', type: 'range', min: 5, max: 85, step: 1, default: 50, format: deg },

  /* growth */
  { key: 'vt.accumulate', label: 'Grow with the music', group: 'growth', type: 'toggle', default: true, hint: 'Off: the whole mass is there from the start.' },
  { key: 'vt.startFill', label: 'Starting amount', group: 'growth', type: 'range', min: 0, max: 1, step: 0.005, default: 0.03, format: pct },
  { key: 'vt.perNote', label: 'Matter per note', group: 'growth', type: 'range', min: 0, max: 0.05, step: 0.0001, default: 0.0006, format: (v) => `${(v * 100).toFixed(2)}%`, hint: 'How much of the mass each note releases (louder notes release more).' },
  { key: 'vt.scatter', label: 'Scatter', group: 'growth', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: pct, hint: 'Share of new matter that appears anywhere on the form, rather than where the note lands.' },
  { key: 'vt.idleGrowth', label: 'Slow growth', group: 'growth', type: 'range', min: 0, max: 0.05, step: 0.0005, default: 0.001, format: (v) => `${(v * 100).toFixed(2)}%/s` },
  { key: 'vt.dissolve', label: 'Dissolve in silence', group: 'growth', type: 'toggle', default: true },
  { key: 'vt.silentAfter', label: 'Silence before dissolving', group: 'growth', type: 'range', min: 5, max: 300, step: 1, default: 45, format: sec },
  { key: 'vt.dissolveRate', label: 'Dissolve speed', group: 'growth', type: 'range', min: 0, max: 0.05, step: 0.0001, default: 0.0006, format: (v) => `${(v * 100).toFixed(2)}%/s` },

  /* form */
  { key: 'vt.radius', label: 'Size', group: 'form', type: 'range', min: 0.5, max: 1.8, step: 0.01, default: 1.38, format: x2 },
  { key: 'vt.width', label: 'Width', group: 'form', type: 'range', min: 0.8, max: 1.8, step: 0.01, default: 1.05, format: (v) => `${x2(v)}×` },
  { key: 'vt.folds', label: 'Crumple', group: 'form', type: 'range', min: 0, max: 1.2, step: 0.01, default: 0.45, format: x2, hint: 'Depth of the folds. Loudness deepens them (see Mapping).' },
  { key: 'vt.foldScale', label: 'Fold size', group: 'form', type: 'range', min: 0.3, max: 2.5, step: 0.01, default: 1.2, format: x2, hint: 'Small values: a few large folds. Large values: many small creases.' },
  { key: 'vt.warp', label: 'Twist of folds', group: 'form', type: 'range', min: 0, max: 2, step: 0.01, default: 0.9, format: x2 },
  { key: 'vt.evolve', label: 'Slow change', group: 'form', type: 'range', min: 0, max: 0.2, step: 0.001, default: 0.025, format: x3, hint: 'How fast the folds slowly reshape themselves.' },
  { key: 'vt.thickness', label: 'Depth of matter', group: 'form', type: 'range', min: 0.02, max: 0.6, step: 0.01, default: 0.22, format: x2, hint: 'How many layers deep the fibres sit below the surface.' },
  { key: 'vt.wisps', label: 'Smoke', group: 'form', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.28, format: pct, hint: 'Share of particles that drift free as translucent smoke.' },
  { key: 'vt.wispReach', label: 'Smoke reach', group: 'form', type: 'range', min: 0, max: 2, step: 0.01, default: 0.85, format: x2 },

  { key: 'vt.body', label: 'Solid body', group: 'form', type: 'toggle', default: true, hint: 'The continuous body of the matter. Off: particles only.' },
  { key: 'vt.streaks', label: 'Combed texture', group: 'form', type: 'range', min: 0, max: 2, step: 0.01, default: 1, format: x2, hint: 'Strength of the fibrous, combed relief on the body.' },

  { key: 'vt.strandDensity', label: 'Strand density', group: 'form', type: 'range', min: 5, max: 200, step: 1, default: 34, hint: 'How many combed strands run along the folds.' },

  /* flow */
  { key: 'vt.flow', label: 'Flow', group: 'flow', type: 'range', min: 0, max: 2, step: 0.01, default: 0.12, format: x2, hint: 'Speed of the fibres travelling across the surface.' },
  { key: 'vt.flowScale', label: 'Flow pattern', group: 'flow', type: 'range', min: 0.2, max: 4, step: 0.01, default: 1.5, format: x2 },
  { key: 'vt.stick', label: 'Cohesion', group: 'flow', type: 'range', min: 0.5, max: 20, step: 0.1, default: 4, format: (v) => v.toFixed(1), hint: 'How firmly the fibres hold to the form.' },
  { key: 'vt.damping', label: 'Viscosity', group: 'flow', type: 'range', min: 0.2, max: 8, step: 0.01, default: 2.6, format: x2 },

  /* fibres */
  {
    key: 'vt.count', label: 'Particles', group: 'fibres', type: 'select', default: '512',
    options: [
      { value: '256', label: '65 thousand' },
      { value: '512', label: '262 thousand' },
      { value: '724', label: '524 thousand' },
      { value: '1024', label: '1 million' },
    ],
    hint: 'More particles: finer, denser fabric (needs a stronger GPU).',
  },
  { key: 'vt.fibreLength', label: 'Fibre length', group: 'fibres', type: 'range', min: 0.005, max: 0.2, step: 0.001, default: 0.05, format: x3 },
  { key: 'vt.fibreOpacity', label: 'Loose fibres', group: 'fibres', type: 'range', min: 0, max: 1, step: 0.01, default: 0.08, format: pct },
  { key: 'vt.dotOpacity', label: 'Dust & smoke', group: 'fibres', type: 'range', min: 0, max: 1, step: 0.01, default: 0.45, format: pct, hint: 'Fine particle dots between the strands.' },
  { key: 'vt.dotSize', label: 'Dust size', group: 'fibres', type: 'range', min: 0.2, max: 4, step: 0.01, default: 1, format: x2 },

  {
    key: 'vt.strands', label: 'Strands', group: 'fibres', type: 'select', default: '65536',
    hint: 'Real strand geometry combed along the folds. More strands: a denser, finer fabric (and more GPU work).',
    options: [
      { value: '0', label: 'Off' },
      { value: '16384', label: '16 thousand' },
      { value: '32768', label: '33 thousand' },
      { value: '65536', label: '65 thousand' },
      { value: '131072', label: '131 thousand' },
    ],
  },
  { key: 'vt.strandWidth', label: 'Strand width', group: 'fibres', type: 'range', min: 0.5, max: 8, step: 0.05, default: 3.6, format: (v) => `${x2(v)} px` },
  { key: 'vt.strandLength', label: 'Strand length', group: 'fibres', type: 'range', min: 0.1, max: 2, step: 0.01, default: 0.7, format: x2 },
  { key: 'vt.contour', label: 'Follow the folds', group: 'fibres', type: 'range', min: 0, max: 2, step: 0.01, default: 0.7, format: x2, hint: 'How much strands bend to run along the folds rather than straight across them.' },
  { key: 'vt.sweep', label: 'Comb waviness', group: 'fibres', type: 'range', min: 0, max: 2, step: 0.01, default: 0.9, format: x2, hint: 'How much the overall combing direction wanders across the form.' },
  { key: 'vt.veinShare', label: 'Glowing strands', group: 'glow', type: 'range', min: 0, max: 0.6, step: 0.005, default: 0.17, format: pct, hint: 'Share of strands that carry light along the fold crests.' },
  { key: 'vt.gloss', label: 'Strand gloss', group: 'light', type: 'range', min: 4, max: 120, step: 1, default: 36 },

  /* light */
  { key: 'vt.key', label: 'Key light', group: 'light', type: 'range', min: 0, max: 3, step: 0.01, default: 0.95, format: x2 },
  { key: 'vt.ambient', label: 'Ambient', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: x2 },
  { key: 'vt.rim', label: 'Rim light', group: 'light', type: 'range', min: 0, max: 2, step: 0.01, default: 0.6, format: x2 },
  { key: 'vt.albedo', label: 'Matter tone', group: 'light', type: 'range', min: 0.05, max: 0.8, step: 0.01, default: 0.12, format: x2, hint: 'Grey value of the matter itself.' },
  { key: 'vt.sheen', label: 'Fibre sheen', group: 'light', type: 'range', min: 0, max: 2, step: 0.01, default: 0.3, format: x2, hint: 'Hair-like highlights along the combed strands.' },

  /* glow */
  { key: 'vt.palette', label: 'Vein colours', group: 'glow', type: 'select', default: 'reference', options: VEIN_PALETTES.map((p) => ({ value: p.id, label: p.label, swatches: [p.a, p.b, p.c] })) },
  { key: 'vt.crestGlow', label: 'Fold glow', group: 'glow', type: 'range', min: 0, max: 3, step: 0.01, default: 0.75, format: x2, hint: 'Light that always runs along the fold crests.' },
  { key: 'vt.noteGlow', label: 'Note glow', group: 'glow', type: 'range', min: 0, max: 4, step: 0.01, default: 0.45, format: x2, hint: 'Light that notes kindle where they land (bass coral, middle lavender, treble cyan).' },
  { key: 'vt.glowRadius', label: 'Note reach', group: 'glow', type: 'range', min: 0.1, max: 1.5, step: 0.01, default: 0.5, format: x2 },
  { key: 'vt.glowDecay', label: 'Glow afterlife', group: 'glow', type: 'range', min: 0.2, max: 10, step: 0.05, default: 1.8, format: sec },
  { key: 'vt.swell', label: 'Swell', group: 'glow', type: 'range', min: 0, max: 3, step: 0.01, default: 0.35, format: x2, hint: 'Notes push the surface outward where they land.' },
];

export const VITRINE_TARGETS: ModTarget[] = [
  { id: 'folds', label: 'Crumple', hint: 'Depth of the folds.' },
  { id: 'flow', label: 'Flow', hint: 'Speed of the fibres.' },
  { id: 'evolve', label: 'Slow change', hint: 'How fast the form reshapes.' },
  { id: 'wisps', label: 'Smoke', hint: 'Share of particles escaping as smoke.' },
  { id: 'glow', label: 'Note glow', hint: 'Brightness of kindled veins.' },
  { id: 'glowRadius', label: 'Note reach', hint: 'Size of each kindled area.' },
  { id: 'swell', label: 'Swell', hint: 'Push of each note on the surface.' },
  { id: 'growth', label: 'Growth', hint: 'Matter released per note.' },
  { id: 'light', label: 'Key light', hint: 'Brightness of the matter.' },
  { id: 'camera', label: 'Camera energy', hint: 'Liveliness of the moving cameras.' },
];

export const VITRINE_ROUTES: ModRoute[] = [
  { source: 'velocity', target: 'glow', amount: 0.5 },
  { source: 'velocity', target: 'swell', amount: 0.5 },
  { source: 'velocity', target: 'growth', amount: 0.5 },
  { source: 'loudness', target: 'folds', amount: 0.2 },
  { source: 'density', target: 'flow', amount: 0.6 },
  { source: 'tension', target: 'wisps', amount: 0.35 },
  { source: 'tension', target: 'evolve', amount: 0.8 },
  { source: 'loudness', target: 'light', amount: 0.25 },
];
