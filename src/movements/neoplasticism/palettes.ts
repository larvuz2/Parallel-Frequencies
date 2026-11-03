/**
 * De Stijl palettes. Mondrian reduced colour to the three primaries plus non-colours
 * (white, grey, black). `whites` are the many slightly different whites he actually painted.
 */
export interface StijlPalette {
  id: string;
  label: string;
  line: string;
  primaries: string[]; // [red, yellow, blue, …extras]
  whites: string[];
  grey: string;
  background: string; // suggested background id
}

export const STIJL_PALETTES: StijlPalette[] = [
  {
    id: 'classic', label: 'Composition with Red, Yellow and Blue',
    line: '#151515', primaries: ['#c8261e', '#efc523', '#1c3a8f'],
    whites: ['#f2efe6', '#ece8dc', '#f5f3ec', '#e8e4d8'], grey: '#c9c6bd', background: 'gallery',
  },
  {
    id: 'boogie', label: 'Broadway Boogie Woogie — yellow lines',
    line: '#ecc31f', primaries: ['#c62a22', '#2a4aa0', '#bdb9b1', '#ecc31f'],
    whites: ['#efebe2', '#f3f0e8'], grey: '#bdb9b1', background: 'canvas',
  },
  {
    id: 'victory', label: 'Victory Boogie Woogie',
    line: '#1a1a1a', primaries: ['#d0302a', '#f1cc2c', '#2747a3', '#9a9894', '#e9e4d6'],
    whites: ['#f4f1e9', '#ebe7dd', '#dcd8cd'], grey: '#a3a09a', background: 'gallery',
  },
  {
    id: 'early', label: 'Early Mondrian — 1917 muted planes',
    line: '#3a3633', primaries: ['#c9826f', '#d9b56a', '#7c93ad', '#b9a7a0'],
    whites: ['#e9e2d4', '#e2dccd'], grey: '#b3aca0', background: 'canvas',
  },
  {
    id: 'doesburg', label: 'Van Doesburg — counter-composition',
    line: '#121212', primaries: ['#d22f25', '#f0c419', '#203f9a', '#2b2b2b'],
    whites: ['#f0eee8', '#d7d5cf', '#bdbbb5'], grey: '#8e8c88', background: 'drafting',
  },
  {
    id: 'rietveld', label: 'Rietveld — Red-Blue Chair',
    line: '#0f0f0f', primaries: ['#c21f1a', '#163a8c', '#f2c81d'],
    whites: ['#e9e6de', '#d9d6ce'], grey: '#55534f', background: 'sky',
  },
  {
    id: 'noir', label: 'Nocturne — primaries in the dark',
    line: '#f2efe6', primaries: ['#ff3b2f', '#ffd23a', '#3f6bff'],
    whites: ['#2a2b30', '#33343a', '#222328'], grey: '#4a4b52', background: 'night',
  },
  {
    id: 'bauhaus', label: 'Bauhaus — warm modern',
    line: '#1b1b1b', primaries: ['#e0442f', '#f2b134', '#2e5aa6', '#2f8a6f'],
    whites: ['#f1ece1', '#e8dfcf'], grey: '#c4b9a6', background: 'gallery',
  },
  {
    id: 'pastel', label: 'Pastel — contemporary',
    line: '#2b2b33', primaries: ['#f08a7e', '#f6d47c', '#8fb2e8', '#b8a6e6'],
    whites: ['#f7f4ef', '#efebe5'], grey: '#d3cfc8', background: 'gallery',
  },
  {
    id: 'mono', label: 'Monochrome — lines and whites',
    line: '#111111', primaries: ['#3a3a3a', '#8a8a8a', '#c9c9c9'],
    whites: ['#f3f2ee', '#e9e8e3', '#dedcd6'], grey: '#a9a8a3', background: 'gallery',
  },
];

export const STIJL_BACKGROUNDS = [
  { value: 'auto', label: 'Suggested by palette' },
  { value: 'gallery', label: 'Gallery white', swatches: ['#efece6'] },
  { value: 'canvas', label: 'Painted canvas', swatches: ['#e9e4d8'] },
  { value: 'drafting', label: 'Drafting paper & grid', swatches: ['#e8e6df'] },
  { value: 'sky', label: 'Enlightenment sky', swatches: ['#b9cde0', '#efe6d6'] },
  { value: 'night', label: 'Night', swatches: ['#0e1016'] },
  { value: 'blue', label: 'Primary blue field', swatches: ['#1c3a8f'] },
  { value: 'red', label: 'Primary red field', swatches: ['#b9271f'] },
];

export const DARK_BACKGROUNDS = new Set(['night', 'blue', 'red']);
export const stijlPalette = (id: string) => STIJL_PALETTES.find((p) => p.id === id) ?? STIJL_PALETTES[0];
