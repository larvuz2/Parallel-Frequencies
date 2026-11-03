import type { ModRoute, ModTarget, ParamDef, ParamGroup } from '../../core/types';
import { STIJL_BACKGROUNDS, STIJL_PALETTES } from './palettes';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (v: number) => (v >= 10 ? `${Math.round(v)} s` : `${v.toFixed(2)} s`);
const deg = (v: number) => `${Math.round(v)}°`;
const noteName = (n: number) => {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[Math.round(n) % 12]}${Math.floor(Math.round(n) / 12) - 1}`;
};

export const CAMERA_MODES = [
  { value: 'reveal', label: 'Close-up → reveal', hint: 'Starts grazing along the newest lines, then slowly pulls back to reveal the whole structure; returns to a new close-up on the next phrase.' },
  { value: 'follow', label: 'Follow the line', hint: 'A low tracking shot that glides alongside each new line as it is drawn.' },
  { value: 'flythrough', label: 'Fly through the grid', hint: 'The camera travels inside the lattice, along its corridors, turning at the crossings.' },
  { value: 'phrase', label: 'Phrase cuts', hint: 'Holds a classical axonometric view and glides to a new one at every phrase ending — like turning a drawing.' },
  { value: 'orbit', label: 'Slow orbit', hint: 'A calm orbit around the whole sculpture.' },
  { value: 'breathe', label: 'Breathing with dynamics', hint: 'Soft passages draw the camera close; loud and busy passages open it wide.' },
  { value: 'still', label: 'Still axonometric', hint: 'A fixed Van Doesburg-style axonometric drawing. Drag to turn it.' },
];

export const STIJL_GROUPS: ParamGroup[] = [
  { id: 'camera', label: 'Camera', blurb: 'How the eye travels through the structure while the music plays.' },
  { id: 'composition', label: 'Composition', blurb: 'The lattice the music builds on, and where each note lands.' },
  { id: 'form', label: 'Form & motion', blurb: 'What each note becomes: plane, block or line — and how it moves.', collapsed: true },
  { id: 'color', label: 'Colour & material', blurb: 'Primaries, whites and the surface of the forms.', collapsed: true },
  { id: 'light', label: 'Light & lens', blurb: 'Sun, shadow and the depth of field of the lens.', collapsed: true },
  { id: 'traffic', label: 'Boogie-woogie', blurb: 'Small blocks of colour running along the lines, like Broadway at night.', collapsed: true },
];

export const STIJL_PARAMS: ParamDef[] = [
  /* ---------------- Camera ---------------- */
  {
    key: 'ds.camera', label: 'Camera move', group: 'camera', type: 'select', default: 'reveal',
    hint: 'Keys 1–7 switch moves live. ' + CAMERA_MODES.map((m, i) => `${i + 1} ${m.label}: ${m.hint}`).join(' '),
    options: CAMERA_MODES.map((m) => ({ value: m.value, label: m.label })),
  },
  { key: 'ds.camSpeed', label: 'Camera pace', group: 'camera', type: 'range', min: 0.1, max: 3, step: 0.01, default: 1, format: (v) => `${v.toFixed(2)}×`, hint: 'Overall speed of every camera move. Lower = more stately.' },
  { key: 'ds.closeness', label: 'Close-up distance', group: 'camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.75, format: pct, hint: 'How intimately the close-ups approach the lines.' },
  { key: 'ds.revealTime', label: 'Reveal duration', group: 'camera', type: 'range', min: 5, max: 120, step: 1, default: 32, format: sec, hint: 'Time to pull back from a close-up to the full structure.' },
  { key: 'ds.handheld', label: 'Hand-held float', group: 'camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.25, format: pct, hint: 'A gentle, breathing drift — as if the camera were held.' },
  { key: 'ds.camReact', label: 'Music reactivity', group: 'camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, format: pct, hint: 'How much accents and cadences nudge the camera.' },
  {
    key: 'ds.projection', label: 'Projection', group: 'camera', type: 'select', default: 'auto',
    hint: 'Perspective gives depth to close-ups. Axonometric is the parallel projection of De Stijl architectural drawings. Auto chooses per camera move.',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'perspective', label: 'Perspective' },
      { value: 'axonometric', label: 'Axonometric (parallel)' },
    ],
  },
  { key: 'ds.fov', label: 'Lens', group: 'camera', type: 'range', min: 14, max: 80, step: 1, default: 34, format: (v) => `${Math.round(v)}°`, hint: 'Field of view. Wide lenses exaggerate depth in close-ups; long lenses flatten.' },
  { key: 'ds.phraseGap', label: 'Phrase pause', group: 'camera', type: 'range', min: 0.3, max: 3, step: 0.05, default: 0.8, format: sec, hint: 'A silence this long counts as the end of a phrase (camera cuts and new close-ups happen there).' },

  /* ---------------- Composition ---------------- */
  {
    key: 'ds.columns', label: 'Columns from', group: 'composition', type: 'select', default: 'fifths',
    hint: 'What chooses the horizontal position of a note. Circle of fifths keeps harmonically related notes as neighbours.',
    options: [
      { value: 'fifths', label: 'Circle of fifths' },
      { value: 'chromatic', label: 'Chromatic (C → B)' },
      { value: 'time', label: 'Time — a moving score' },
      { value: 'random', label: 'Free' },
    ],
  },
  {
    key: 'ds.layers', label: 'Depth from', group: 'composition', type: 'select', default: 'hands',
    hint: 'What chooses the depth layer. Hands: left hand (bass) at the back, right hand in front. Channel: each MIDI track has its own layer.',
    options: [
      { value: 'hands', label: 'Hands (bass behind)' },
      { value: 'channel', label: 'MIDI channel / track' },
      { value: 'velocity', label: 'Velocity (loud = front)' },
      { value: 'random', label: 'Free' },
    ],
  },
  { key: 'ds.lowNote', label: 'Lowest note', group: 'composition', type: 'range', min: 21, max: 60, step: 1, default: 33, format: noteName },
  { key: 'ds.highNote', label: 'Highest note', group: 'composition', type: 'range', min: 60, max: 108, step: 1, default: 96, format: noteName },
  { key: 'ds.gridX', label: 'Columns', group: 'composition', type: 'range', min: 4, max: 16, step: 1, default: 12 },
  { key: 'ds.gridY', label: 'Floors', group: 'composition', type: 'range', min: 3, max: 10, step: 1, default: 7 },
  { key: 'ds.gridZ', label: 'Depth layers', group: 'composition', type: 'range', min: 1, max: 7, step: 1, default: 4 },
  { key: 'ds.irregular', label: 'Asymmetry', group: 'composition', type: 'range', min: 0, max: 1, step: 0.01, default: 0.75, format: pct, hint: 'Regular grid at 0; Mondrian’s dynamic, unequal intervals at 1.' },
  { key: 'ds.balance', label: 'Classical balance', group: 'composition', type: 'range', min: 0, max: 1, step: 0.01, default: 0.2, format: pct, hint: 'Chance that a form is answered by its mirror image — Mozart’s symmetry of question and answer.' },
  { key: 'ds.seed', label: 'Lattice seed', group: 'composition', type: 'range', min: 1, max: 99, step: 1, default: 17, hint: 'Each seed is a different set of grid proportions.' },
  {
    key: 'ds.orientation', label: 'Orientation', group: 'composition', type: 'select', default: 'square',
    hint: 'Lozenge turns the whole structure 45°, like Mondrian’s diamond paintings.',
    options: [
      { value: 'square', label: 'Square' },
      { value: 'lozenge', label: 'Lozenge (45°)' },
    ],
  },

  /* ---------------- Form ---------------- */
  {
    key: 'ds.form', label: 'Forms', group: 'form', type: 'select', default: 'mixed',
    hint: 'Planes are thin coloured slabs; blocks are solid volumes; lines only draws the black grid.',
    options: [
      { value: 'mixed', label: 'Planes & blocks' },
      { value: 'planes', label: 'Planes' },
      { value: 'blocks', label: 'Blocks' },
      { value: 'lines', label: 'Lines only' },
    ],
  },
  { key: 'ds.thickness', label: 'Plane thickness', group: 'form', type: 'range', min: 0.02, max: 0.6, step: 0.01, default: 0.12, format: pct },
  { key: 'ds.span', label: 'Size', group: 'form', type: 'range', min: 1, max: 4, step: 0.05, default: 2.2, format: (v) => `${v.toFixed(1)} cells`, hint: 'Largest size of a form, in grid cells. Long and loud notes take the most room.' },
  { key: 'ds.relief', label: 'Key relief', group: 'form', type: 'range', min: 0, max: 2, step: 0.01, default: 0.7, format: pct, hint: 'While a note is held its form slides forward out of the grid, then settles back on release.' },
  { key: 'ds.attack', label: 'Snap', group: 'form', type: 'range', min: 0.05, max: 1.5, step: 0.01, default: 0.3, format: sec, hint: 'How fast a form opens.' },
  { key: 'ds.spring', label: 'Spring', group: 'form', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: pct, hint: 'Overshoot of the opening — 0 is perfectly composed, higher is lively.' },
  { key: 'ds.memory', label: 'Memory', group: 'form', type: 'range', min: 2, max: 300, step: 1, default: 45, format: (v) => (v >= 300 ? '∞' : sec(v)), hint: 'How long a form stays after its note ends. At maximum, nothing is forgotten.' },
  { key: 'ds.maxForms', label: 'Max forms', group: 'form', type: 'range', min: 30, max: 800, step: 10, default: 260, hint: 'The oldest forms retire when this is reached.' },
  { key: 'ds.lineWidth', label: 'Line weight', group: 'form', type: 'range', min: 0.01, max: 0.25, step: 0.005, default: 0.06, format: (v) => v.toFixed(3) },
  { key: 'ds.lineReach', label: 'Line reach', group: 'form', type: 'range', min: 0, max: 1, step: 0.01, default: 0.85, format: pct, hint: 'How far lines extend beyond their form. 1 = across the whole structure; low values give Mondrian’s early plus-minus marks.' },
  { key: 'ds.lineDraw', label: 'Line drawing speed', group: 'form', type: 'range', min: 0.2, max: 8, step: 0.05, default: 2.2, format: (v) => v.toFixed(2), hint: 'Lines draw themselves outward from each note.' },
  { key: 'ds.tutti', label: 'Cadence bounce', group: 'form', type: 'toggle', default: true, hint: 'A loud chord makes the whole structure breathe together.' },

  /* ---------------- Colour ---------------- */
  {
    key: 'ds.palette', label: 'Palette', group: 'color', type: 'select', default: 'classic',
    options: STIJL_PALETTES.map((p) => ({ value: p.id, label: p.label, swatches: [p.line, ...p.primaries, p.whites[0]] })),
    hint: 'First swatch is the line colour, then the primaries, then white.',
  },
  {
    key: 'ds.background', label: 'Background', group: 'color', type: 'select', default: 'auto',
    options: STIJL_BACKGROUNDS,
    hint: 'The space the sculpture floats in.',
  },
  {
    key: 'ds.colorMode', label: 'Colour from', group: 'color', type: 'select', default: 'equilibrium',
    hint: 'Equilibrium: each new colour is the one the composition lacks most — Mondrian’s balance. Harmony: tonic red, third yellow, fifth blue. Register: bass blue, middle red, treble yellow.',
    options: [
      { value: 'equilibrium', label: 'Equilibrium (Mondrian)' },
      { value: 'harmony', label: 'Harmony (tonic · third · fifth)' },
      { value: 'register', label: 'Register' },
      { value: 'pitchclass', label: 'Pitch class' },
      { value: 'velocity', label: 'Velocity' },
    ],
  },
  { key: 'ds.colorAmount', label: 'Colour amount', group: 'color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4, format: pct, hint: 'Share of forms in primaries — the rest are whites and greys.' },
  {
    key: 'ds.finish', label: 'Finish', group: 'color', type: 'select', default: 'gouache',
    options: [
      { value: 'gouache', label: 'Matte paint' },
      { value: 'enamel', label: 'Lacquered enamel' },
      { value: 'ceramic', label: 'Glazed ceramic' },
      { value: 'glass', label: 'Coloured glass' },
    ],
  },
  { key: 'ds.whiteVar', label: 'Many whites', group: 'color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, format: pct, hint: 'Mondrian painted many different whites. 0 = one white.' },
  { key: 'ds.glow', label: 'Held-note glow', group: 'color', type: 'range', min: 0, max: 3, step: 0.01, default: 0.25, format: (v) => v.toFixed(2) },

  /* ---------------- Light ---------------- */
  { key: 'ds.lightAz', label: 'Sun direction', group: 'light', type: 'range', min: 0, max: 360, step: 1, default: 215, format: deg },
  { key: 'ds.lightEl', label: 'Sun height', group: 'light', type: 'range', min: 8, max: 88, step: 1, default: 52, format: deg },
  { key: 'ds.sun', label: 'Sun strength', group: 'light', type: 'range', min: 0, max: 6, step: 0.05, default: 2.6, format: (v) => v.toFixed(2) },
  { key: 'ds.ambient', label: 'Ambient', group: 'light', type: 'range', min: 0, max: 2, step: 0.01, default: 0.8, format: (v) => v.toFixed(2) },
  { key: 'ds.shadow', label: 'Floor shadow', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.28, format: pct },
  { key: 'ds.dof', label: 'Depth of field', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.45, format: pct, hint: 'Lens blur outside the focus — strongest in close-ups. Focus follows the camera’s subject.' },
  { key: 'ds.fog', label: 'Aerial depth', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.25, format: pct, hint: 'Distant forms fade softly into the background.' },

  /* ---------------- Traffic ---------------- */
  { key: 'ds.traffic', label: 'Boogie-woogie traffic', group: 'traffic', type: 'toggle', default: true, hint: 'Every note sends a small block of colour running along a line.' },
  { key: 'ds.trafficSpeed', label: 'Speed', group: 'traffic', type: 'range', min: 0.2, max: 6, step: 0.05, default: 1.6, format: (v) => v.toFixed(2) },
  { key: 'ds.trafficSize', label: 'Size', group: 'traffic', type: 'range', min: 0.5, max: 4, step: 0.05, default: 1.5, format: (v) => `${v.toFixed(2)}×` },
  { key: 'ds.trafficLife', label: 'Lifetime', group: 'traffic', type: 'range', min: 0.3, max: 8, step: 0.05, default: 2.2, format: sec },
];

export const STIJL_TARGETS: ModTarget[] = [
  { id: 'size', label: 'Form size', hint: 'How many cells a form spans.' },
  { id: 'relief', label: 'Key relief', hint: 'How far a held form slides forward.' },
  { id: 'colour', label: 'Colour amount', hint: 'Chance a form is a primary rather than white.' },
  { id: 'weight', label: 'Line weight', hint: 'Thickness of the lines.' },
  { id: 'reach', label: 'Line reach', hint: 'How far lines extend.' },
  { id: 'snap', label: 'Snap', hint: 'Opening speed of forms (higher = slower).' },
  { id: 'traffic', label: 'Traffic', hint: 'Speed of the boogie-woogie blocks.' },
  { id: 'glow', label: 'Glow', hint: 'Light emitted by held forms.' },
  { id: 'camera', label: 'Camera energy', hint: 'How lively the camera moves.' },
  { id: 'closeup', label: 'Camera distance', hint: 'Pushes the camera in (negative) or out (positive).' },
];

export const STIJL_ROUTES: ModRoute[] = [
  { source: 'velocity', target: 'size', amount: 0.45 },
  { source: 'duration', target: 'size', amount: 0.5 },
  { source: 'velocity', target: 'relief', amount: 0.6 },
  { source: 'velocity', target: 'colour', amount: 0.5 },
  { source: 'velocity', target: 'weight', amount: 0.35 },
  { source: 'density', target: 'traffic', amount: 0.8 },
  { source: 'loudness', target: 'glow', amount: 0.6 },
  { source: 'loudness', target: 'closeup', amount: 0.35 },
  { source: 'tension', target: 'camera', amount: 0.5 },
  { source: 'soft', target: 'colour', amount: -0.5 },
  { source: 'modwheel', target: 'reach', amount: -0.8 },
];
