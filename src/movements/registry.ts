import type { MovementDefinition } from '../core/types';
import { impressionism } from './impressionism';
import { neoplasticism } from './neoplasticism';

const soon = (id: string, title: string, pairing: string, musical: string, description: string): MovementDefinition => ({
  id, title, pairing, musical, description, available: false,
});

/**
 * Every movement of the journey. Each one is a self-contained module (see movements/impressionism):
 * its own parameters, presets, modulation targets and renderer, sharing the engine, inputs,
 * post-processing and UI. To add a movement, implement MovementDefinition and swap it in here.
 */
export const MOVEMENTS: MovementDefinition[] = [
  soon('renaissance', 'Renaissance', 'Leonardo × Palestrina', 'Renaissance polyphony', 'Golden-ratio geometry, procedural symmetry, volumetric god rays.'),
  soon('baroque', 'Baroque', 'Caravaggio × Bach', 'Baroque music', 'Chiaroscuro, volumetric shadow, ornate fractals, particle trails.'),
  soon('neoclassicism', 'Neoclassicism', 'David × Mozart', 'Classical music', 'Parametric architecture, mathematical symmetry, soft shadows.'),
  soon('romanticism', 'Romanticism', 'Friedrich × Chopin', 'Romantic music', 'Volumetric clouds, atmospheric scattering, dynamic landscapes.'),
  soon('realism', 'Realism', 'Courbet × Mussorgsky', 'Verismo', 'Physically based materials, realistic light, reflections.'),
  impressionism,
  soon('symbolism', 'Symbolism', 'Redon × Scriabin', 'Late-Romantic music', 'Dreamlike fog, spectral gradients, morphing geometry.'),
  soon('expressionism', 'Expressionism', 'Kandinsky × Schoenberg', 'Atonality', 'Noise displacement, turbulent vector fields, chromatic aberration.'),
  soon('cubism', 'Cubism', 'Picasso × Stravinsky', 'Modernism', 'Voronoi fragmentation, polygonal morphing, multi-camera compositing.'),
  neoplasticism,
  soon('futurism', 'Futurism', 'Boccioni × Russolo', 'Noise music', 'GPU particles, velocity fields, motion blur.'),
  soon('dada', 'Dadaism', 'Duchamp × Satie', 'Experimental', 'Generative collage, glitch, stochastic typography.'),
  soon('surrealism', 'Surrealism', 'Dalí × Souris', 'Experimental', 'Raymarched SDFs, impossible geometry, liquid morphing.'),
  soon('abstract-expressionism', 'Abstract Expressionism', 'Pollock × Cecil Taylor', 'Free jazz', 'Fluid paint, splatter, curl noise, feedback.'),
  soon('minimalism', 'Minimalism', 'Agnes Martin × Steve Reich', 'Minimalism', 'Phase-shifting grids, interference, recursion.'),
  soon('pop', 'Pop Art', 'Warhol × Bowie', 'Pop', 'Halftone, Ben-Day dots, posterisation, screen print.'),
  soon('op', 'Op Art', 'Bridget Riley × Terry Riley', 'Process music', 'Moiré, interference shaders, oscillating line fields.'),
  soon('conceptual', 'Conceptual Art', 'Kosuth × Cage', 'Indeterminacy', 'Rule-based systems, generative typography.'),
  soon('postmodernism', 'Postmodernism', 'Cindy Sherman × John Zorn', 'Postmodern', 'Layered compositing, sampling, recursive feedback.'),
  soon('generative', 'Generative Art', 'Casey Reas × Brian Eno', 'Algorithmic music', 'Reaction-diffusion, flow fields, compute particles.'),
];

export const movementById = (id: string) => MOVEMENTS.find((m) => m.id === id && m.available) ?? impressionism;
