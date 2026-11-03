import type { ModRoute, MovementDefinition, ParamDef, ParamGroup, Preset, SelectOption } from '../core/types';
import type { ParamStore } from '../core/ParamStore';
import { MOD_SOURCES } from '../core/Signals';
import { ENGINE_GROUPS } from '../core/engineParams';
import { MOVEMENTS } from '../movements/registry';
import {
  ICONS, colorControl, dropdown, h, hintBus, iconButton, rangeControl, selectControl, toggleControl, withHint, type Dropdown,
} from './controls';

export interface AppApi {
  params: ParamStore;
  movement: MovementDefinition;
  signals: Record<string, number>;
  midiStatus(): { supported: boolean; devices: { id: string; name: string }[]; selected: string };
  selectMidi(id: string): void;
  openFile(): void;
  playDemo(): void;
  clear(): void;
  snapshot(): void;
  toggleRecord(): void;
  isRecording(): boolean;
  fullscreen(): void;
  hideUI(): void;
  setMovement(id: string): void;
  presets(): { builtIn: Preset[]; saved: Preset[] };
  applyPreset(id: string): void;
  currentPreset(): string;
  savePreset(name: string): void;
  deletePreset(id: string): void;
  randomise(): void;
  exportSettings(): void;
  importSettings(): void;
  resetAll(): void;
}


export class Sidebar {
  readonly el: HTMLElement;
  private body: HTMLElement;
  private hint: HTMLElement;
  private meters = new Map<string, HTMLElement>();
  private routesEl!: HTMLElement;
  private midiEl!: HTMLElement;
  private presetDd!: Dropdown;
  private presetDesc!: HTMLElement;
  private recBtn!: HTMLButtonElement;
  private routeRows: { el: HTMLElement; source: string }[] = [];
  private collapsed: Record<string, boolean>;

  constructor(private app: AppApi) {
    try {
      this.collapsed = JSON.parse(localStorage.getItem('pf:collapsed') ?? '{}');
    } catch {
      this.collapsed = {};
    }
    this.hint = h('div', { class: 'sb-hint' });
    this.body = h('div', { class: 'sb-body' });
    this.el = h('aside', { class: 'sidebar' }, this.header(), this.body, this.footer());
    hintBus.set = (t) => {
      this.hint.innerHTML = t ?? this.defaultHint();
      this.hint.classList.toggle('active', !!t);
    };
    hintBus.set(null);
    this.build();
  }

  private defaultHint() {
    return '<span class="muted">Hover any control to learn what it does. <b>H</b> hides the panel · <b>F</b> fullscreen · <b>P</b> performance.</span>';
  }

  /* ------------------------------------------------------------------ header */

  private header() {
    const m = this.app.movement;
    const opts: SelectOption[] = MOVEMENTS.map((x) => ({ value: x.id, label: `${x.title}${x.available ? '' : ' · soon'}`, disabled: !x.available }));
    const dd = dropdown(opts, m.id, (id) => this.app.setMovement(id));
    dd.el.classList.add('movement-dd');
    return h(
      'header',
      { class: 'sb-header' },
      h('div', { class: 'brand' }, h('span', { text: 'Parallel Frequencies' })),
      h('div', { class: 'movement' },
        dd.el,
        h('div', { class: 'pairing', text: `${m.pairing} · ${m.musical}` }),
        h('p', { class: 'desc', text: m.description }),
      ),
    );
  }

  /* ------------------------------------------------------------------ body */

  private build() {
    const p = this.app.params;
    const m = this.app.movement;
    this.body.append(this.section('source', 'Source', 'Live MIDI, a file, or the demo.', this.sourcePanel()));
    this.body.append(this.section('style', 'Style', 'Presets, palette and canvas — the quickest way to transform the piece.', this.stylePanel()));

    const groups: ParamGroup[] = [...(m.groups ?? [])];
    const defs = p.allDefs();
    for (const g of groups) this.body.append(this.groupSection(g, defs.filter((d) => d.group === g.id && !d.hidden && !(m.featured ?? []).includes(d.key))));
    this.body.append(this.section('mapping', 'Mapping', 'What in the music drives what on the canvas.', this.mappingPanel(), true));
    for (const g of ENGINE_GROUPS) this.body.append(this.groupSection(g, defs.filter((d) => d.group === g.id && !d.hidden)));
    this.body.append(this.section('library', 'Library', 'Save, share and restore your settings.', this.libraryPanel(), true));
  }

