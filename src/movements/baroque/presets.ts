import type { Preset } from '../../core/types';

export const BAROQUE_PRESETS: Preset[] = [
  {
    id: 'calling',
    label: 'Caravaggio — The Calling',
    description: 'A golden monstrance in the void, one hard window light, voices as candle-flames weaving around it.',
    values: { 'bq.form': 'monstrance', 'bq.palette': 'caravaggio', 'bq.background': 'auto', 'bq.material': 'gilded', 'bq.camera': 'reveal', 'bq.keyPower': 3, 'bq.ambient': 0.3, 'bq.godRays': 0.7 },
  },
  {
    id: 'toccata',
    label: 'Toccata and Fugue — the organ',
    description: 'The organ façade in pewter and gold: every note lights the mouth of its pipe. The camera walks along the towers.',
    values: { 'bq.form': 'organ', 'bq.palette': 'organ', 'bq.material': 'gilded', 'bq.camera': 'reveal', 'bq.detail': 7, 'bq.godRays': 1, 'bq.fog': 0.55, 'bq.fov': 50 },
  },
  {
    id: 'goldberg',
    label: 'Goldberg — the gilded vault',
    description: 'Apollonian domes in gold leaf, the camera breathing in and out with the dynamics.',
    values: { 'bq.form': 'vault', 'bq.palette': 'gold', 'bq.material': 'gilded', 'bq.camera': 'breathe', 'bq.detail': 6, 'bq.keyPower': 1.6, 'bq.godRays': 0.9 },
  },
  {
    id: 'bernini',
    label: 'Bernini — Baldacchino',
    description: 'A canopy on twisted Solomonic columns; the voices spiral around them like the columns themselves.',
    values: { 'bq.form': 'baldacchino', 'bq.palette': 'velvet', 'bq.material': 'bronze', 'bq.camera': 'orbit', 'bq.spread': 1.1, 'bq.weave': 0.6 },
  },
  {
    id: 'latour',
    label: 'Georges de La Tour — candlelight',
    description: 'No window: the notes are the only light in the dark.',
    values: { 'bq.form': 'monstrance', 'bq.palette': 'latour', 'bq.keyPower': 0, 'bq.ambient': 0.05, 'bq.lightPower': 4.2, 'bq.reach': 1.6, 'bq.camera': 'track', 'bq.godRays': 0, 'bq.fog': 0.5, 'bq.decay': 2.5 },
  },
  {
    id: 'rembrandt',
    label: 'Rembrandt — the night watch',
    description: 'Amber light raking across bronze vaults, deep umber shadows.',
    values: { 'bq.form': 'vault', 'bq.palette': 'rembrandt', 'bq.material': 'bronze', 'bq.camera': 'phrase', 'bq.keyAz': 110, 'bq.keyEl': 30, 'bq.ambient': 0.12 },
  },
  {
    id: 'vermeer',
    label: 'Vermeer — morning window',
    description: 'Cool northern daylight on marble ornament; the Dutch interior, quiet and clear.',
    values: { 'bq.form': 'ornament', 'bq.palette': 'vermeer', 'bq.material': 'marble', 'bq.background': 'dawn', 'bq.keyPower': 2.8, 'bq.ambient': 0.6, 'bq.shadowSoft': 0.75, 'bq.camera': 'orbit', 'bq.godRays': 0.4 },
  },
  {
    id: 'fugue',
    label: 'The Art of Fugue — obsidian',
    description: 'Black glass architecture, voices as embers — only their paths reveal the form.',
    values: { 'bq.form': 'chambers', 'bq.palette': 'obsidian', 'bq.material': 'obsidian', 'bq.keyPower': 0.5, 'bq.lightPower': 3.5, 'bq.trailDensity': 1.8, 'bq.trailLife': 7, 'bq.camera': 'track', 'bq.godRays': 0.3 },
  },
];
