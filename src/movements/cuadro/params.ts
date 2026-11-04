import type { ParamDef, ParamGroup, ParamValue } from '../../core/types';
import { VITRINE_GROUPS, VITRINE_PARAMS } from '../vitrine/params';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const x2 = (v: number) => v.toFixed(2);
const x3 = (v: number) => v.toFixed(3);

/** The look of the reference: a navy, snaking body flecked with amber, membranes, webs and dust. */
const LOOK: Record<string, ParamValue> = {
  // shape
  radius: 0.9, width: 2.05, height: 0.72, depth: 0.85, lobes: 0.95, lobeScale: 1.45, folds: 0.3, foldScale: 0.8, warp: 0.6,
  bend: 0.24, bendFreq: 1.7, breathe: 1, evolve: 0.02,
  // strands: short and fine, so the skin reads as a grainy, sparkling surface
  strands: '65536', matterColor: '#3f55b0', albedo: 0.26, toneVar: 0.7, strandWidth: 1.7, strandLength: 0.1, contour: 0.3, sweep: 1.4, thickness: 0.18,
  // smoke & dust
  smokeStrands: 0.12, smokeOpacity: 0.16, smokeColor: '#28324c', smokeTint: 0.3, warmShare: 0.06, smokeLength: 1.5, smokeWidth: 0.7, frontFade: 0.9,
  dotOpacity: 0.14, dotSize: 0.7, wisps: 0.25, wispReach: 0.5,
  webs: 60, webOpacity: 0.22, webColor: '#b8c8ff',
  // light & colour
  palette: 'nocturne', veinA: '#ff9a3c', veinB: '#7aa0ff', veinC: '#9fb8ff', veinShare: 0.025, crestGlow: 0.35, veinThreshold: 0.9,
  patch: 0.8, patchScale: 2.1, patchCover: 0.25, cells: 0.55, cellScale: 9,
  key: 1.1, keyColor: '#c4d4ff', rim: 1.9, rimColor: '#b4c6ff', ambient: 0.35, sheen: 0.45,
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
  { id: 'room', label: 'Room & painting', blurb: 'The wall, the frame and how the living painting hangs in the room.' },
  ...VITRINE_GROUPS.filter((g) => !HIDDEN_GROUPS.has(g.id)),
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
  { key: 'cu.glass', label: 'Glass reflection', group: 'room', type: 'range', min: 0, max: 0.4, step: 0.005, default: 0.04, format: pct, hint: 'A faint sheen across the painting, as if behind glass.' },
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

export const CUADRO_PARAMS: ParamDef[] = [...CUADRO_ROOM_PARAMS, ...CUADRO_INNER_PARAMS];