  private section(id: string, title: string, blurb: string | undefined, content: HTMLElement, collapsedDefault = false) {
    const collapsed = this.collapsed[id] ?? collapsedDefault;
    const head = h('button', { class: 'sec-head', type: 'button' }, h('span', { class: 'sec-title', text: title }), h('span', { class: 'sec-caret' }));
    const inner = h('div', { class: 'sec-inner' }, blurb ? h('p', { class: 'sec-blurb', text: blurb }) : null, content);
    const sec = h('section', { class: `sec${collapsed ? ' collapsed' : ''}` }, head, h('div', { class: 'sec-wrap' }, inner));
    head.addEventListener('click', () => {
      sec.classList.toggle('collapsed');
      this.collapsed[id] = sec.classList.contains('collapsed');
      try {
        localStorage.setItem('pf:collapsed', JSON.stringify(this.collapsed));
      } catch {
        /* ignore */
      }
    });
    return sec;
  }

  private groupSection(g: ParamGroup, defs: ParamDef[]) {
    const box = h('div', { class: 'ctl-list' });
    for (const d of defs) box.append(this.control(d));
    return this.section(g.id, g.label, g.blurb, box, g.collapsed);
  }

  private control(d: ParamDef): HTMLElement {
    const p = this.app.params;
    switch (d.type) {
      case 'range': return rangeControl(d, p);
      case 'toggle': return toggleControl(d, p);
      case 'select': return selectControl(d, p);
      case 'color': return colorControl(d, p);
    }
  }

  private ctl(key: string) {
    const d = this.app.params.def(key);
    return d ? this.control(d) : null;
  }

  /* ------------------------------------------------------------------ source */

  private sourcePanel() {
    this.midiEl = h('div', { class: 'midi-status' });
    this.refreshMidi();
    const open = h('button', { class: 'btn primary', type: 'button' });
    open.innerHTML = `${ICONS.file}<span>Open MIDI or audio</span>`;
    open.addEventListener('click', () => this.app.openFile());
    withHint(open, 'Open file', 'Load a .mid file (played on a sampled grand piano) or an audio recording (mp3, wav, m4a…) — the recording is analysed into notes. You can also drop files anywhere.');
    const demo = h('button', { class: 'btn', type: 'button' });
    demo.innerHTML = `${ICONS.play}<span>Play demo</span>`;
    demo.addEventListener('click', () => this.app.playDemo());
    withHint(demo, 'Demo', this.app.movement.demoDescription ?? 'A built-in piece to try the movement.');
    return h(
      'div',
      { class: 'ctl-list' },
      this.midiEl,
      h('div', { class: 'btn-row' }, open, demo),
      this.ctl('src.monitor'),
      this.ctl('src.keyboard'),
      this.ctl('src.pedalSustain'),
      this.ctl('src.instrument'),
      this.ctl('src.volume'),
      this.ctl('src.idle'),
      this.ctl('src.idleAfter'),
      this.ctl('src.idleSound'),
    );
  }

  refreshMidi(activity = false) {
    const s = this.app.midiStatus();
    if (!this.midiEl) return;
    this.midiEl.replaceChildren();
    const dot = h('i', { class: `dot${s.devices.length ? ' on' : ''}${activity ? ' blink' : ''}` });
    if (!s.supported) {
      this.midiEl.append(dot, h('span', { text: 'Web MIDI is not available in this browser (Safari). Use Chrome for a MIDI keyboard — or the computer keyboard, a file, or the demo.' }));
      return;
    }
    if (!s.devices.length) {
      this.midiEl.append(dot, h('span', { text: 'Waiting for a MIDI keyboard — plug one in at any time.' }));
      return;
    }
    if (s.devices.length === 1) {
      this.midiEl.append(dot, h('span', { text: s.devices[0].name }));
      return;
    }
    const opts = [{ value: 'all', label: 'All MIDI inputs' }, ...s.devices.map((d) => ({ value: d.id, label: d.name }))];
    this.midiEl.append(dot, dropdown(opts, s.selected, (v) => this.app.selectMidi(v), { compact: true }).el);
  }

