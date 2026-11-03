import type { ModRoute, ModTarget, ParamDef, ParamGroup } from '../../core/types';
import { BAROQUE_BACKGROUNDS, BAROQUE_PALETTES } from './palettes';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (v: number) => (v >= 10 ? `${Math.round(v)} s` : `${v.toFixed(2)} s`);
const deg = (v: number) => `${Math.round(v)}°`;

export const BAROQUE_CAMERA = [
  { value: 'reveal', label: 'Close-up → reveal', hint: 'Starts on the newest voice-light deep in the ornament, then slowly pulls back to reveal the whole architecture.' },
  { value: 'track', label: 'Follow a voice', hint: 'Stays close to the newest voice as it travels its spiral, circling it.' },
  { value: 'flythrough', label: 'Procession', hint: 'A slow processional walk through and around the architecture, turning at the crossings.' },
  { value: 'phrase', label: 'Phrase cuts', hint: 'A new composed view at every phrase ending (cadence).' },
  { value: 'orbit', label: 'Slow orbit', hint: 'A calm orbit around the whole.' },
  { value: 'breathe', label: 'Breathing with dynamics', hint: 'Close in soft passages, wide when the music swells.' },
  { value: 'still', label: 'Still', hint: 'A fixed view. Drag to turn it.' },
];

export const BAROQUE_GROUPS: ParamGroup[] = [
  { id: 'camera', label: 'Camera', blurb: 'How the eye moves through the chapel while the music plays.' },
  { id: 'architecture', label: 'Architecture', blurb: 'The fractal form, and how harmony reshapes it.' },
  { id: 'voices', label: 'Voices', blurb: 'Each contrapuntal voice is a light travelling its own spiral.', collapsed: true },
  { id: 'light', label: 'Chiaroscuro', blurb: 'The window light, its shadows, dust and darkness.', collapsed: true },
  { id: 'render', label: 'Render quality', blurb: 'Raymarching is costly — trade detail for frame rate here.', collapsed: true },
];

