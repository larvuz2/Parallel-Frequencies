/**
 * Palettes are ordered from dark → light, because the default colour mapping walks through
 * them by register: low notes take the deep tones (water, shadow), high notes the light ones (sky).
 * `accent` is reserved for the loudest notes — the red sun in "Impression, soleil levant".
 */
export interface Palette {
  id: string;
  label: string;
  colors: string[];
  accent: string;
  /** suggested atmosphere / veil colour */
  haze: string;
  /** colour of the light raking across the canvas */
  light: string;
}

export const PALETTES: Palette[] = [
  {
    id: 'soleil-levant',
    label: 'Impression, soleil levant',
    colors: ['#24343a', '#3c5560', '#5f8396', '#86a9b9', '#8fc2ae', '#b5d5bd', '#d9a08f', '#ecbfa4', '#f3dccd'],
    accent: '#f0472c',
    haze: '#9eb6c2',
    light: '#fff1e6',
  },
  {
    id: 'nympheas',
    label: 'Nymphéas — water lilies',
    colors: ['#1d2b3a', '#2e4a52', '#3f6b5c', '#5e8a6a', '#7a8fb8', '#a48fc0', '#c7a6c9', '#e6b8c4', '#f2e2dc'],
    accent: '#f27a8a',
    haze: '#8a96b8',
    light: '#f2f0ff',
  },
  {
    id: 'rouen',
    label: 'Rouen Cathedral — full sunlight',
    colors: ['#4b4a6b', '#6f6a8e', '#9a8fae', '#c2a78f', '#d9b98a', '#e8cf98', '#f1dfb0', '#f6ead0', '#fbf4e4'],
    accent: '#f3a03a',
    haze: '#e2cfb4',
    light: '#fff3d9',
  },
  {
    id: 'parliament',
    label: 'Houses of Parliament — fog',
    colors: ['#2a2238', '#40345a', '#5a4b7d', '#7a62a0', '#a07ab0', '#c88fa8', '#e2a882', '#f0c27a', '#f6dca8'],
    accent: '#ff7b2e',
    haze: '#8f7aa8',
    light: '#ffd9b0',
  },
  {
    id: 'poppies',
    label: 'Poppy field — Argenteuil',
    colors: ['#2c3b28', '#4a6233', '#6f8a46', '#94a96a', '#b9c4a0', '#9fb9d4', '#c8d8e6', '#eef0ee', '#fbf8f0'],
    accent: '#d8341f',
    haze: '#c9d6de',
    light: '#fffaf0',
  },
  {
    id: 'haystacks',
    label: 'Haystacks — end of summer',
    colors: ['#3a2a3a', '#5e3f4a', '#8a5a4a', '#b8784e', '#d69a5a', '#e8b874', '#d6c2a0', '#b9c2c8', '#ece2cf'],
    accent: '#f05a22',
    haze: '#d8b89a',
    light: '#ffe2c0',
  },
  {
    id: 'saint-lazare',
    label: 'Gare Saint-Lazare — steam',
    colors: ['#1f2328', '#363d45', '#4f5a66', '#6f7f8e', '#93a3b0', '#b7c2c8', '#d6d6cf', '#ebe6da', '#f7f3ea'],
    accent: '#5c8de0',
    haze: '#c2c8cc',
    light: '#f5f1e8',
  },
  {
    id: 'japanese-bridge',
    label: 'Japanese footbridge — Giverny',
    colors: ['#14261c', '#24402a', '#3a5e34', '#5a7e3e', '#7f9c4c', '#a8b860', '#c9cc7c', '#b8c9b0', '#e8ead0'],
    accent: '#c94a7a',
    haze: '#a9bc96',
    light: '#f6ffe8',
  },
  {
    id: 'etretat',
    label: 'Étretat — cliffs and sea',
    colors: ['#16303f', '#21506a', '#2f7590', '#4c98ad', '#78b8c2', '#a9d2cf', '#e2d8bf', '#efe5cf', '#fbf6ea'],
    accent: '#e0b040',
    haze: '#a8c8d0',
    light: '#fff8ea',
  },
  {
    id: 'moulin',
    label: 'Bal du moulin — dappled light',
    colors: ['#24233a', '#3c3f66', '#5d6a96', '#8a94b8', '#c4a0a8', '#e2b8a0', '#efd0b0', '#f6e4c8', '#fdf5e6'],
    accent: '#e85a4a',
    haze: '#c8b8c0',
    light: '#fff0dc',
  },
  {
    id: 'flood',
    label: 'Flood at Port-Marly — Sisley',
    colors: ['#3a3f3c', '#5a6460', '#7c8a86', '#9cacaa', '#b8c6c8', '#c9c0a8', '#d8d2c0', '#e8e6dc', '#f6f4ee'],
    accent: '#c8693a',
    haze: '#c0c8c8',
    light: '#f4f2ea',
  },
  {
    id: 'morisot',
    label: 'Summer’s day — Morisot',
    colors: ['#2e3a46', '#4c6070', '#7896a4', '#a6bcc4', '#c8d4d0', '#dfe2d8', '#ece9e0', '#f5f2ea', '#fcfaf6'],
    accent: '#7aa4d8',
    haze: '#dfe4e6',
    light: '#ffffff',
  },
  {
    id: 'grande-jatte',
    label: 'La Grande Jatte — divisionist',
    colors: ['#1a2e4a', '#2a5a3a', '#3c7a46', '#5aa04a', '#e0a020', '#e86a2a', '#7aa8d8', '#f2e070', '#fdf8e8'],
    accent: '#d8303a',
    haze: '#b8c8a8',
    light: '#fffbe8',
  },
  {
    id: 'faune',
    label: 'Après-midi d’un faune — nocturne',
    colors: ['#0e1420', '#1a2438', '#2a3a58', '#3e5478', '#5c7398', '#8492b0', '#b0a6c2', '#d8c0c8', '#f0e0d8'],
    accent: '#e8b860',
    haze: '#3a4868',
    light: '#e8e6ff',
  },
  {
    id: 'turner',
    label: 'Turner — vapour and light',
    colors: ['#3c2a22', '#6a4a30', '#9c7040', '#c89a52', '#e2bc6c', '#f0d48c', '#f6e4ac', '#faf0cc', '#fffae8'],
    accent: '#ff8a20',
    haze: '#f0dcb0',
    light: '#fff2d0',
  },
  {
    id: 'starry',
    label: 'Night swirl — post-impressionist',
    colors: ['#0a1a3a', '#122c5e', '#1e4488', '#2e62a8', '#4a86c0', '#7aa8c8', '#c8d0a0', '#f0d860', '#fff4b0'],
    accent: '#ffd030',
    haze: '#1c3058',
    light: '#f0f4ff',
  },
];

export interface GroundTone {
  id: string;
  label: string;
  color: string;
}

export const GROUND_TONES: GroundTone[] = [
  { id: 'lead-white', label: 'Lead white', color: '#efe9dc' },
  { id: 'cream', label: 'Warm cream', color: '#ebdfc6' },
  { id: 'raw-linen', label: 'Raw linen', color: '#c9b998' },
  { id: 'grey-imprimatura', label: 'Pale grey imprimatura', color: '#c9c7bf' },
  { id: 'blue-grey', label: 'Blue-grey toned', color: '#a9b4b8' },
  { id: 'rose', label: 'Rose toned', color: '#d9c0b4' },
  { id: 'ochre', label: 'Ochre toned', color: '#c4a46c' },
  { id: 'umber', label: 'Umber toned', color: '#6d5a48' },
  { id: 'night', label: 'Night blue', color: '#1b2233' },
  { id: 'charcoal', label: 'Charcoal', color: '#2a2a2a' },
  { id: 'gallery-white', label: 'Gallery white', color: '#f6f5f2' },
];

export const paletteById = (id: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];
export const groundById = (id: string) => GROUND_TONES.find((g) => g.id === id) ?? GROUND_TONES[0];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
