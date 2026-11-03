import type { ParamDef, ParamGroup } from './types';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Parameters shared by every movement: input, finishing (post-processing) and quality. */
export const ENGINE_GROUPS: ParamGroup[] = [
  { id: 'post', label: 'Finishing', blurb: 'Lens and grade applied to the whole image.', collapsed: true },
  { id: 'quality', label: 'Performance', blurb: 'Resolution and limits — lower these on slower machines.', collapsed: true },
];

export const ENGINE_PARAMS: ParamDef[] = [
  /* ---------------- source (rendered in the Source panel) ---------------- */
  { key: 'src.monitor', label: 'Hear live input', group: 'source', type: 'toggle', default: false, hidden: true, hint: 'Play the piano sound for live MIDI / computer-keyboard input. Leave off when your keyboard makes its own sound.' },
  { key: 'src.volume', label: 'Volume', group: 'source', type: 'range', min: 0, max: 1, step: 0.01, default: 0.8, hidden: true },
  { key: 'src.keyboard', label: 'Computer keyboard', group: 'source', type: 'toggle', default: false, hidden: true, hint: 'Play with the computer keyboard: A W S E D F T G Y H U J K — Z / X shift octave. Shortcuts then need Shift.' },
  { key: 'src.pedalSustain', label: 'Pedal sustains strokes', group: 'source', type: 'toggle', default: true, hidden: true, hint: 'With the sustain pedal down, released notes keep painting until the pedal lifts.' },
  { key: 'src.idle', label: 'Dream when idle', group: 'source', type: 'toggle', default: false, hidden: true, hint: 'If nobody plays for a while, the canvas starts painting by itself (the built-in Debussy-style reverie). Live playing takes over instantly.' },
  { key: 'src.idleSound', label: 'Dream with sound', group: 'source', type: 'toggle', default: false, hidden: true, hint: 'Whether the idle dream is audible, or paints in silence.' },
  { key: 'src.idleAfter', label: 'Idle after', group: 'source', type: 'range', min: 10, max: 600, step: 5, default: 90, hidden: true, format: (v) => `${v} s` },
  {
    key: 'src.instrument', label: 'Instrument', group: 'source', type: 'select', default: 'piano', hidden: true,
    options: [
      { value: 'piano', label: 'Grand piano (sampled)' },
      { value: 'soft', label: 'Soft synth' },
    ],
  },

  /* ---------------- finishing ---------------- */
  { key: 'post.bloom', label: 'Bloom', group: 'post', type: 'range', min: 0, max: 3, step: 0.01, default: 0.45, format: (v) => v.toFixed(2), hint: 'Soft glow around bright light — the accent sun, highlights, motes.' },
  { key: 'post.bloomThreshold', label: 'Bloom threshold', group: 'post', type: 'range', min: 0, max: 1.5, step: 0.01, default: 0.72, format: (v) => v.toFixed(2), hint: 'Only light brighter than this glows.' },
  { key: 'post.bloomRadius', label: 'Bloom radius', group: 'post', type: 'range', min: 0, max: 1, step: 0.01, default: 0.7, format: pct },
  { key: 'post.vignette', label: 'Vignette', group: 'post', type: 'range', min: 0, max: 1, step: 0.01, default: 0.32, format: pct, hint: 'Gentle darkening toward the edges.' },
  { key: 'post.grain', label: 'Film grain', group: 'post', type: 'range', min: 0, max: 0.4, step: 0.005, default: 0.05, format: pct },
  { key: 'post.exposure', label: 'Exposure', group: 'post', type: 'range', min: 0.3, max: 2.5, step: 0.01, default: 1, format: (v) => v.toFixed(2) },
  { key: 'post.saturation', label: 'Saturation', group: 'post', type: 'range', min: 0, max: 2, step: 0.01, default: 1, format: pct },
  { key: 'post.contrast', label: 'Contrast', group: 'post', type: 'range', min: 0.5, max: 1.6, step: 0.01, default: 1, format: pct },
  {
    key: 'post.tonemap', label: 'Tone mapping', group: 'post', type: 'select', default: 'linear',
    hint: 'Linear keeps the palette exact. Neutral / AgX / ACES roll off bright highlights more filmically.',
    options: [
      { value: 'linear', label: 'Linear — faithful palette' },
      { value: 'neutral', label: 'Neutral (Khronos)' },
      { value: 'agx', label: 'AgX — filmic' },
      { value: 'aces', label: 'ACES — cinematic' },
    ],
  },
  { key: 'post.drift', label: '3D drift', group: 'post', type: 'range', min: 0, max: 1, step: 0.01, default: 0.2, format: pct, hint: 'The canvas floats very slightly in 3D space with the camera, giving depth to the motes in front of it.' },

  /* ---------------- quality ---------------- */
  { key: 'quality.pixelRatio', label: 'Render scale', group: 'quality', type: 'range', min: 0.5, max: 2, step: 0.05, default: 1, format: (v) => `${v.toFixed(2)}×`, hint: 'Screen pixels rendered per CSS pixel. 1× is plenty on most displays; on 4K screens 0.75 is often indistinguishable.' },
  { key: 'quality.paintRes', label: 'Paint resolution', group: 'quality', type: 'range', min: 0.35, max: 1.5, step: 0.05, default: 1, format: pct, hint: 'Resolution of the painting surface relative to the screen.' },
  { key: 'quality.maxStrokes', label: 'Max live strokes', group: 'quality', type: 'range', min: 32, max: 1024, step: 16, default: 384, hint: 'Upper bound on brushes painting at once.' },
  { key: 'quality.fps', label: 'Show stats', group: 'quality', type: 'toggle', default: false },
];
