import type { ModRoute, ModTarget, ParamDef, ParamGroup } from '../../core/types';
import { VISION_PALETTES } from './palettes';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (v: number) => (v >= 10 ? `${Math.round(v)} s` : `${v.toFixed(2)} s`);
const x2 = (v: number) => v.toFixed(2);

export const VISION_CAMERA = [
  { value: 'reveal', label: 'Close-up → reveal', hint: 'Plunges into the newest burst of colour, then slowly withdraws to show the whole vision.' },
  { value: 'track', label: 'Follow the light', hint: 'Stays close to the newest note, circling it.' },
  { value: 'breathe', label: 'Breathing with dynamics', hint: 'Close and intimate when soft, vast when loud.' },
  { value: 'orbit', label: 'Slow orbit', hint: 'A calm orbit around the vision.' },
  { value: 'flythrough', label: 'Drift through', hint: 'Floats through the particle cloud itself.' },
  { value: 'phrase', label: 'Phrase cuts', hint: 'A new composed view at every phrase ending.' },
  { value: 'still', label: 'Still', hint: 'A fixed view. Drag to turn it.' },
];

export const VISION_SHAPES = [
  { value: 'auto', label: 'Auto — changes with the music' },
  { value: 'eye', label: 'The eye — Redon' },
  { value: 'flower', label: 'The flower' },
  { value: 'halo', label: 'Halo — vers la flamme' },
  { value: 'galaxy', label: 'Galaxy — Poem of Ecstasy' },
  { value: 'knot', label: 'Mystic knot' },
  { value: 'nebula', label: 'Nebula — pure dissolution' },
];

export const SYMBOLISM_GROUPS: ParamGroup[] = [
  { id: 'camera', label: 'Camera', blurb: 'How the eye travels through the vision.' },
  { id: 'vision', label: 'Vision', blurb: 'The form the particles dream into, and how it dissolves.' },
  { id: 'notes', label: 'Notes', blurb: 'What each note does to the cloud: bursts, vortices, colour.' },
  { id: 'particles', label: 'Particles', blurb: 'The cloud itself: count, size, flow and trails.', collapsed: true },
  { id: 'color', label: 'Colour & space', blurb: 'Synaesthesia, palette and the space around the vision.', collapsed: true },
];