  blinkMidi() {
    const dot = this.midiEl?.querySelector('.dot');
    if (!dot) return;
    dot.classList.remove('blink');
    void (dot as HTMLElement).offsetWidth;
    dot.classList.add('blink');
  }

  /* ------------------------------------------------------------------ style */

  private stylePanel() {
    this.presetDd = dropdown([], '', (id) => this.app.applyPreset(id));
    this.presetDesc = h('p', { class: 'preset-desc' });
    this.refreshPresets();
    const save = h('button', { class: 'btn ghost', type: 'button', text: 'Save as…' });
    save.addEventListener('click', () => {
      const name = prompt('Name this preset');
      if (name?.trim()) this.app.savePreset(name.trim());
    });
    const rnd = h('button', { class: 'btn ghost', type: 'button' });
    rnd.innerHTML = `${ICONS.dice}<span>Surprise me</span>`;
    rnd.addEventListener('click', () => this.app.randomise());
    withHint(rnd, 'Surprise me', 'A new random variation within tasteful ranges — palette, brush, composition, light. Values glide.');
    const presetRow = withHint(h('div', { class: 'ctl ctl-select' }, h('label', { text: 'Preset' }), this.presetDd.el), 'Preset', `Variations of ${this.app.movement.title}. Switching glides smoothly — safe to use during a performance. Use [ and ] to step through.`);
    return h(
      'div',
      { class: 'ctl-list' },
      presetRow,
      this.presetDesc,
      h('div', { class: 'btn-row' }, rnd, save),
      ...(this.app.movement.featured ?? []).map((k) => this.ctl(k)),
    );
  }

  refreshPresets() {
    const { builtIn, saved } = this.app.presets();
    const groups: Record<string, string> = {};
    const opts: SelectOption[] = [];
    for (const p of builtIn) {
      opts.push({ value: p.id, label: p.label });
      groups[p.id] = 'Built-in';
    }
    for (const p of saved) {
      opts.push({ value: p.id, label: p.label });
      groups[p.id] = 'Saved';
    }
    const cur = this.app.currentPreset();
    const fresh = dropdown(opts, cur, (id) => this.app.applyPreset(id), { groups });
    this.presetDd.el.replaceWith(fresh.el);
    this.presetDd = fresh;
    const p = [...builtIn, ...saved].find((x) => x.id === cur);
    this.presetDesc.textContent = p?.description ?? (cur ? '' : 'Custom settings.');
  }

  /* ------------------------------------------------------------------ mapping */

  private mappingPanel() {
    const grid = h('div', { class: 'meters' });
    for (const s of MOD_SOURCES) {
      const bar = h('i');
      const row = withHint(h('div', { class: 'meter' }, h('span', { text: s.label }), h('b', {}, bar)), s.label, s.hint);
      this.meters.set(s.id, bar);
      grid.append(row);
    }
    this.routesEl = h('div', { class: 'routes' });
    this.renderRoutes(this.app.params.routes);
    this.app.params.onRoutes((r) => this.renderRoutes(r));
    const add = h('button', { class: 'btn ghost', type: 'button' });
    add.innerHTML = `${ICONS.plus}<span>Add connection</span>`;
    add.addEventListener('click', () => {
      this.app.params.setRoutes([...this.app.params.routes, { source: 'velocity', target: 'size', amount: 0.3 }]);
    });
    const reset = h('button', { class: 'btn ghost', type: 'button', text: 'Reset' });
    reset.addEventListener('click', () => this.app.params.setRoutes((this.app.movement.defaultRoutes ?? []).map((r) => ({ ...r }))));
    return h(
      'div',
      { class: 'mapping' },
      h('div', { class: 'sub', text: 'Live signals' }),
      grid,
      h('div', { class: 'sub', text: 'Connections' }),
      h('p', { class: 'sec-blurb', text: 'Each line lets one musical signal push one visual property. Per-note signals swing around their middle; global ones add on top. Drag the amount left to invert.' }),
      this.routesEl,
      h('div', { class: 'btn-row' }, add, reset),
    );
  }

