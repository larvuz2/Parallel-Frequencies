import type { Preset } from '../../core/types';

export const SYMBOLISM_PRESETS: Preset[] = [
  {
    id: 'prometheus', label: 'Scriabin — Prometheus, the Poem of Fire',
    description: 'Visions change with the music; every note glows in its colour from Scriabin’s light keyboard.',
    values: { 'sy.shape': 'auto', 'sy.palette': 'prometheus', 'sy.colorFrom': 'scriabin', 'sy.camera': 'reveal', 'sy.trails': 0.75 },
  },
  {
    id: 'eye', label: 'Redon — The Eye, like a strange balloon',
    description: 'Les Noirs: charcoal particles on toned paper form Redon’s floating eye.',
    values: { 'sy.shape': 'eye', 'sy.palette': 'noirs', 'sy.background': 'auto', 'sy.camera': 'orbit', 'sy.trails': 0.55, 'sy.pointSize': 1.4, 'sy.flow': 0.5, 'sy.sparkle': 0 },
  },
  {
    id: 'flowers', label: 'Redon — Flowers in pastel',
    description: 'A blossom of pastel dust under dawn light, petals bursting with each phrase.',
    values: { 'sy.shape': 'flower', 'sy.palette': 'pastel', 'sy.camera': 'breathe', 'sy.petals': 7, 'sy.trails': 0.6, 'sy.pointSize': 1.6 },
  },
  {
    id: 'flamme', label: 'Vers la flamme',
    description: 'A radiant sun of rays; bursts of fire, long luminous trails.',
    values: { 'sy.shape': 'halo', 'sy.palette': 'flamme', 'sy.camera': 'reveal', 'sy.burst': 2.2, 'sy.trails': 0.88, 'sy.flow': 1.1, 'sy.bright': 1.3 },
  },
  {
    id: 'ecstasy', label: 'Poem of Ecstasy — galaxy',
    description: 'A spiral galaxy of gold and violet, slowly turning, swirled by held notes.',
    values: { 'sy.shape': 'galaxy', 'sy.palette': 'ecstasy', 'sy.camera': 'orbit', 'sy.spin': 0.25, 'sy.vortex': 2, 'sy.trails': 0.8 },
  },
  {
    id: 'mystic', label: 'The mystic chord',
    description: 'A torus knot whose windings follow the harmony.',
    values: { 'sy.shape': 'knot', 'sy.palette': 'aurora', 'sy.camera': 'track', 'sy.trails': 0.82, 'sy.flow': 0.5 },
  },
  {
    id: 'dissolution', label: 'Dissolution — nebula',
    description: 'No form at all: colour drifting in currents, gathered and scattered by the notes.',
    values: { 'sy.shape': 'nebula', 'sy.palette': 'abyss', 'sy.camera': 'flythrough', 'sy.coherence': 0.4, 'sy.flow': 1.6, 'sy.trails': 0.9, 'sy.fov': 70 },
  },
  {
    id: 'cyclops', label: 'Redon — The Cyclops',
    description: 'The great eye up close, in moonlight silver; the camera follows each note.',
    values: { 'sy.shape': 'eye', 'sy.palette': 'moon', 'sy.camera': 'track', 'sy.closeness': 0.85, 'sy.size': 1.3, 'sy.trails': 0.7 },
  },
];
