import type { Preset } from '../../core/types';
import { veinPalette } from './palettes';

const BASE: Preset[] = [
  { id: 'reference', label: 'Living matter — walnut vitrine', description: 'Dark combed matter with coral, lavender and cyan veins, inside a walnut frame.', values: { 'vt.palette': 'reference', 'vt.wood': 'walnut', 'vt.camera': 'gallery' } },
  { id: 'ember', label: 'Ember', description: 'The veins run hot — coral and gold.', values: { 'vt.palette': 'ember', 'vt.wood': 'ebony', 'vt.crestGlow': 1.2, 'vt.noteGlow': 1.8 } },
  { id: 'glacier', label: 'Glacier', description: 'Pale matter with icy veins in a pale ash frame.', values: { 'vt.palette': 'glacier', 'vt.wood': 'ash', 'vt.albedo': 0.5, 'vt.key': 1.3 } },
  { id: 'orchid', label: 'Orchid', description: 'Pink and violet light in soft, slowly turning folds.', values: { 'vt.palette': 'orchid', 'vt.folds': 0.7, 'vt.foldScale': 0.75, 'vt.camera': 'orbit' } },
  { id: 'storm', label: 'Storm', description: 'Turbulent, smoking matter that tears itself apart under tension.', values: { 'vt.wisps': 0.3, 'vt.flow': 0.8, 'vt.evolve': 0.06, 'vt.wispReach': 1.4, 'vt.camera': 'breathe' } },
  { id: 'stillness', label: 'Stillness', description: 'Almost frozen — the folds change over minutes.', values: { 'vt.flow': 0.15, 'vt.evolve': 0.006, 'vt.wisps': 0.06, 'vt.sway': 0.15, 'vt.palette': 'mono' } },
  { id: 'bio', label: 'Deep sea', description: 'Bioluminescent veins in a smoked-oak vitrine.', values: { 'vt.palette': 'bio', 'vt.wood': 'oak', 'vt.camera': 'reveal' } },
];

/** Each preset also sets the three vein colour pickers from its palette. */
export const VITRINE_PRESETS: Preset[] = BASE.map((p) => {
  const pl = veinPalette((p.values['vt.palette'] as string) ?? 'reference');
  return { ...p, values: { ...p.values, 'vt.veinA': pl.a, 'vt.veinB': pl.b, 'vt.veinC': pl.c } };
});
