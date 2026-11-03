/**
 * Baroque palettes: the material of the architecture (shadow tone → lit tone), the floor, the
 * colours of the voices (soprano → bass…), the window light and the darkness around it.
 */
export interface BaroquePalette {
  id: string;
  label: string;
  shade: string;
  lit: string;
  stone: string;
  voices: string[];
  key: string;
  fill: string;
  background: string;
}

export const BAROQUE_PALETTES: BaroquePalette[] = [
  {
    id: 'caravaggio', label: 'Caravaggio — umber and ochre',
    shade: '#3a2414', lit: '#c58d4c', stone: '#0c0907',
    voices: ['#ffe0ad', '#ffb35c', '#ff7d3d', '#d9442a', '#fff0d2', '#ff9f6a'], key: '#ffe1b5', fill: '#2c1d14', background: 'void',
  },
  {
    id: 'gold', label: 'Gold leaf — gilded altar',
    shade: '#4e320e', lit: '#f0c25c', stone: '#120d08',
    voices: ['#fff1c4', '#ffd36b', '#ffb13b', '#e88a22', '#fffbe8', '#ffc580'], key: '#fff0d4', fill: '#2a1f12', background: 'chapel',
  },
  {
    id: 'rembrandt', label: 'Rembrandt — amber night',
    shade: '#2b190b', lit: '#b97c3c', stone: '#100a06',
    voices: ['#ffd38a', '#ffb760', '#f08c3c', '#c4602a', '#ffe7b8', '#e6a060'], key: '#ffce8a', fill: '#21150c', background: 'umber',
  },
  {
    id: 'latour', label: 'Georges de La Tour — candlelight',
    shade: '#2a120a', lit: '#a5512b', stone: '#0c0604',
    voices: ['#ffb24d', '#ff8c2b', '#ff6a1f', '#ffcf7a', '#ff9d40', '#ffd9a0'], key: '#ff9a4c', fill: '#160a05', background: 'void',
  },
  {
    id: 'vermeer', label: 'Vermeer — morning window',
    shade: '#5c6876', lit: '#eadcbf', stone: '#2a2c30',
    voices: ['#ffe58a', '#9ec3ff', '#ffd2a0', '#d6e6ff', '#fff3c2', '#b9d4ff'], key: '#f5f1e6', fill: '#4e5d6c', background: 'dawn',
  },
  {
    id: 'organ', label: 'Organ pipes — silver and pewter',
    shade: '#34373d', lit: '#d9d7d1', stone: '#0e0f11',
    voices: ['#fff4d8', '#ffd890', '#cfe0ff', '#ffb870', '#ffffff', '#e8d0a0'], key: '#e9edf3', fill: '#1d2026', background: 'chapel',
  },
  {
    id: 'velvet', label: 'Crimson velvet and gold',
    shade: '#4c0b14', lit: '#dcab55', stone: '#0d0607',
    voices: ['#ffe0a0', '#ff6a5a', '#ffc46b', '#c8243a', '#fff0d0', '#ff9a7a'], key: '#ffe2c0', fill: '#2a0c10', background: 'umber',
  },
  {
    id: 'obsidian', label: 'Obsidian and embers',
    shade: '#050506', lit: '#2c2c31', stone: '#030303',
    voices: ['#ff6a2a', '#ff3d1f', '#ffb04a', '#ff2a40', '#ffd27a', '#ff8a3a'], key: '#c8d2ff', fill: '#0b0b10', background: 'void',
  },
];

export const BAROQUE_BACKGROUNDS = [
  { value: 'auto', label: 'Suggested by palette' },
  { value: 'void', label: 'Caravaggio void', swatches: ['#050403'] },
  { value: 'umber', label: 'Warm umber', swatches: ['#2a1a10'] },
  { value: 'chapel', label: 'Chapel with high window', swatches: ['#15100c', '#ffe1b5'] },
  { value: 'dawn', label: 'Dutch morning light', swatches: ['#2b3038', '#a9b3bd'] },
];

export const BG_COLORS: Record<string, [string, string, number]> = {
  void: ['#020202', '#0b0806', 0],
  umber: ['#0c0705', '#2a1a10', 1],
  chapel: ['#050404', '#16100c', 2],
  dawn: ['#262b33', '#a4aeb9', 3],
};

export const baroquePalette = (id: string) => BAROQUE_PALETTES.find((p) => p.id === id) ?? BAROQUE_PALETTES[0];
