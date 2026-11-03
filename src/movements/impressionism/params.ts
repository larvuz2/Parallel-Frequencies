import type { ModRoute, ModTarget, ParamDef, ParamGroup } from '../../core/types';
import { GROUND_TONES, PALETTES } from './palettes';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (v: number) => (v >= 10 ? `${Math.round(v)} s` : `${v.toFixed(2)} s`);
const noteName = (n: number) => {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[Math.round(n) % 12]}${Math.floor(Math.round(n) / 12) - 1}`;
};

export const IMPRESSIONISM_GROUPS: ParamGroup[] = [
  { id: 'composition', label: 'Composition', blurb: 'Where each note lands on the canvas.' },
  { id: 'brush', label: 'Brush', blurb: 'The hand: shape, bristles, pressure and movement of each stroke.' },
  { id: 'color', label: 'Paint & colour', blurb: 'Which pigment each note picks up, and how it behaves.', collapsed: true },
  { id: 'canvas', label: 'Canvas', blurb: 'The ground beneath the paint, and how the painting ages.', collapsed: true },
  { id: 'light', label: 'Light', blurb: 'Raking light across the relief of the paint.', collapsed: true },
  { id: 'atmosphere', label: 'Atmosphere', blurb: 'Air in front of the painting: drifting motes and veil.', collapsed: true },
  { id: 'touch', label: 'Touch', blurb: 'What happens when someone touches the screen.', collapsed: true },
];

export const IMPRESSIONISM_PARAMS: ParamDef[] = [
  /* ---------------- Composition ---------------- */
  {
    key: 'im.layout', label: 'Layout', group: 'composition', type: 'select', default: 'horizon',
    hint: 'How pitch and time are placed. Horizon: low notes are water below the horizon, high notes are sky. Focus: notes gather around a wandering point of attention. Pitch class: twelve vertical bands, one per note name. Score: the painting advances left → right like a score. Circle of fifths: harmony laid out radially. Scatter: free.',
    options: [
      { value: 'horizon', label: 'Horizon — sky & water' },
      { value: 'focus', label: 'Wandering focus' },
      { value: 'pitchclass', label: 'Pitch-class bands' },
      { value: 'score', label: 'Score — left to right' },
      { value: 'radial', label: 'Circle of fifths' },
      { value: 'scatter', label: 'Scatter' },
    ],
  },
  { key: 'im.horizon', label: 'Horizon line', group: 'composition', type: 'range', min: 0.15, max: 0.85, step: 0.01, default: 0.42, format: pct, hint: 'Height of the horizon. Notes below the horizon pitch become water, above become sky.' },
  { key: 'im.lowNote', label: 'Lowest note', group: 'composition', type: 'range', min: 21, max: 72, step: 1, default: 28, format: noteName, hint: 'Pitch mapped to the bottom of the canvas.' },
  { key: 'im.highNote', label: 'Highest note', group: 'composition', type: 'range', min: 60, max: 108, step: 1, default: 100, format: noteName, hint: 'Pitch mapped to the top of the canvas.' },
  { key: 'im.spread', label: 'Spread', group: 'composition', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4, format: pct, hint: 'How widely notes scatter around the painter’s point of attention.' },
  { key: 'im.wander', label: 'Focus wander', group: 'composition', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, format: pct, hint: 'How quickly the painter’s attention drifts across the canvas.' },
  { key: 'im.cluster', label: 'Chord cohesion', group: 'composition', type: 'range', min: 0, max: 1, step: 0.01, default: 0.6, format: pct, hint: 'Notes struck together are painted together: close by and in parallel, like a single gesture.' },
  { key: 'im.margin', label: 'Margin', group: 'composition', type: 'range', min: 0, max: 0.2, step: 0.005, default: 0.03, format: pct, hint: 'Keeps strokes away from the very edge of the canvas.' },
  { key: 'im.reflections', label: 'Water reflections', group: 'composition', type: 'toggle', default: true, hint: 'Sky strokes cast broken reflections in the water below the horizon (Horizon layout).' },
  { key: 'im.reflectAmt', label: 'Reflection strength', group: 'composition', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, format: pct, hint: 'Opacity of reflections.' },
  { key: 'im.ripple', label: 'Ripple break-up', group: 'composition', type: 'range', min: 0, max: 1, step: 0.01, default: 0.6, format: pct, hint: 'How much reflections are broken into horizontal dashes by ripples.' },

  /* ---------------- Brush ---------------- */
  {
    key: 'im.brush', label: 'Brush', group: 'brush', type: 'select', default: 'auto',
    hint: 'Auto chooses the brush by register: broad washes for the bass, filberts in the middle, small rounds and dabs in the treble.',
    options: [
      { value: 'auto', label: 'Auto — by register' },
      { value: 'flat', label: 'Flat' },
      { value: 'filbert', label: 'Filbert' },
      { value: 'round', label: 'Round' },
      { value: 'dab', label: 'Dab (tache)' },
      { value: 'fan', label: 'Fan' },
      { value: 'wash', label: 'Wash / scumble' },
    ],
  },
  { key: 'im.size', label: 'Size', group: 'brush', type: 'range', min: 0.002, max: 0.06, step: 0.0005, default: 0.018, format: (v) => `${(v * 200).toFixed(1)}`, hint: 'Base brush width (relative to canvas height). Velocity, pitch and density modulate it — see Mapping.' },
  { key: 'im.sizeVar', label: 'Size variation', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: pct, hint: 'Random variation in brush width between strokes.' },
  { key: 'im.speed', label: 'Stroke speed', group: 'brush', type: 'range', min: 0.01, max: 1.2, step: 0.005, default: 0.12, format: (v) => v.toFixed(2), hint: 'How fast the brush travels while a key is held. Longer notes → longer strokes.' },
  { key: 'im.minLen', label: 'Minimum length', group: 'brush', type: 'range', min: 0, max: 0.2, step: 0.002, default: 0.03, format: pct, hint: 'Even the shortest staccato leaves at least this much of a mark.' },
  { key: 'im.lift', label: 'Lift-off', group: 'brush', type: 'range', min: 0.02, max: 1.2, step: 0.01, default: 0.22, format: sec, hint: 'After a key is released, how long the brush takes to lift from the canvas — the feathered tail.' },
  { key: 'im.strokes', label: 'Strokes per note', group: 'brush', type: 'range', min: 1, max: 6, step: 1, default: 1, hint: 'Each note lays this many parallel strokes.' },
  { key: 'im.bristles', label: 'Bristles', group: 'brush', type: 'range', min: 3, max: 64, step: 1, default: 24, hint: 'Number of hair streaks across the brush.' },
  { key: 'im.bristleContrast', label: 'Bristle texture', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.7, format: pct, hint: 'How strongly individual hair marks and furrows read.' },
  { key: 'im.edgeRough', label: 'Ragged edges', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, format: pct, hint: 'Irregularity of the stroke edges.' },
  { key: 'im.load', label: 'Paint load', group: 'brush', type: 'range', min: 0.2, max: 2.5, step: 0.01, default: 1, format: (v) => v.toFixed(2), hint: 'How much paint the brush carries. Low load → dry brush that breaks up on the canvas weave.' },
  { key: 'im.dryBrush', label: 'Dry-brush tooth', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.7, format: pct, hint: 'How much a drying brush catches only on the peaks of the canvas weave and old paint ridges.' },
  { key: 'im.curvature', label: 'Curvature', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, format: pct, hint: 'How much strokes arc and turn.' },
  { key: 'im.flowFollow', label: 'Follow the wind', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4, format: pct, hint: 'How strongly strokes bend along an invisible flowing field (harmonic tension amplifies this by default).' },
  { key: 'im.flowScale', label: 'Wind scale', group: 'brush', type: 'range', min: 0.2, max: 6, step: 0.05, default: 1.6, format: (v) => v.toFixed(2), hint: 'Size of the eddies in the flow field. Small = big gentle sweeps, large = busy swirls.' },
  { key: 'im.flowSpeed', label: 'Wind evolution', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.15, format: pct, hint: 'How fast the flow field changes over time.' },
  { key: 'im.horizontality', label: 'Horizontality', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.72, format: pct, hint: 'Tendency of strokes to lie flat — Monet’s water is made of horizontal dashes.' },
  { key: 'im.tremor', label: 'Hand tremor', group: 'brush', type: 'range', min: 0, max: 1, step: 0.01, default: 0.25, format: pct, hint: 'Small, living irregularities of a human hand.' },
  { key: 'im.restroke', label: 'Re-stroke held notes', group: 'brush', type: 'toggle', default: true, hint: 'When a held note runs the brush dry, it re-dips and hatches back beside the first stroke.' },

  /* ---------------- Paint & colour ---------------- */
  {
    key: 'im.palette', label: 'Palette', group: 'color', type: 'select', default: 'soleil-levant',
    hint: 'Pigments available to the painter, ordered dark → light. The highlighted last swatch is the accent used for the loudest notes.',
    options: PALETTES.map((p) => ({ value: p.id, label: p.label, swatches: [...p.colors, p.accent] })),
  },
  {
    key: 'im.colorMode', label: 'Colour from', group: 'color', type: 'select', default: 'register',
    hint: 'What chooses the colour of each stroke. Register: low = deep, high = light. Pitch class: each note name has its own colour (circle of fifths). Harmony: colours relative to the current bass note, so key changes recolour the painting. Velocity: soft = deep, loud = bright. Height: colour by position on canvas. Random: free.',
    options: [
      { value: 'register', label: 'Register (low → high)' },
      { value: 'pitchclass', label: 'Pitch class (fifths)' },
      { value: 'harmony', label: 'Harmony (relative to bass)' },
      { value: 'velocity', label: 'Velocity' },
      { value: 'height', label: 'Height on canvas' },
      { value: 'random', label: 'Random' },
    ],
  },
  { key: 'im.paletteShift', label: 'Palette shift', group: 'color', type: 'range', min: -1, max: 1, step: 0.01, default: 0, format: (v) => (v > 0 ? '+' : '') + v.toFixed(2), hint: 'Shifts every colour choice toward the darker or lighter end of the palette.' },
  { key: 'im.brokenColor', label: 'Broken colour', group: 'color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.55, format: pct, hint: 'Each brush is loaded with two neighbouring colours side by side, which mix optically in the eye instead of on the palette.' },
  { key: 'im.colorJitter', label: 'Colour jitter', group: 'color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.25, format: pct, hint: 'Small random shifts of hue and value from stroke to stroke.' },
  { key: 'im.pickup', label: 'Wet-on-wet', group: 'color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4, format: pct, hint: 'How much a stroke drags and mixes with wet paint beneath it.' },
  { key: 'im.opacity', label: 'Opacity', group: 'color', type: 'range', min: 0.05, max: 1, step: 0.01, default: 0.85, format: pct, hint: 'Base opacity of paint.' },
  { key: 'im.impasto', label: 'Impasto', group: 'color', type: 'range', min: 0, max: 2.5, step: 0.01, default: 0.8, format: (v) => v.toFixed(2), hint: 'Thickness of paint — how much relief each stroke leaves for the light to catch.' },
  { key: 'im.heightCarry', label: 'Layer build-up', group: 'color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.65, format: pct, hint: 'How much new paint builds on top of old relief rather than replacing it.' },
  { key: 'im.accentThreshold', label: 'Accent above', group: 'color', type: 'range', min: 0.5, max: 1.01, step: 0.01, default: 0.88, format: (v) => (v > 1 ? 'off' : pct(v)), hint: 'Notes louder than this velocity are painted in the accent colour and glow — like the red sun.' },
  { key: 'im.accentGlow', label: 'Accent glow', group: 'color', type: 'range', min: 0, max: 3, step: 0.01, default: 1.1, format: (v) => v.toFixed(2), hint: 'Luminous glow of accent strokes.' },
  { key: 'im.accentSize', label: 'Accent size', group: 'color', type: 'range', min: 0.5, max: 3, step: 0.01, default: 1.5, format: (v) => `${v.toFixed(2)}×`, hint: 'Accent strokes are this much larger.' },

  /* ---------------- Canvas ---------------- */
  {
    key: 'im.ground', label: 'Ground texture', group: 'canvas', type: 'select', default: 'linen',
    hint: 'The physical surface the paint is laid on. Dry brush catches on its tooth.',
    options: [
      { value: 'linen', label: 'Fine linen' },
      { value: 'coarse', label: 'Coarse canvas' },
      { value: 'paper', label: 'Cotton paper' },
      { value: 'gesso', label: 'Gesso panel' },
      { value: 'smooth', label: 'Smooth' },
    ],
  },
  {
    key: 'im.groundTone', label: 'Ground tone', group: 'canvas', type: 'select', default: 'grey-imprimatura',
    hint: 'Colour of the primed canvas. Impressionists often painted on pale toned grounds rather than pure white.',
    options: GROUND_TONES.map((g) => ({ value: g.id, label: g.label, swatches: [g.color] })),
  },
  { key: 'im.groundDensity', label: 'Weave density', group: 'canvas', type: 'range', min: 60, max: 700, step: 5, default: 260, hint: 'Threads per canvas height. On a very large screen, lower this so the weave stays visible.' },
  { key: 'im.groundRelief', label: 'Weave relief', group: 'canvas', type: 'range', min: 0, max: 1, step: 0.01, default: 0.2, format: pct, hint: 'How strongly the canvas weave is lit.' },
  { key: 'im.memory', label: 'Canvas memory', group: 'canvas', type: 'range', min: 10, max: 1200, step: 5, default: 300, format: (v) => (v >= 1200 ? '∞' : v >= 60 ? `${(v / 60).toFixed(1)} min` : `${v} s`), hint: 'Half-life of the painting. Strokes slowly dissolve after this long, so the painting keeps renewing itself. At maximum, nothing fades.' },
  {
    key: 'im.memoryMode', label: 'Fades into', group: 'canvas', type: 'select', default: 'ground',
    hint: 'What old paint dissolves into.',
    options: [
      { value: 'ground', label: 'Bare canvas' },
      { value: 'haze', label: 'Atmospheric haze' },
    ],
  },
  { key: 'im.dryTime', label: 'Drying time', group: 'canvas', type: 'range', min: 1, max: 120, step: 1, default: 14, format: sec, hint: 'How long paint stays wet: wet paint mixes, bleeds, drifts and smudges.' },
  { key: 'im.liquidity', label: 'Liquidity', group: 'canvas', type: 'range', min: 0, max: 1, step: 0.01, default: 0.2, format: pct, hint: 'Wet paint slowly drifts like water.' },
  { key: 'im.bleed', label: 'Bleed', group: 'canvas', type: 'range', min: 0, max: 1, step: 0.01, default: 0.15, format: pct, hint: 'Wet paint softens into its neighbours.' },

  /* ---------------- Light ---------------- */
  { key: 'im.lightAz', label: 'Light direction', group: 'light', type: 'range', min: 0, max: 360, step: 1, default: 135, format: (v) => `${Math.round(v)}°`, hint: 'Where the light comes from (0° = right, 90° = top).' },
  { key: 'im.lightEl', label: 'Light height', group: 'light', type: 'range', min: 4, max: 85, step: 1, default: 38, format: (v) => `${Math.round(v)}°`, hint: 'Low light rakes across the surface and reveals every ridge; high light flattens it.' },
  { key: 'im.relief', label: 'Relief', group: 'light', type: 'range', min: 0, max: 40, step: 0.5, default: 6, hint: 'Strength of the lit relief of paint and weave.' },
  { key: 'im.gloss', label: 'Gloss', group: 'light', type: 'range', min: 4, max: 200, step: 1, default: 45, hint: 'Tightness of oil highlights.' },
  { key: 'im.sheen', label: 'Oil sheen', group: 'light', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.22, format: pct, hint: 'Brightness of highlights on the paint — wet paint shines more.' },
  { key: 'im.ambient', label: 'Ambient', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.55, format: pct, hint: 'Soft, directionless light.' },
  { key: 'im.lightDrift', label: 'Sun movement', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.12, format: pct, hint: 'The light slowly travels, so the relief shifts like the day passing.' },
  { key: 'im.pointerLight', label: 'Pointer is the light', group: 'light', type: 'toggle', default: false, hint: 'Moving the pointer moves the light, raking across the paint.' },
  { key: 'im.shimmer', label: 'Shimmer', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.12, format: pct, hint: 'Light dances gently on the surface, like on water.' },
  { key: 'im.warmth', label: 'Warmth', group: 'light', type: 'range', min: -1, max: 1, step: 0.01, default: 0.1, format: (v) => (v > 0 ? '+' : '') + v.toFixed(2), hint: 'Colour temperature of the light.' },

  /* ---------------- Atmosphere ---------------- */
  { key: 'im.atmosphere', label: 'Atmosphere', group: 'atmosphere', type: 'toggle', default: true, hint: 'Tiny motes of light drifting in front of the canvas — a living painting.' },
  {
    key: 'im.moteTone', label: 'Mote tone', group: 'atmosphere', type: 'select', default: 'auto',
    hint: 'Glowing motes of light read on dark grounds; on pale canvases fine drifting dust reads better. Auto picks by the ground tone.',
    options: [
      { value: 'auto', label: 'Auto (by ground)' },
      { value: 'light', label: 'Glowing light' },
      { value: 'dust', label: 'Drifting dust' },
    ],
  },
  { key: 'im.motes', label: 'Motes', group: 'atmosphere', type: 'range', min: 0, max: 12000, step: 100, default: 2600, hint: 'Number of drifting particles.' },
  { key: 'im.moteSize', label: 'Mote size', group: 'atmosphere', type: 'range', min: 0.2, max: 5, step: 0.05, default: 1.1, format: (v) => v.toFixed(2) },
  { key: 'im.moteDrift', label: 'Drift', group: 'atmosphere', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, format: pct, hint: 'Speed of the drifting air.' },
  { key: 'im.moteGlow', label: 'Glow', group: 'atmosphere', type: 'range', min: 0, max: 2, step: 0.01, default: 0.55, format: pct },
  { key: 'im.moteReact', label: 'Music reactivity', group: 'atmosphere', type: 'range', min: 0, max: 1, step: 0.01, default: 0.6, format: pct, hint: 'How much the air stirs and brightens with loudness and onsets.' },
  { key: 'im.haze', label: 'Veil', group: 'atmosphere', type: 'range', min: 0, max: 0.6, step: 0.005, default: 0.06, format: pct, hint: 'A soft atmospheric veil over everything — Monet’s “envelope” of air.' },
  { key: 'im.breath', label: 'Breathing', group: 'atmosphere', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, format: pct, hint: 'Very slow luminous breathing of the whole canvas.' },

  /* ---------------- Touch ---------------- */
  { key: 'im.touch', label: 'Smudge with touch', group: 'touch', type: 'toggle', default: true, hint: 'Dragging across the canvas smears wet paint like a finger in oils. Dry paint resists.' },
  { key: 'im.touchRadius', label: 'Finger size', group: 'touch', type: 'range', min: 0.01, max: 0.2, step: 0.005, default: 0.045, format: pct },
  { key: 'im.touchStrength', label: 'Smudge strength', group: 'touch', type: 'range', min: 0, max: 2, step: 0.01, default: 0.9, format: pct },
  { key: 'im.touchPaint', label: 'Touch paints', group: 'touch', type: 'toggle', default: false, hint: 'Instead of smudging, dragging lays a new stroke in the current palette — lets visitors paint along.' },
];

/** Per-stroke and global properties the Mapping matrix can drive. */
export const IMPRESSIONISM_TARGETS: ModTarget[] = [
  { id: 'size', label: 'Brush size', hint: 'Width of the stroke.' },
  { id: 'length', label: 'Stroke length', hint: 'Speed of travel → how far the brush goes.' },
  { id: 'opacity', label: 'Opacity', hint: 'How covering the paint is.' },
  { id: 'impasto', label: 'Impasto', hint: 'Paint thickness / relief.' },
  { id: 'load', label: 'Paint load', hint: 'More load = solid paint, less = dry brush.' },
  { id: 'value', label: 'Lightness', hint: 'Shifts the colour toward light or dark in the palette.' },
  { id: 'jitter', label: 'Colour jitter', hint: 'Random hue/value variation.' },
  { id: 'curvature', label: 'Curvature', hint: 'Arc of the stroke.' },
  { id: 'turbulence', label: 'Turbulence', hint: 'How strongly the flow field bends strokes.' },
  { id: 'wetness', label: 'Wet blending', hint: 'Wet-on-wet pickup of paint beneath.' },
  { id: 'spread', label: 'Spread', hint: 'How far from the focus a note lands.' },
  { id: 'lift', label: 'Lift-off', hint: 'Length of the feathered tail.' },
  { id: 'glow', label: 'Glow', hint: 'Luminous emission of the stroke.' },
  { id: 'atmosphere', label: 'Atmosphere', hint: 'Brightness and stirring of the drifting motes.' },
  { id: 'veil', label: 'Veil', hint: 'Thickness of the atmospheric veil.' },
];

export const IMPRESSIONISM_ROUTES: ModRoute[] = [
  { source: 'velocity', target: 'size', amount: 0.5 },
  { source: 'velocity', target: 'impasto', amount: 0.6 },
  { source: 'velocity', target: 'opacity', amount: 0.3 },
  { source: 'pitch', target: 'size', amount: -0.3 },
  { source: 'duration', target: 'length', amount: 0.4 },
  { source: 'density', target: 'size', amount: -0.3 },
  { source: 'tension', target: 'turbulence', amount: 0.5 },
  { source: 'pedal', target: 'wetness', amount: 0.7 },
  { source: 'soft', target: 'opacity', amount: -0.5 },
  { source: 'modwheel', target: 'curvature', amount: 1 },
  { source: 'loudness', target: 'atmosphere', amount: 0.7 },
  { source: 'interval', target: 'spread', amount: 0.5 },
];
