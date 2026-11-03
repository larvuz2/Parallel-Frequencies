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
  { id: 'camera', label: 'Camera', blurb: 'How we look at the vitrine.' },
  { id: 'shape', label: 'Shape', blurb: 'Size, proportions and the folds and lobes of the mass.' },
  { id: 'strands', label: 'Strands', blurb: 'The combed fibres that make up the surface of the matter.' },
  { id: 'smoke', label: 'Smoke', blurb: 'Strands peeling off the edges and drifting away as smoke.' },
  { id: 'veins', label: 'Veins of light', blurb: 'Glowing strands along the folds, and where the notes land.' },
  { id: 'lighting', label: 'Lighting', blurb: 'Key light, rim and the highlights on the fibres.', collapsed: true },
  { id: 'frame', label: 'Vitrine frame', blurb: 'The wooden box: size, beams and wood finish.', collapsed: true },
  { id: 'stage', label: 'Stage', blurb: 'Background, floor, spotlight and the darkness around.', collapsed: true },
  { id: 'growth', label: 'Growth', blurb: 'The mass starts empty and accumulates with the music.', collapsed: true },
  { id: 'body', label: 'Body (advanced)', blurb: 'The solid surface underneath the strands.', collapsed: true },
  { id: 'particles', label: 'Particles (advanced)', blurb: 'The GPU particle layer: loose fibres, dust and its flow.', collapsed: true },
];

