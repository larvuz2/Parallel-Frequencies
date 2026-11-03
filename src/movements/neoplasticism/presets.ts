import type { Preset } from '../../core/types';

/** Style presets — each sets the character of the construction and how the camera films it. */
export const STIJL_PRESETS: Preset[] = [
  {
    id: 'ryb',
    label: 'Composition with Red, Yellow and Blue',
    description: 'The classic grid in space: grazing close-ups along the black lines, slowly opening to reveal the whole.',
    values: { 'ds.palette': 'classic', 'ds.background': 'gallery', 'ds.form': 'mixed', 'ds.camera': 'reveal', 'ds.finish': 'gouache', 'ds.colorAmount': 0.4, 'ds.colorMode': 'equilibrium' },
  },
  {
    id: 'broadway',
    label: 'Broadway Boogie Woogie',
    description: 'Yellow streets, small blocks of colour racing along them; the camera tracks the traffic.',
    values: {
      'ds.palette': 'boogie', 'ds.background': 'canvas', 'ds.form': 'blocks', 'ds.span': 1.2, 'ds.colorAmount': 0.55, 'ds.camera': 'follow',
      'ds.trafficSize': 2.4, 'ds.trafficSpeed': 2.4, 'ds.trafficLife': 3.5, 'ds.lineWidth': 0.08, 'ds.lineReach': 1, 'ds.gridX': 14, 'ds.gridY': 9, 'ds.closeness': 0.8,
    },
  },
  {
    id: 'victory',
    label: 'Victory Boogie Woogie — lozenge',
    description: 'The diamond: many small coloured blocks, a classical view at every phrase.',
    values: {
      'ds.palette': 'victory', 'ds.background': 'gallery', 'ds.orientation': 'lozenge', 'ds.form': 'blocks', 'ds.span': 1.5, 'ds.colorAmount': 0.6,
      'ds.camera': 'phrase', 'ds.gridX': 14, 'ds.gridY': 9, 'ds.traffic': true,
    },
  },
  {
    id: 'rietveld',
    label: 'Rietveld — Schröder House',
    description: 'Large lacquered planes cantilevered in open air, lines stopping just past the walls.',
    values: {
      'ds.palette': 'rietveld', 'ds.background': 'sky', 'ds.form': 'planes', 'ds.thickness': 0.3, 'ds.span': 3, 'ds.lineReach': 0.5,
      'ds.finish': 'enamel', 'ds.camera': 'orbit', 'ds.projection': 'perspective', 'ds.relief': 1.1, 'ds.colorAmount': 0.35, 'ds.lightEl': 40,
    },
  },
  {
    id: 'doesburg',
    label: 'Van Doesburg — counter-construction',
    description: 'Floating volumes drawn in parallel projection on drafting paper.',
    values: {
      'ds.palette': 'doesburg', 'ds.background': 'drafting', 'ds.form': 'mixed', 'ds.lineReach': 0.22, 'ds.projection': 'axonometric',
      'ds.camera': 'phrase', 'ds.colorAmount': 0.5, 'ds.balance': 0.1, 'ds.shadow': 0.15, 'ds.dof': 0.15,
    },
  },
  {
    id: 'nachtmusik',
    label: 'Eine kleine Nachtmusik',
    description: 'A night flight through the lattice: luminous lines, glowing held notes, deep fog.',
    values: {
      'ds.palette': 'noir', 'ds.background': 'night', 'ds.finish': 'enamel', 'ds.glow': 1.3, 'ds.camera': 'flythrough', 'ds.fog': 0.55,
      'ds.dof': 0.6, 'ds.fov': 52, 'ds.sun': 1.6, 'ds.ambient': 0.5, 'ds.trafficSize': 2,
    },
  },
  {
    id: 'pier',
    label: 'Pier and Ocean — plus and minus',
    description: 'Mondrian in 1915: only short crossing marks, rhythm without colour. The camera breathes with the dynamics.',
    values: {
      'ds.palette': 'mono', 'ds.background': 'canvas', 'ds.form': 'lines', 'ds.lineReach': 0.03, 'ds.lineWidth': 0.05, 'ds.gridX': 16,
      'ds.gridY': 10, 'ds.irregular': 0.25, 'ds.camera': 'breathe', 'ds.traffic': false, 'ds.span': 1.2,
    },
  },
  {
    id: 'crystal',
    label: 'Crystal sonata — coloured glass',
    description: 'Translucent planes of pastel glass under a pale sky.',
    values: { 'ds.palette': 'pastel', 'ds.background': 'sky', 'ds.finish': 'glass', 'ds.form': 'planes', 'ds.camera': 'reveal', 'ds.dof': 0.6, 'ds.colorAmount': 0.7 },
  },
  {
    id: 'macro',
    label: 'Macro — inside the lines',
    description: 'A long lens inches from the lines, gliding along each one as it is drawn.',
    values: { 'ds.palette': 'classic', 'ds.background': 'gallery', 'ds.camera': 'follow', 'ds.closeness': 0.95, 'ds.dof': 0.85, 'ds.fov': 26, 'ds.handheld': 0.45 },
  },
  {
    id: 'bauhaus',
    label: 'Bauhaus — primary field',
    description: 'Warm modern primaries floating on a deep blue field, orbiting slowly.',
    values: { 'ds.palette': 'bauhaus', 'ds.background': 'blue', 'ds.finish': 'ceramic', 'ds.camera': 'orbit', 'ds.colorAmount': 0.55, 'ds.shadow': 0.4 },
  },
];