export const BAROQUE_PARAMS: ParamDef[] = [
  /* camera */
  {
    key: 'bq.camera', label: 'Camera move', group: 'camera', type: 'select', default: 'reveal',
    hint: 'Keys 1–7 switch moves live. ' + BAROQUE_CAMERA.map((m, i) => `${i + 1} ${m.label}: ${m.hint}`).join(' '),
    options: BAROQUE_CAMERA.map((m) => ({ value: m.value, label: m.label })),
  },
  { key: 'bq.camSpeed', label: 'Camera pace', group: 'camera', type: 'range', min: 0.1, max: 3, step: 0.01, default: 0.7, format: (v) => `${v.toFixed(2)}×` },
  { key: 'bq.closeness', label: 'Close-up distance', group: 'camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.7, format: pct },
  { key: 'bq.revealTime', label: 'Reveal duration', group: 'camera', type: 'range', min: 5, max: 120, step: 1, default: 36, format: sec },
  { key: 'bq.handheld', label: 'Hand-held float', group: 'camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.2, format: pct },
  { key: 'bq.fov', label: 'Lens', group: 'camera', type: 'range', min: 18, max: 80, step: 1, default: 40, format: deg },
  { key: 'bq.phraseGap', label: 'Phrase pause', group: 'camera', type: 'range', min: 0.3, max: 3, step: 0.05, default: 0.9, format: sec },

  /* architecture */
  {
    key: 'bq.form', label: 'Architecture', group: 'architecture', type: 'select', default: 'monstrance',
    hint: 'Monstrance: a golden sunburst whose rays grow with the dynamics. Baldacchino: a canopy on twisted Solomonic columns, after Bernini. Organ: a façade of pipe towers — every note lights the mouth of its pipe. Folded ornament / Fractal chambers: kaleidoscopic and Mandelbox fractals. Vault: gilded Apollonian domes.',
    options: [
      { value: 'monstrance', label: 'Monstrance — golden sunburst' },
      { value: 'ornament', label: 'Folded ornament — KIFS fractal' },
      { value: 'organ', label: 'Organ — the pipes speak' },
      { value: 'chambers', label: 'Fractal chambers — Mandelbox' },
      { value: 'vault', label: 'Vault — Apollonian domes' },
      { value: 'baldacchino', label: 'Baldacchino — Solomonic columns' },
    ],
  },
  { key: 'bq.detail', label: 'Ornament depth', group: 'architecture', type: 'range', min: 2, max: 12, step: 1, default: 5, hint: 'Fractal iterations — more is more intricate (and slower).' },
  { key: 'bq.twist', label: 'Ornament twist', group: 'architecture', type: 'range', min: 0, max: 1, step: 0.01, default: 0.22, format: pct, hint: 'Rotation inside each fold — from strict geometry (0) to swirling Baroque ornament.' },
  { key: 'bq.morph', label: 'Harmonic morph', group: 'architecture', type: 'range', min: 0, max: 1, step: 0.01, default: 0.55, format: pct, hint: 'How strongly key, harmony and tension reshape the architecture.' },
  { key: 'bq.morphTime', label: 'Morph slowness', group: 'architecture', type: 'range', min: 0.5, max: 30, step: 0.5, default: 7, format: sec, hint: 'Time the architecture takes to follow the harmony — Baroque gravitas.' },
  { key: 'bq.scale', label: 'Scale', group: 'architecture', type: 'range', min: 0.5, max: 2, step: 0.01, default: 1, format: (v) => `${v.toFixed(2)}×` },
  { key: 'bq.floor', label: 'Stone floor', group: 'architecture', type: 'toggle', default: true },
  {
    key: 'bq.material', label: 'Material', group: 'architecture', type: 'select', default: 'gilded',
    options: [
      { value: 'gilded', label: 'Gilded' },
      { value: 'bronze', label: 'Patinated bronze' },
      { value: 'marble', label: 'Polished marble' },
      { value: 'velvet', label: 'Velvet / plaster' },
      { value: 'obsidian', label: 'Obsidian' },
    ],
  },

  /* voices */
  {
    key: 'bq.voiceFrom', label: 'Voices from', group: 'voices', type: 'select', default: 'leading',
    hint: 'Voice leading: each note joins the voice whose last note is nearest — the way counterpoint is heard. Channel: one voice per MIDI track.',
    options: [
      { value: 'leading', label: 'Voice leading' },
      { value: 'channel', label: 'MIDI channel / track' },
      { value: 'register', label: 'Register bands' },
    ],
  },
  { key: 'bq.voices', label: 'Number of voices', group: 'voices', type: 'range', min: 1, max: 6, step: 1, default: 4, hint: 'Soprano, alto, tenor, bass…' },
  { key: 'bq.weave', label: 'Weave speed', group: 'voices', type: 'range', min: 0, max: 2, step: 0.01, default: 0.45, format: (v) => v.toFixed(2), hint: 'How fast the voices circle — they turn in alternating directions, crossing like counterpoint.' },
  { key: 'bq.spread', label: 'Spiral radius', group: 'voices', type: 'range', min: 0.2, max: 2, step: 0.01, default: 0.9, format: (v) => `${v.toFixed(2)}×` },
  { key: 'bq.lightPower', label: 'Light power', group: 'voices', type: 'range', min: 0, max: 8, step: 0.05, default: 2.6, format: (v) => v.toFixed(2) },
  { key: 'bq.lightSize', label: 'Light size', group: 'voices', type: 'range', min: 0.01, max: 0.3, step: 0.005, default: 0.07, format: (v) => v.toFixed(3) },
  { key: 'bq.reach', label: 'Light reach', group: 'voices', type: 'range', min: 0.1, max: 3, step: 0.01, default: 1, format: (v) => `${v.toFixed(2)}×`, hint: 'How far each candle illuminates the architecture.' },
  { key: 'bq.decay', label: 'Afterglow', group: 'voices', type: 'range', min: 0.1, max: 8, step: 0.05, default: 1.6, format: sec, hint: 'How long a light lingers after its note ends.' },
  { key: 'bq.trails', label: 'Golden trails', group: 'voices', type: 'toggle', default: true, hint: 'Each light leaves a trail of glowing dust along its path.' },
  { key: 'bq.trailDensity', label: 'Trail density', group: 'voices', type: 'range', min: 0, max: 3, step: 0.01, default: 1, format: (v) => `${v.toFixed(2)}×` },
  { key: 'bq.trailLife', label: 'Trail life', group: 'voices', type: 'range', min: 0.3, max: 12, step: 0.1, default: 4, format: sec },
  { key: 'bq.trailRise', label: 'Heat rise', group: 'voices', type: 'range', min: -0.5, max: 1, step: 0.01, default: 0.15, format: (v) => v.toFixed(2), hint: 'Dust drifts upward like candle smoke.' },

  /* light */
  { key: 'bq.palette', label: 'Palette', group: 'light', type: 'select', default: 'caravaggio', options: BAROQUE_PALETTES.map((p) => ({ value: p.id, label: p.label, swatches: [p.shade, p.lit, ...p.voices.slice(0, 4)] })) },
  { key: 'bq.background', label: 'Background', group: 'light', type: 'select', default: 'auto', options: BAROQUE_BACKGROUNDS },
  { key: 'bq.keyFollow', label: 'Light follows the viewer', group: 'light', type: 'toggle', default: true, hint: 'Keeps the window light raking in from the upper-left of the picture, whatever the camera does — Caravaggio’s constant. Off: the light is fixed in the room.' },
  { key: 'bq.keyAz', label: 'Window direction', group: 'light', type: 'range', min: 0, max: 360, step: 1, default: 140, format: deg },
  { key: 'bq.keyEl', label: 'Window height', group: 'light', type: 'range', min: 5, max: 85, step: 1, default: 48, format: deg },
  { key: 'bq.keyPower', label: 'Window light', group: 'light', type: 'range', min: 0, max: 6, step: 0.01, default: 3, format: (v) => v.toFixed(2), hint: 'At zero, the notes are the only light — candlelight in the dark.' },
  { key: 'bq.ambient', label: 'Fill', group: 'light', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.3, format: (v) => v.toFixed(2), hint: 'Light in the shadows. Caravaggio keeps it near zero.' },
  { key: 'bq.shadowSoft', label: 'Shadow softness', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.45, format: pct },
  { key: 'bq.ao', label: 'Occlusion', group: 'light', type: 'range', min: 0, max: 1, step: 0.01, default: 0.8, format: pct },
  { key: 'bq.godRays', label: 'God rays', group: 'light', type: 'range', min: 0, max: 2, step: 0.01, default: 0.7, format: (v) => v.toFixed(2), hint: 'Shafts of window light in the dusty air.' },
  { key: 'bq.fog', label: 'Dust in the air', group: 'light', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.35, format: (v) => v.toFixed(2) },
  { key: 'bq.flare', label: 'Cadence flare', group: 'light', type: 'range', min: 0, max: 3, step: 0.01, default: 1, format: (v) => v.toFixed(2), hint: 'Loud chords open the window — the light swells and recedes.' },

  /* render */
  { key: 'bq.resolution', label: 'March resolution', group: 'render', type: 'range', min: 0.2, max: 1, step: 0.05, default: 0.5, format: pct, hint: 'Pixels raymarched relative to the screen, then upscaled. 50% looks fine with bloom; raise it on a strong GPU.' },
  { key: 'bq.steps', label: 'Ray steps', group: 'render', type: 'range', min: 32, max: 220, step: 4, default: 110 },
  { key: 'bq.sharpen', label: 'Sharpen', group: 'render', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, format: pct },
];

export const BAROQUE_TARGETS: ModTarget[] = [
  { id: 'power', label: 'Light power', hint: 'Brightness of each note-light.' },
  { id: 'size', label: 'Light size', hint: 'Size of the glowing core.' },
  { id: 'trail', label: 'Trail density', hint: 'Dust emitted by moving lights.' },
  { id: 'morph', label: 'Architecture energy', hint: 'How far the fractal folds move from rest.' },
  { id: 'window', label: 'Window light', hint: 'Strength of the key light.' },
  { id: 'dust', label: 'Dust', hint: 'Density of the air.' },
  { id: 'weave', label: 'Weave speed', hint: 'How fast voices circle.' },
  { id: 'camera', label: 'Camera energy', hint: 'How lively the camera moves.' },
  { id: 'closeup', label: 'Camera distance', hint: 'Pushes the camera in (negative) or out (positive).' },
];

export const BAROQUE_ROUTES: ModRoute[] = [
  { source: 'velocity', target: 'power', amount: 0.6 },
  { source: 'velocity', target: 'size', amount: 0.4 },
  { source: 'density', target: 'trail', amount: 0.6 },
  { source: 'density', target: 'weave', amount: 0.5 },
  { source: 'tension', target: 'morph', amount: 0.7 },
  { source: 'loudness', target: 'window', amount: 0.4 },
  { source: 'pedal', target: 'dust', amount: 0.6 },
  { source: 'loudness', target: 'closeup', amount: 0.3 },
  { source: 'tension', target: 'camera', amount: 0.4 },
];
