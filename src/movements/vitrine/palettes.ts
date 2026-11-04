/** Colours of the luminous veins (low · middle · high register). */
export interface VeinPalette { id: string; label: string; a: string; b: string; c: string }

export const VEIN_PALETTES: VeinPalette[] = [
  { id: 'reference', label: 'Coral · lavender · cyan', a: '#ff6a55', b: '#b39bff', c: '#5fe2e4' },
  { id: 'ember', label: 'Ember — coral and gold', a: '#ff4a2a', b: '#ff8f3a', c: '#ffd27a' },
  { id: 'glacier', label: 'Glacier — cyan and ice', a: '#3fb8ff', b: '#5fe2e4', c: '#e2f6ff' },
  { id: 'orchid', label: 'Orchid — pink and violet', a: '#ff5fa8', b: '#b39bff', c: '#7a6aff' },
  { id: 'bio', label: 'Bioluminescent', a: '#39ffb0', b: '#5fe2e4', c: '#c8ff6a' },
  { id: 'nocturne', label: 'Nocturne — amber and blue', a: '#ff9a3c', b: '#7aa0ff', c: '#cfe0ff' },
  { id: 'rosegarden', label: 'Rose & emerald', a: '#f2a487', b: '#e8a0a8', c: '#f6c8b8' },
  { id: 'mono', label: 'Silver', a: '#d8dce4', b: '#ffffff', c: '#aab4c8' },
];

export interface Wood { id: string; label: string; base: string; dark: string; light: string }

export const WOODS: Wood[] = [
  { id: 'walnut', label: 'Walnut', base: '#5c3d28', dark: '#2e1d12', light: '#7d5638' },
  { id: 'oak', label: 'Smoked oak', base: '#5a4330', dark: '#33251a', light: '#7a5d42' },
  { id: 'ebony', label: 'Ebony', base: '#1a1512', dark: '#0b0908', light: '#2e2620' },
  { id: 'ash', label: 'Pale ash', base: '#b9a385', dark: '#8a755b', light: '#d6c3a5' },
];

export const veinPalette = (id: string) => VEIN_PALETTES.find((p) => p.id === id) ?? VEIN_PALETTES[0];
