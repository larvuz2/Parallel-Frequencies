/**
 * Scriabin's colour keyboard (clavier à lumières, Prometheus, 1910), by pitch class C…B.
 * He arranged it around the circle of fifths: C red, G orange, D yellow, A green, E pearly blue,
 * B blue, F♯ bright violet-blue, D♭ violet, A♭ purple, E♭ / B♭ steel, F deep red.
 */
export const SCRIABIN: string[] = [
  '#ff2a1f', // C  red
  '#8b2bff', // C# violet
  '#ffe23a', // D  yellow
  '#9aa3c8', // D# steel with a metallic sheen
  '#a8e2ff', // E  pearly sky blue
  '#a3122a', // F  deep red
  '#4f5bff', // F# bright blue-violet
  '#ff8a1f', // G  orange
  '#c03cff', // G# purple-violet
  '#38d16a', // A  green
  '#8a96b0', // A# steel
  '#4aa8ff', // B  blue
];

export interface VisionPalette {
  id: string;
  label: string;
  /** four resting colours of the particle cloud */
  rest: [string, string, string, string];
  /** nebula tints */
  fogA: string;
  fogB: string;
  background: string;
  /** colour notes with Scriabin's keyboard (true) or the palette's own accents */
  scriabin: boolean;
  accents?: string[];
}

export const VISION_PALETTES: VisionPalette[] = [
  { id: 'prometheus', label: 'Prometheus — Scriabin’s colour keyboard', rest: ['#3a2a6a', '#6a5ab0', '#c8b8ff', '#ffffff'], fogA: '#3b1d6e', fogB: '#0e4c7a', background: 'nebula', scriabin: true },
  { id: 'noirs', label: 'Redon — Les Noirs (charcoal)', rest: ['#1a1714', '#2a2520', '#3a332b', '#0c0b0a'], fogA: '#000000', fogB: '#000000', background: 'paper', scriabin: false, accents: ['#2a1a10', '#101418', '#1c1c1c'] },
  { id: 'pastel', label: 'Redon — pastel flowers', rest: ['#f2a6b8', '#f6d28a', '#9cc4ef', '#c8a8e8'], fogA: '#f2c6d0', fogB: '#b8d0f0', background: 'dawn', scriabin: false, accents: ['#e8607a', '#f0a030', '#5a8ae0', '#9a5ad0', '#4ab07a'] },
  { id: 'flamme', label: 'Vers la flamme — fire', rest: ['#ff5a1a', '#ffb02a', '#ffe7a0', '#ff2a10'], fogA: '#5a1004', fogB: '#2a0a20', background: 'nebula', scriabin: true },
  { id: 'ecstasy', label: 'Poem of Ecstasy — gold and violet', rest: ['#ffd27a', '#ff9ad0', '#9a7aff', '#ffffff'], fogA: '#4a1a5e', fogB: '#5e3a10', background: 'nebula', scriabin: true },
  { id: 'abyss', label: 'Abyss — deep sea', rest: ['#0a4a6a', '#2a9ab0', '#a0f0ff', '#e8fff8'], fogA: '#002a3a', fogB: '#081040', background: 'nebula', scriabin: false, accents: ['#5affd0', '#3ab0ff', '#ffffff', '#9a7aff'] },
  { id: 'aurora', label: 'Aurora — northern lights', rest: ['#1aff9a', '#2ab0ff', '#b05aff', '#ffffff'], fogA: '#003a2a', fogB: '#20104a', background: 'void', scriabin: true },
  { id: 'moon', label: 'Moonlight — silver', rest: ['#7a8090', '#b8c0d0', '#e8ecf4', '#ffffff'], fogA: '#1a1e2a', fogB: '#2a2e3a', background: 'void', scriabin: false, accents: ['#ffffff', '#d0e0ff', '#ffe8c0'] },
];

export const visionPalette = (id: string) => VISION_PALETTES.find((p) => p.id === id) ?? VISION_PALETTES[0];
export const BG_MODE: Record<string, number> = { nebula: 0, void: 1, paper: 2, dawn: 3 };