export const SYMBOLISM_PARAMS: ParamDef[] = [
  /* camera */
  {
    key: 'sy.camera', label: 'Camera move', group: 'camera', type: 'select', default: 'reveal',
    hint: 'Keys 1–7 switch moves live. ' + VISION_CAMERA.map((m, i) => `${i + 1} ${m.label}: ${m.hint}`).join(' '),
    options: VISION_CAMERA.map((m) => ({ value: m.value, label: m.label })),
  },
  { key: 'sy.camSpeed', label: 'Camera pace', group: 'camera', type: 'range', min: 0.1, max: 3, step: 0.01, default: 0.7, format: (v) => `${x2(v)}×` },
  { key: 'sy.closeness', label: 'Close-up distance', group: 'camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.7, format: pct },
  { key: 'sy.revealTime', label: 'Reveal duration', group: 'camera', type: 'range', min: 5, max: 120, step: 1, default: 30, format: sec },
  { key: 'sy.handheld', label: 'Floating', group: 'camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: pct },
  { key: 'sy.fov', label: 'Lens', group: 'camera', type: 'range', min: 20, max: 90, step: 1, default: 45, format: (v) => `${Math.round(v)}°` },
  { key: 'sy.phraseGap', label: 'Phrase pause', group: 'camera', type: 'range', min: 0.3, max: 3, step: 0.05, default: 0.9, format: sec },

  /* vision */
  { key: 'sy.shape', label: 'Vision', group: 'vision', type: 'select', default: 'auto', options: VISION_SHAPES, hint: 'The form the particles are drawn into. Auto moves to a new vision at strong phrase endings and key changes.' },
  { key: 'sy.cycle', label: 'Auto change after', group: 'vision', type: 'range', min: 5, max: 180, step: 1, default: 40, format: sec, hint: 'In Auto, the shortest time a vision is held.' },
  { key: 'sy.coherence', label: 'Coherence', group: 'vision', type: 'range', min: 0, max: 4, step: 0.01, default: 2.4, format: x2, hint: 'How strongly particles are drawn into the vision. Low = dreamy and loose.' },
  { key: 'sy.dissolve', label: 'Dissolution', group: 'vision', type: 'range', min: 0, max: 1, step: 0.01, default: 0.45, format: pct, hint: 'How much harmonic tension dissolves the vision into smoke; consonance gathers it again.' },
  { key: 'sy.morphTime', label: 'Metamorphosis', group: 'vision', type: 'range', min: 0.5, max: 20, step: 0.1, default: 5, format: sec, hint: 'Time to transform from one vision into the next.' },
  { key: 'sy.size', label: 'Scale', group: 'vision', type: 'range', min: 0.4, max: 2, step: 0.01, default: 1, format: (v) => `${x2(v)}×` },
  { key: 'sy.spin', label: 'Rotation', group: 'vision', type: 'range', min: -1, max: 1, step: 0.01, default: 0.08, format: x2 },
  { key: 'sy.petals', label: 'Petals', group: 'vision', type: 'range', min: 3, max: 12, step: 1, default: 6 },
  { key: 'sy.knotQ', label: 'Knot windings', group: 'vision', type: 'range', min: 3, max: 11, step: 1, default: 5, hint: 'Windings of the mystic knot. In Auto it follows the harmony.' },

  /* notes */
  { key: 'sy.burst', label: 'Burst', group: 'notes', type: 'range', min: 0, max: 4, step: 0.01, default: 1.4, format: x2, hint: 'How violently each note scatters the particles around it.' },
  { key: 'sy.radius', label: 'Burst radius', group: 'notes', type: 'range', min: 0.1, max: 2, step: 0.01, default: 0.6, format: x2 },
  { key: 'sy.vortex', label: 'Held-note vortex', group: 'notes', type: 'range', min: 0, max: 4, step: 0.01, default: 1.2, format: x2, hint: 'While a note is held it spins the cloud around it.' },
  { key: 'sy.dye', label: 'Colour dye', group: 'notes', type: 'range', min: 0, max: 2, step: 0.01, default: 1, format: x2, hint: 'How strongly a note dyes the particles it touches.' },
  { key: 'sy.colorFade', label: 'Colour memory', group: 'notes', type: 'range', min: 0.2, max: 30, step: 0.1, default: 6, format: sec, hint: 'How long dyed particles keep the note’s colour.' },
  { key: 'sy.decay', label: 'Note afterglow', group: 'notes', type: 'range', min: 0.1, max: 6, step: 0.05, default: 1.2, format: sec },
  {
    key: 'sy.place', label: 'Notes land', group: 'notes', type: 'select', default: 'sphere',
    hint: 'Where notes act. Sphere: pitch is height, pitch class is angle around the vision. Centre: every note blooms from the heart.',
    options: [
      { value: 'sphere', label: 'Around the vision (pitch → height)' },
      { value: 'centre', label: 'From the centre' },
      { value: 'random', label: 'Anywhere' },
    ],
  },

  /* particles */
  {
    key: 'sy.count', label: 'Particles', group: 'particles', type: 'select', default: '256',
    hint: 'Number of simulated particles. 1 million needs a strong GPU.',
    options: [
      { value: '128', label: '16 thousand' },
      { value: '256', label: '65 thousand' },
      { value: '512', label: '262 thousand' },
      { value: '1024', label: '1 million' },
    ],
  },
  { key: 'sy.pointSize', label: 'Particle size', group: 'particles', type: 'range', min: 0.2, max: 4, step: 0.01, default: 1.2, format: x2 },
  { key: 'sy.bright', label: 'Brightness', group: 'particles', type: 'range', min: 0.1, max: 4, step: 0.01, default: 1, format: x2 },
  { key: 'sy.flow', label: 'Turbulence', group: 'particles', type: 'range', min: 0, max: 4, step: 0.01, default: 0.7, format: x2, hint: 'Strength of the invisible currents (curl noise).' },
  { key: 'sy.flowScale', label: 'Current size', group: 'particles', type: 'range', min: 0.1, max: 3, step: 0.01, default: 0.7, format: x2 },
  { key: 'sy.flowSpeed', label: 'Current speed', group: 'particles', type: 'range', min: 0, max: 1, step: 0.01, default: 0.12, format: x2 },
  { key: 'sy.damping', label: 'Air resistance', group: 'particles', type: 'range', min: 0.1, max: 8, step: 0.01, default: 2.2, format: x2 },
  { key: 'sy.trails', label: 'Trails', group: 'particles', type: 'range', min: 0, max: 0.97, step: 0.01, default: 0.75, format: pct, hint: 'How much of each frame lingers into the next — luminous streaks. The pedal lengthens them.' },
  { key: 'sy.sparkle', label: 'Sparkle', group: 'particles', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, format: pct },

  /* colour */
  { key: 'sy.palette', label: 'Palette', group: 'color', type: 'select', default: 'prometheus', options: VISION_PALETTES.map((p) => ({ value: p.id, label: p.label, swatches: p.rest })) },
  {
    key: 'sy.colorFrom', label: 'Note colours', group: 'color', type: 'select', default: 'palette',
    hint: 'Scriabin: every pitch class has its colour from his clavier à lumières. Palette: the palette’s own accents, by register.',
    options: [
      { value: 'palette', label: 'As the palette suggests' },
      { value: 'scriabin', label: 'Scriabin’s colour keyboard' },
      { value: 'register', label: 'Palette, by register' },
    ],
  },
  { key: 'sy.keyTint', label: 'Key colour', group: 'color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: pct, hint: 'The whole vision takes on the Scriabin colour of the current key.' },
  {
    key: 'sy.background', label: 'Space', group: 'color', type: 'select', default: 'auto',
    options: [
      { value: 'auto', label: 'Suggested by palette' },
      { value: 'nebula', label: 'Nebula', swatches: ['#0a0614', '#3b1d6e'] },
      { value: 'void', label: 'Void', swatches: ['#030305'] },
      { value: 'paper', label: 'Toned paper (ink)', swatches: ['#dcd2be'] },
      { value: 'dawn', label: 'Pastel dawn', swatches: ['#eedad6', '#bccde6'] },
    ],
  },
  { key: 'sy.fog', label: 'Nebula glow', group: 'color', type: 'range', min: 0, max: 3, step: 0.01, default: 1, format: x2 },
];

export const SYMBOLISM_TARGETS: ModTarget[] = [
  { id: 'burst', label: 'Burst', hint: 'Force of each note’s explosion.' },
  { id: 'radius', label: 'Burst radius', hint: 'Reach of each note.' },
  { id: 'vortex', label: 'Vortex', hint: 'Spin of held notes.' },
  { id: 'coherence', label: 'Coherence', hint: 'How firmly the vision holds its form.' },
  { id: 'flow', label: 'Turbulence', hint: 'Strength of the currents.' },
  { id: 'dye', label: 'Colour dye', hint: 'How strongly notes recolour particles.' },
  { id: 'bright', label: 'Brightness', hint: 'Overall luminosity.' },
  { id: 'trails', label: 'Trails', hint: 'Persistence of light streaks.' },
  { id: 'scale', label: 'Scale', hint: 'Size of the vision.' },
  { id: 'camera', label: 'Camera energy', hint: 'How lively the camera moves.' },
  { id: 'closeup', label: 'Camera distance', hint: 'Pushes the camera in (negative) or out (positive).' },
];

export const SYMBOLISM_ROUTES: ModRoute[] = [
  { source: 'velocity', target: 'burst', amount: 0.7 },
  { source: 'velocity', target: 'radius', amount: 0.35 },
  { source: 'duration', target: 'vortex', amount: 0.5 },
  { source: 'tension', target: 'flow', amount: 0.9 },
  { source: 'loudness', target: 'bright', amount: 0.5 },
  { source: 'loudness', target: 'scale', amount: 0.15 },
  { source: 'pedal', target: 'trails', amount: 0.25 },
  { source: 'loudness', target: 'closeup', amount: 0.3 },
  { source: 'density', target: 'camera', amount: 0.4 },
];