const BASE_PARAMS: ParamDef[] = [
  /* scene */
  { key: 'vt.camera', label: 'Camera', group: 'scene', type: 'select', default: 'gallery', options: VITRINE_CAMERA, hint: 'Keys 1–7 switch live. Gallery keeps the whole vitrine in frame with a slow breathing sway.' },
  { key: 'vt.camSpeed', label: 'Camera pace', group: 'scene', type: 'range', min: 0.1, max: 3, step: 0.01, default: 0.6, format: (v) => `${x2(v)}×` },
  { key: 'vt.sway', label: 'Sway', group: 'scene', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.4, format: pct },
  { key: 'vt.fov', label: 'Lens', group: 'scene', type: 'range', min: 12, max: 70, step: 1, default: 21, format: deg },
  { key: 'vt.frame', label: 'Wooden frame', group: 'scene', type: 'toggle', default: true },
  { key: 'vt.wood', label: 'Procedural wood colour', group: 'scene', type: 'select', default: 'walnut', options: WOODS.map((w) => ({ value: w.id, label: w.label, swatches: [w.base, w.light] })) },
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
  { key: 'vt.radius', label: 'Size', group: 'form', type: 'range', min: 0.5, max: 1.8, step: 0.01, default: 1.1, format: x2 },
  { key: 'vt.width', label: 'Width', group: 'form', type: 'range', min: 0.8, max: 1.8, step: 0.01, default: 1.05, format: (v) => `${x2(v)}×` },
  { key: 'vt.folds', label: 'Crumple', group: 'form', type: 'range', min: 0, max: 1.2, step: 0.01, default: 0.45, format: x2, hint: 'Depth of the folds. Loudness deepens them (see Mapping).' },
  { key: 'vt.lobes', label: 'Lobes', group: 'form', type: 'range', min: 0, max: 1.5, step: 0.01, default: 1.1, format: x2, hint: 'Large billowing lobes that break the round silhouette. 0 = a ball.' },
  { key: 'vt.breathe', label: 'Breathing', group: 'form', type: 'range', min: 0, max: 2, step: 0.01, default: 1, format: x2, hint: 'The whole mass expands a little with loudness and slowly breathes.' },
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
  { key: 'vt.dotOpacity', label: 'Dust & smoke', group: 'fibres', type: 'range', min: 0, max: 1, step: 0.01, default: 0.12, format: pct, hint: 'Fine particle dots between the strands.' },
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

  { key: 'vt.smokeStrands', label: 'Smoke strands', group: 'form', type: 'range', min: 0, max: 0.4, step: 0.005, default: 0.1, format: pct, hint: 'Share of strands (in some regions) that peel off the surface and drift away as combed smoke.' },
  { key: 'vt.smokeLength', label: 'Smoke reach', group: 'form', type: 'range', min: 0.5, max: 6, step: 0.05, default: 1.7, format: x2 },
  { key: 'vt.smokeLift', label: 'Smoke lift', group: 'form', type: 'range', min: 0, max: 2, step: 0.01, default: 0.7, format: x2, hint: 'How steeply smoke leaves the surface.' },
  { key: 'vt.smokeCurl', label: 'Smoke curl', group: 'form', type: 'range', min: 0, max: 3, step: 0.01, default: 1.1, format: x2 },
  { key: 'vt.smokeOpacity', label: 'Smoke opacity', group: 'form', type: 'range', min: 0, max: 1, step: 0.01, default: 0.16, format: pct },

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

const NEW_PARAMS: ParamDef[] = [
  /* camera */
  { key: 'vt.zoom', label: 'Distance', group: 'camera', type: 'range', min: 0.4, max: 2.5, step: 0.01, default: 1, format: (v) => `${x2(v)}×`, hint: 'Gallery view: how far the camera stands (scroll also zooms).' },
  { key: 'vt.camHeight', label: 'Eye height', group: 'camera', type: 'range', min: -0.5, max: 0.9, step: 0.01, default: 0.03, format: x2, hint: 'Gallery view: look from below, level, or from above.' },

  /* shape */
  { key: 'vt.height', label: 'Height', group: 'shape', type: 'range', min: 0.6, max: 1.6, step: 0.01, default: 1, format: (v) => `${x2(v)}×` },
  { key: 'vt.depth', label: 'Depth', group: 'shape', type: 'range', min: 0.6, max: 1.6, step: 0.01, default: 1, format: (v) => `${x2(v)}×` },
  { key: 'vt.lobeScale', label: 'Lobe size', group: 'shape', type: 'range', min: 0.3, max: 2.5, step: 0.01, default: 1, format: x2, hint: 'Small: a few huge lobes. Large: many smaller ones.' },
  { key: 'vt.offsetY', label: 'Vertical position', group: 'shape', type: 'range', min: -1, max: 1, step: 0.01, default: 0, format: x2 },
  { key: 'vt.spin', label: 'Rotation', group: 'shape', type: 'range', min: -0.4, max: 0.4, step: 0.005, default: 0, format: (v) => `${v.toFixed(3)} rad/s`, hint: 'Slowly turns the whole mass.' },

  { key: 'vt.bend', label: 'Snake / twist', group: 'shape', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0, format: x2, hint: 'Bends the mass into a twisting, snaking body along its length.' },
  { key: 'vt.bendFreq', label: 'Twist frequency', group: 'shape', type: 'range', min: 0.2, max: 3, step: 0.01, default: 1, format: x2 },

  /* strands */
  { key: 'vt.matterColor', label: 'Matter colour', group: 'strands', type: 'color', default: '#ffffff', hint: 'Tints the strands and body. White keeps the neutral grey.' },
  { key: 'vt.toneVar', label: 'Tone variation', group: 'strands', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4, format: pct, hint: 'How much individual strands differ in brightness.' },

  /* smoke */
  { key: 'vt.smokeColor', label: 'Smoke colour', group: 'smoke', type: 'color', default: '#33363b' },
  { key: 'vt.smokeTint', label: 'Vein tint in smoke', group: 'smoke', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, format: pct, hint: 'How much the smoke takes on the vein colours.' },
  { key: 'vt.warmShare', label: 'Warm threads', group: 'smoke', type: 'range', min: 0, max: 1, step: 0.01, default: 0.15, format: pct, hint: 'Share of smoke tinted with the first (warm) vein colour; the rest uses the cool ones.' },
  { key: 'vt.smokeWidth', label: 'Smoke width', group: 'smoke', type: 'range', min: 0.2, max: 4, step: 0.01, default: 1, format: (v) => `${x2(v)}×` },
  { key: 'vt.smokeBright', label: 'Smoke brightness', group: 'smoke', type: 'range', min: 0, max: 3, step: 0.01, default: 1, format: x2 },
  { key: 'vt.frontFade', label: 'Hide smoke in front', group: 'smoke', type: 'range', min: 0, max: 1, step: 0.01, default: 0.85, format: pct, hint: 'Keeps smoke from veiling the front of the mass, so it reads mainly at the edges.' },

  /* veins */
  { key: 'vt.veinA', label: 'Vein colour — low', group: 'veins', type: 'color', default: '#ff6a55', hint: 'Choosing a palette sets these three; you can then adjust each one.' },
  { key: 'vt.veinB', label: 'Vein colour — middle', group: 'veins', type: 'color', default: '#b39bff' },
  { key: 'vt.veinC', label: 'Vein colour — high', group: 'veins', type: 'color', default: '#5fe2e4' },
  { key: 'vt.veinThreshold', label: 'Vein threshold', group: 'veins', type: 'range', min: 0.5, max: 0.98, step: 0.005, default: 0.86, format: x3, hint: 'Lower: veins spread further from the fold crests.' },
  { key: 'vt.pulse', label: 'Vein pulse', group: 'veins', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4, format: pct, hint: 'Light slowly travelling along the glowing strands.' },

  { key: 'vt.patch', label: 'Ember patches', group: 'veins', type: 'range', min: 0, max: 3, step: 0.01, default: 0, format: x2, hint: 'Speckles of warm light (low vein colour) scattered over areas of the skin.' },
  { key: 'vt.patchScale', label: 'Patch size', group: 'veins', type: 'range', min: 0.2, max: 4, step: 0.01, default: 1.2, format: x2, hint: 'Small values: a few large patches.' },
  { key: 'vt.patchCover', label: 'Patch coverage', group: 'veins', type: 'range', min: -0.6, max: 0.8, step: 0.01, default: 0.2, format: x2, hint: 'Lower: patches cover more of the skin.' },
  { key: 'vt.cells', label: 'Glowing membranes', group: 'veins', type: 'range', min: 0, max: 2, step: 0.01, default: 0, format: x2, hint: 'In some regions the skin opens into translucent cells glowing with the high vein colour.' },
  { key: 'vt.cellScale', label: 'Cell size', group: 'veins', type: 'range', min: 1, max: 20, step: 0.1, default: 6, format: (v) => v.toFixed(1), hint: 'Higher: smaller, denser cells.' },
  { key: 'vt.webs', label: 'Web threads', group: 'smoke', type: 'range', min: 0, max: 600, step: 1, default: 0, hint: 'Fine silk threads spun across the matter.' },
  { key: 'vt.webOpacity', label: 'Thread brightness', group: 'smoke', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.35, format: x2 },
  { key: 'vt.webColor', label: 'Thread colour', group: 'smoke', type: 'color', default: '#c0d0ff' },

  /* lighting */
  { key: 'vt.keyColor', label: 'Key light colour', group: 'lighting', type: 'color', default: '#ffffff' },
  { key: 'vt.rimColor', label: 'Rim colour', group: 'lighting', type: 'color', default: '#808ca6' },

  /* frame */
  {
    key: 'vt.woodTexture', label: 'Wood texture', group: 'frame', type: 'select', default: 'walnut',
    hint: 'Photographic wood scans (generated with FLUX, made seamless, with a relief map so the grain catches the light). Procedural uses the Wood colour below.',
    options: [
      { value: 'walnut', label: 'American walnut', swatches: ['#4a2a1a', '#7a4428'] },
      { value: 'oak', label: 'Smoked oak', swatches: ['#6b5a4a', '#9a8670'] },
      { value: 'whiteoak', label: 'Quarter-sawn white oak', swatches: ['#d8bb92', '#c79b62'] },
      { value: 'ash', label: 'Pale ash', swatches: ['#efdcb5', '#dcc292'] },
      { value: 'cherry', label: 'American cherry', swatches: ['#b9683a', '#d98a52'] },
      { value: 'teak', label: 'Golden teak', swatches: ['#c98a45', '#e0a860'] },
      { value: 'zebrano', label: 'Zebrano', swatches: ['#e2c28f', '#a8642c'] },
      { value: 'wenge', label: 'Wenge', swatches: ['#2a1a12', '#7a3e22'] },
      { value: 'ebony', label: 'Macassar ebony', swatches: ['#120c08', '#8a4a20'] },
      { value: 'charred', label: 'Charred cedar (shou sugi ban)', swatches: ['#1a1a1a', '#5a5a5a'] },
      { value: 'reclaimed', label: 'Weathered reclaimed oak', swatches: ['#8a8680', '#b0aca4'] },
      { value: 'procedural', label: 'Procedural (Wood colour)' },
    ],
  },
  { key: 'vt.woodRelief', label: 'Grain relief', group: 'frame', type: 'range', min: 0, max: 3, step: 0.01, default: 1, format: x2, hint: 'Depth of the pores and grain in the light.' },
  { key: 'vt.woodTint', label: 'Wood tint', group: 'frame', type: 'color', default: '#ffffff', hint: 'Multiplies the wood colour. White = natural wood.' },
  { key: 'vt.frameW', label: 'Width', group: 'frame', type: 'range', min: 2.5, max: 10, step: 0.05, default: 5.6, format: x2 },
  { key: 'vt.frameH', label: 'Height', group: 'frame', type: 'range', min: 1.5, max: 6, step: 0.05, default: 2.9, format: x2 },
  { key: 'vt.frameD', label: 'Depth', group: 'frame', type: 'range', min: 0.6, max: 5, step: 0.05, default: 2, format: x2 },
  { key: 'vt.beam', label: 'Beam thickness', group: 'frame', type: 'range', min: 0.02, max: 0.35, step: 0.005, default: 0.11, format: x3 },
  { key: 'vt.woodRough', label: 'Wood roughness', group: 'frame', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, format: pct },
  { key: 'vt.woodCoat', label: 'Varnish', group: 'frame', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: pct },
  { key: 'vt.grain', label: 'Grain scale', group: 'frame', type: 'range', min: 0.3, max: 4, step: 0.01, default: 1, format: (v) => `${x2(v)}×` },

  /* stage */
  { key: 'vt.bgColor', label: 'Background', group: 'stage', type: 'color', default: '#000000' },
  { key: 'vt.floorColor', label: 'Floor colour', group: 'stage', type: 'color', default: '#0a0a0a' },
  { key: 'vt.floorRough', label: 'Floor roughness', group: 'stage', type: 'range', min: 0, max: 1, step: 0.01, default: 0.85, format: pct, hint: 'Lower: a polished floor that reflects the light.' },
  { key: 'vt.fogNear', label: 'Darkness starts', group: 'stage', type: 'range', min: 1, max: 30, step: 0.1, default: 7, format: x2, hint: 'Distance where the floor starts fading into the background.' },
  { key: 'vt.fogFar', label: 'Darkness complete', group: 'stage', type: 'range', min: 2, max: 60, step: 0.1, default: 16, format: x2 },
  { key: 'vt.spot', label: 'Spotlight', group: 'stage', type: 'range', min: 0, max: 3, step: 0.01, default: 1, format: x2, hint: 'Soft spotlight from above on the vitrine and floor.' },
  { key: 'vt.spotColor', label: 'Spotlight colour', group: 'stage', type: 'color', default: '#fff1e0' },
  { key: 'vt.spotAngle', label: 'Spotlight cone', group: 'stage', type: 'range', min: 10, max: 85, step: 1, default: 43, format: deg },
  { key: 'vt.env', label: 'Reflections', group: 'stage', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.25, format: x2, hint: 'Soft room reflections on the wood and floor.' },
];

const GROUP_OF: Record<string, string> = {
  'vt.camera': 'camera', 'vt.camSpeed': 'camera', 'vt.sway': 'camera', 'vt.fov': 'camera',
  'vt.frame': 'frame', 'vt.wood': 'frame', 'vt.woodLight': 'frame',
  'vt.floor': 'stage',
  'vt.keyAz': 'lighting', 'vt.keyEl': 'lighting', 'vt.key': 'lighting', 'vt.ambient': 'lighting', 'vt.rim': 'lighting', 'vt.sheen': 'lighting', 'vt.gloss': 'lighting',
  'vt.radius': 'shape', 'vt.width': 'shape', 'vt.lobes': 'shape', 'vt.folds': 'shape', 'vt.foldScale': 'shape', 'vt.warp': 'shape', 'vt.evolve': 'shape', 'vt.breathe': 'shape', 'vt.thickness': 'strands',
  'vt.strands': 'strands', 'vt.strandWidth': 'strands', 'vt.strandLength': 'strands', 'vt.contour': 'strands', 'vt.sweep': 'strands', 'vt.albedo': 'strands',
  'vt.smokeStrands': 'smoke', 'vt.smokeLength': 'smoke', 'vt.smokeLift': 'smoke', 'vt.smokeCurl': 'smoke', 'vt.smokeOpacity': 'smoke',
  'vt.palette': 'veins', 'vt.veinShare': 'veins', 'vt.crestGlow': 'veins', 'vt.noteGlow': 'veins', 'vt.glowRadius': 'veins', 'vt.glowDecay': 'veins', 'vt.swell': 'veins',
  'vt.body': 'body', 'vt.streaks': 'body', 'vt.strandDensity': 'body',
  'vt.count': 'particles', 'vt.flow': 'particles', 'vt.flowScale': 'particles', 'vt.stick': 'particles', 'vt.damping': 'particles',
  'vt.fibreLength': 'particles', 'vt.fibreOpacity': 'particles', 'vt.dotOpacity': 'particles', 'vt.dotSize': 'particles', 'vt.wisps': 'particles', 'vt.wispReach': 'particles',
};

/** Order inside each section: listed keys first (in this order), then the rest. */
const ORDER = [
  'vt.camera', 'vt.zoom', 'vt.camHeight', 'vt.fov', 'vt.camSpeed', 'vt.sway',
  'vt.radius', 'vt.width', 'vt.height', 'vt.depth', 'vt.lobes', 'vt.lobeScale', 'vt.bend', 'vt.bendFreq', 'vt.folds', 'vt.foldScale', 'vt.warp', 'vt.evolve', 'vt.breathe', 'vt.offsetY', 'vt.spin',
  'vt.strands', 'vt.matterColor', 'vt.albedo', 'vt.toneVar', 'vt.strandWidth', 'vt.strandLength', 'vt.contour', 'vt.sweep', 'vt.thickness',
  'vt.smokeStrands', 'vt.smokeOpacity', 'vt.smokeColor', 'vt.smokeTint', 'vt.warmShare', 'vt.smokeLength', 'vt.smokeLift', 'vt.smokeCurl', 'vt.smokeWidth', 'vt.smokeBright', 'vt.frontFade', 'vt.webs', 'vt.webOpacity', 'vt.webColor',
  'vt.palette', 'vt.veinA', 'vt.veinB', 'vt.veinC', 'vt.veinShare', 'vt.veinThreshold', 'vt.crestGlow', 'vt.pulse', 'vt.patch', 'vt.patchScale', 'vt.patchCover', 'vt.cells', 'vt.cellScale', 'vt.noteGlow', 'vt.glowRadius', 'vt.glowDecay', 'vt.swell',
  'vt.key', 'vt.keyColor', 'vt.keyAz', 'vt.keyEl', 'vt.ambient', 'vt.rim', 'vt.rimColor', 'vt.sheen', 'vt.gloss',
  'vt.frame', 'vt.woodTexture', 'vt.woodRelief', 'vt.wood', 'vt.woodTint', 'vt.frameW', 'vt.frameH', 'vt.frameD', 'vt.beam', 'vt.woodRough', 'vt.woodCoat', 'vt.grain', 'vt.woodLight',
  'vt.bgColor', 'vt.floor', 'vt.floorColor', 'vt.floorRough', 'vt.fogNear', 'vt.fogFar', 'vt.spot', 'vt.spotColor', 'vt.spotAngle', 'vt.env',
];

export const VITRINE_PARAMS: ParamDef[] = [...BASE_PARAMS, ...NEW_PARAMS]
  .map((d) => ({ ...d, group: GROUP_OF[d.key] ?? d.group }))
  .sort((a, b) => {
    const ia = ORDER.indexOf(a.key), ib = ORDER.indexOf(b.key);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  }) as ParamDef[];

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
