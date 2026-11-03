import type * as THREE from 'three';
import type { ParamStore } from './ParamStore';
import type { Signals } from './Signals';

/* ------------------------------------------------------------------ */
/*  Musical events                                                     */
/* ------------------------------------------------------------------ */

export type InputSource = 'midi' | 'file' | 'audio' | 'keyboard' | 'demo';

export interface NoteOnEvent {
  /** MIDI note number 0–127 */
  note: number;
  /** 0–1 */
  velocity: number;
  /** MIDI channel / track index, used for voice grouping */
  channel: number;
  source: InputSource;
  /** Known duration in seconds (files only). Live input leaves it undefined. */
  duration?: number;
}

export interface NoteOffEvent {
  note: number;
  channel: number;
  source: InputSource;
}

export interface ControlEvent {
  /** MIDI CC number (64 sustain, 1 mod wheel, 67 soft pedal…) or -1 for pitch bend */
  controller: number;
  /** 0–1 (pitch bend: -1…1) */
  value: number;
  channel: number;
  source: InputSource;
}

/* ------------------------------------------------------------------ */
/*  Parameters                                                         */
/* ------------------------------------------------------------------ */

export interface ParamBase {
  key: string;
  label: string;
  group: string;
  /** Plain-language explanation shown in the sidebar footer on hover. */
  hint?: string;
  /** Hidden from the generated UI (still stored / preset-able). */
  hidden?: boolean;
}

export interface RangeParam extends ParamBase {
  type: 'range';
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  /** Custom value formatter for the readout. */
  format?: (v: number) => string;
}

export interface SelectOption {
  value: string;
  label: string;
  /** Optional colour swatches rendered next to the label (palettes, grounds). */
  swatches?: string[];
  disabled?: boolean;
}

export interface SelectParam extends ParamBase {
  type: 'select';
  options: SelectOption[];
  default: string;
}

export interface ToggleParam extends ParamBase {
  type: 'toggle';
  default: boolean;
}

export interface ColorParam extends ParamBase {
  type: 'color';
  default: string;
}

export type ParamDef = RangeParam | SelectParam | ToggleParam | ColorParam;
export type ParamValue = number | string | boolean;
export type ParamValues = Record<string, ParamValue>;

export interface ParamGroup {
  id: string;
  label: string;
  /** Short line under the group title explaining what the group does. */
  blurb?: string;
  collapsed?: boolean;
}

export interface Preset {
  id: string;
  label: string;
  /** One-line description shown when the preset is selected. */
  description?: string;
  values: Partial<ParamValues>;
  routes?: ModRoute[];
}

/* ------------------------------------------------------------------ */
/*  Modulation (the "what drives what" matrix)                         */
/* ------------------------------------------------------------------ */

export interface ModSource {
  id: string;
  label: string;
  hint: string;
  /** per-note sources are sampled at note-on; global ones every frame */
  scope: 'note' | 'global';
}

export interface ModTarget {
  id: string;
  label: string;
  hint: string;
}

export interface ModRoute {
  source: string;
  target: string;
  /** -1 … 1 */
  amount: number;
}

/* ------------------------------------------------------------------ */
/*  Movements                                                          */
/* ------------------------------------------------------------------ */

export interface EngineContext {
  renderer: THREE.WebGLRenderer;
  params: ParamStore;
  signals: Signals;
  /** 3D stage scene — movements may add extra objects (particles, geometry). */
  stage: THREE.Scene;
  stageCamera: THREE.PerspectiveCamera;
}

export interface PointerState {
  id: number;
  /** canvas uv 0–1, y up */
  x: number;
  y: number;
  /** uv per second */
  vx: number;
  vy: number;
  down: boolean;
  active: boolean;
}

export interface MovementInstance {
  noteOn(e: NoteOnEvent): void;
  noteOff(e: NoteOffEvent): void;
  control(e: ControlEvent): void;
  allNotesOff(): void;
  /** Advance simulation and render into the movement's own output texture. */
  update(dt: number, time: number, pointers: PointerState[]): void;
  /** The finished image of this frame (linear colour). */
  readonly output: THREE.Texture;
  resize(width: number, height: number): void;
  clear(): void;
  dispose(): void;
}

export interface MovementDefinition {
  id: string;
  /** e.g. "Impressionism" */
  title: string;
  /** e.g. "Monet × Debussy" */
  pairing: string;
  musical: string;
  description: string;
  available: boolean;
  params?: ParamDef[];
  groups?: ParamGroup[];
  presets?: Preset[];
  modTargets?: ModTarget[];
  defaultRoutes?: ModRoute[];
  create?(ctx: EngineContext): MovementInstance;
}