  private renderRoutes(routes: ModRoute[]) {
    const targets = this.app.movement.modTargets ?? [];
    this.routesEl.replaceChildren();
    this.routeRows = [];
    const update = (i: number, patch: Partial<ModRoute>) => {
      const next = this.app.params.routes.map((r, j) => (j === i ? { ...r, ...patch } : r));
      this.app.params.setRoutes(next);
    };
    routes.forEach((r, i) => {
      const src = dropdown(MOD_SOURCES.map((s) => ({ value: s.id, label: s.label })), r.source, (v) => update(i, { source: v }), { compact: true });
      const tgt = dropdown(targets.map((t) => ({ value: t.id, label: t.label })), r.target, (v) => update(i, { target: v }), { compact: true });
      const amt = h('input', { type: 'range', min: -1, max: 1, step: 0.01, value: r.amount, class: 'bipolar' });
      const val = h('span', { class: 'ctl-value', text: fmtAmt(r.amount) });
      const paint = (v: number) => {
        amt.style.setProperty('--a', String((v + 1) / 2));
        val.textContent = fmtAmt(v);
      };
      paint(r.amount);
      amt.addEventListener('input', () => paint(parseFloat(amt.value)));
      amt.addEventListener('change', () => update(i, { amount: parseFloat(amt.value) }));
      amt.addEventListener('dblclick', () => update(i, { amount: 0 }));
      const del = iconButton(ICONS.close, 'Remove', () => this.app.params.setRoutes(this.app.params.routes.filter((_, j) => j !== i)), 'tiny');
      const row = h('div', { class: 'route' }, h('div', { class: 'route-top' }, src.el, h('span', { class: 'arrow', text: '→' }), tgt.el, del), h('div', { class: 'route-amt' }, amt, val));
      const t = targets.find((x) => x.id === r.target);
      const s = MOD_SOURCES.find((x) => x.id === r.source);
      withHint(row, `${s?.label ?? r.source} → ${t?.label ?? r.target}`, `${s?.hint ?? ''} ${t ? 'Drives: ' + t.hint : ''}`);
      this.routesEl.append(row);
      this.routeRows.push({ el: row, source: r.source });
    });
  }

  /** Called every frame — animate meters and glow connections whose signal is active. */
  tick() {
    if (this.el.classList.contains('hidden')) return;
    const sig = this.app.signals;
    for (const [id, bar] of this.meters) {
      const v = Math.max(0, Math.min(1, sig[id] ?? 0));
      bar.style.transform = `scaleX(${v})`;
    }
    for (const r of this.routeRows) r.el.style.setProperty('--glow', String(Math.max(0, Math.min(1, sig[r.source] ?? 0))));
  }

  /* ------------------------------------------------------------------ library */

  private libraryPanel() {
    const exp = h('button', { class: 'btn ghost', type: 'button', text: 'Export…' });
    exp.addEventListener('click', () => this.app.exportSettings());
    const imp = h('button', { class: 'btn ghost', type: 'button', text: 'Import…' });
    imp.addEventListener('click', () => this.app.importSettings());
    const del = h('button', { class: 'btn ghost', type: 'button', text: 'Delete saved preset' });
    del.addEventListener('click', () => {
      const cur = this.app.currentPreset();
      if (this.app.presets().saved.some((p) => p.id === cur) && confirm('Delete this saved preset?')) this.app.deletePreset(cur);
    });
    const reset = h('button', { class: 'btn ghost danger', type: 'button', text: 'Reset everything' });
    reset.addEventListener('click', () => confirm('Reset every setting to its default?') && this.app.resetAll());
    return h('div', { class: 'ctl-list' }, h('div', { class: 'btn-row' }, exp, imp), h('div', { class: 'btn-row' }, del, reset));
  }

  /* ------------------------------------------------------------------ footer */

  private footer() {
    this.recBtn = iconButton(ICONS.rec, 'Record video (R)', () => this.app.toggleRecord(), 'rec');
    return h(
      'footer',
      { class: 'sb-footer' },
      this.hint,
      h(
        'div',
        { class: 'actions' },
        iconButton(ICONS.wash, 'Wash the canvas (C C)', () => this.app.clear()),
        iconButton(ICONS.camera, 'Save image (S)', () => this.app.snapshot()),
        this.recBtn,
        iconButton(ICONS.expand, 'Fullscreen (F)', () => this.app.fullscreen()),
        iconButton(ICONS.eye, 'Performance view (P)', () => this.app.hideUI()),
      ),
    );
  }

  setRecording(on: boolean) {
    this.recBtn.classList.toggle('active', on);
    this.recBtn.innerHTML = on ? ICONS.stop : ICONS.rec;
  }
}

const fmtAmt = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
