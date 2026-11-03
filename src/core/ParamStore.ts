import type { ModRoute, ParamDef, ParamValue, ParamValues, Preset } from './types';

type Listener = (key: string, value: ParamValue) => void;
type RoutesListener = (routes: ModRoute[]) => void;

/**
 * Central parameter store.
 *  - Holds every tweakable value for the engine and the active movement.
 *  - Numeric values can *morph* toward a target (smooth preset changes on stage).
 *  - Persists to localStorage so a tuned installation survives a reload.
 */
export class ParamStore {
  private defs = new Map<string, ParamDef>();
  private values: ParamValues = {};
  private targets = new Map<string, { from: number; to: number; t: number; dur: number }>();
  private listeners = new Set<Listener>();
  private routeListeners = new Set<RoutesListener>();
  private _routes: ModRoute[] = [];
  private saveTimer = 0;
  storageKey = 'pf:params';

  register(defs: ParamDef[]) {
    for (const d of defs) {
      this.defs.set(d.key, d);
      if (!(d.key in this.values)) this.values[d.key] = d.default;
    }
  }

  def(key: string) {
    return this.defs.get(key);
  }

  allDefs() {
    return [...this.defs.values()];
  }

  /** Raw access for hot loops. */
  get v(): Readonly<ParamValues> {
    return this.values;
  }

  num(key: string): number {
    return this.values[key] as number;
  }
  str(key: string): string {
    return this.values[key] as string;
  }
  bool(key: string): boolean {
    return this.values[key] as boolean;
  }

  set(key: string, value: ParamValue, opts: { silent?: boolean; persist?: boolean } = {}) {
    const def = this.defs.get(key);
    if (!def) return;
    if (def.type === 'range' && typeof value === 'number') {
      value = Math.min(def.max, Math.max(def.min, value));
    }
    this.targets.delete(key);
    this.values[key] = value;
    if (!opts.silent) this.emit(key, value);
    if (opts.persist !== false) this.scheduleSave();
  }

  /**
   * Apply a set of values. Numeric values glide over `morph` seconds,
   * discrete values (selects, toggles) switch immediately.
   */
  apply(values: Partial<ParamValues>, morph = 0) {
    for (const [key, value] of Object.entries(values)) {
      const def = this.defs.get(key);
      if (!def || value === undefined) continue;
      if (morph > 0 && def.type === 'range' && typeof value === 'number') {
        this.targets.set(key, { from: this.values[key] as number, to: value, t: 0, dur: morph });
      } else {
        this.set(key, value, { persist: false });
      }
    }
    this.scheduleSave();
  }

  applyPreset(p: Preset, morph = 0) {
    this.apply(p.values, morph);
    if (p.routes) this.setRoutes(p.routes.map((r) => ({ ...r })));
  }

  resetToDefaults(keys?: string[]) {
    const values: ParamValues = {};
    for (const d of this.defs.values()) if (!keys || keys.includes(d.key)) values[d.key] = d.default;
    this.apply(values, 0);
  }

  /** Advance morphs; call once per frame. */
  tick(dt: number) {
    if (!this.targets.size) return;
    for (const [key, m] of this.targets) {
      m.t = Math.min(1, m.t + dt / m.dur);
      const e = m.t < 0.5 ? 4 * m.t * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 3) / 2;
      const v = m.from + (m.to - m.from) * e;
      this.values[key] = v;
      this.emit(key, v);
      if (m.t >= 1) this.targets.delete(key);
    }
  }

  get routes(): ModRoute[] {
    return this._routes;
  }

  setRoutes(routes: ModRoute[]) {
    this._routes = routes;
    for (const l of this.routeListeners) l(routes);
    this.scheduleSave();
  }

  onChange(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  onRoutes(l: RoutesListener) {
    this.routeListeners.add(l);
    return () => this.routeListeners.delete(l);
  }

  snapshot(): { values: ParamValues; routes: ModRoute[] } {
    return { values: { ...this.values }, routes: this._routes.map((r) => ({ ...r })) };
  }

  private emit(key: string, value: ParamValue) {
    for (const l of this.listeners) l(key, value);
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.save(), 400);
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.snapshot()));
    } catch {
      /* storage unavailable — fine */
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      const data = JSON.parse(raw) as { values: ParamValues; routes: ModRoute[] };
      for (const [k, v] of Object.entries(data.values ?? {})) {
        const def = this.defs.get(k);
        if (!def) continue;
        if (def.type === 'select' && !def.options.some((o) => o.value === v)) continue;
        if (typeof v !== typeof def.default) continue;
        this.values[k] = v;
      }
      if (Array.isArray(data.routes)) this._routes = data.routes;
      return true;
    } catch {
      return false;
    }
  }
}
