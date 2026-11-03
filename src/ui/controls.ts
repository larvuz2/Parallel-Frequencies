import type { ColorParam, RangeParam, SelectOption, SelectParam, ToggleParam } from '../core/types';
import type { ParamStore } from '../core/ParamStore';

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | undefined> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c != null) el.append(c);
  return el;
}

/** Hover hints are shown in the sidebar footer. */
export const hintBus = {
  set: (_t: string | null) => {},
};

export function withHint(el: HTMLElement, title: string, hint?: string) {
  if (!hint) return el;
  el.addEventListener('pointerenter', () => hintBus.set(`<b>${title}</b> — ${hint}`));
  el.addEventListener('pointerleave', () => hintBus.set(null));
  return el;
}

/* -------------------------------------------------------------------- range */

export function rangeControl(def: RangeParam, store: ParamStore) {
  const fmt = def.format ?? ((v: number) => (def.step >= 1 ? String(Math.round(v)) : v.toFixed(2)));
  const input = h('input', { type: 'range', min: def.min, max: def.max, step: def.step, value: store.num(def.key) });
  const value = h('span', { class: 'ctl-value' });
  const row = h('div', { class: 'ctl ctl-range' }, h('div', { class: 'ctl-head' }, h('label', { text: def.label }), value), input);
  const paint = (v: number) => {
    value.textContent = fmt(v);
    const t = (v - def.min) / (def.max - def.min);
    input.style.setProperty('--t', String(Math.max(0, Math.min(1, t))));
    if (document.activeElement !== input) input.value = String(v);
  };
  input.addEventListener('input', () => store.set(def.key, parseFloat(input.value)));
  input.addEventListener('dblclick', () => store.set(def.key, def.default));
  store.onChange((k, v) => k === def.key && paint(v as number));
  paint(store.num(def.key));
  return withHint(row, def.label, (def.hint ?? '') + (def.hint ? ' ' : '') + '<i>Double-click to reset.</i>');
}

/* -------------------------------------------------------------------- toggle */

export function toggleControl(def: ToggleParam, store: ParamStore) {
  const sw = h('button', { class: 'switch', type: 'button', role: 'switch' });
  const row = h('div', { class: 'ctl ctl-toggle' }, h('label', { text: def.label }), sw);
  const paint = (v: boolean) => {
    sw.classList.toggle('on', v);
    sw.setAttribute('aria-checked', String(v));
  };
  row.addEventListener('click', () => store.set(def.key, !store.bool(def.key)));
  store.onChange((k, v) => k === def.key && paint(v as boolean));
  paint(store.bool(def.key));
  return withHint(row, def.label, def.hint);
}

/* -------------------------------------------------------------------- color */

export function colorControl(def: ColorParam, store: ParamStore) {
  const input = h('input', { type: 'color', value: store.str(def.key) });
  const hex = h('span', { class: 'ctl-value hex' });
  const swatch = h('span', { class: 'color-swatch' }, input);
  const row = h('div', { class: 'ctl ctl-color' }, h('label', { text: def.label }), h('span', { class: 'color-pick' }, hex, swatch));
  const paint = (v: string) => {
    hex.textContent = v.toUpperCase();
    swatch.style.background = v;
    if (input.value.toLowerCase() !== v.toLowerCase()) input.value = v;
  };
  input.addEventListener('input', () => store.set(def.key, input.value));
  row.addEventListener('dblclick', () => store.set(def.key, def.default));
  store.onChange((k, v) => k === def.key && paint(v as string));
  paint(store.str(def.key));
  return withHint(row, def.label, (def.hint ? def.hint + ' ' : '') + '<i>Double-click to reset.</i>');
}

/* -------------------------------------------------------------------- dropdown */

let openDropdown: (() => void) | null = null;
document.addEventListener('pointerdown', (e) => {
  if (openDropdown && !(e.target as HTMLElement).closest('.dd-menu, .dd-button')) openDropdown();
});

export interface Dropdown {
  el: HTMLElement;
  set(value: string): void;
  setOptions(o: SelectOption[]): void;
}

export function dropdown(options: SelectOption[], value: string, onSelect: (v: string) => void, opts: { compact?: boolean; groups?: Record<string, string> } = {}): Dropdown {
  let current = value;
  let opts_ = options;
  const label = h('span', { class: 'dd-label' });
  const sw = h('span', { class: 'dd-swatches' });
  const btn = h('button', { class: `dd-button${opts.compact ? ' compact' : ''}`, type: 'button' }, sw, label, h('span', { class: 'dd-caret', text: '⌄' }));
  const swatches = (cols?: string[]) => {
    const s = h('span', { class: 'swatches' });
    for (const c of cols ?? []) s.append(h('i', { style: `background:${c}` }));
    return s;
  };
  const render = () => {
    const o = opts_.find((x) => x.value === current);
    label.textContent = o?.label ?? current;
    sw.replaceChildren(o?.swatches ? swatches(o.swatches) : '');
  };
  const close = () => {
    document.querySelectorAll('.dd-menu').forEach((m) => m.remove());
    btn.classList.remove('open');
    openDropdown = null;
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (btn.classList.contains('open')) return close();
    openDropdown?.();
    const menu = h('div', { class: 'dd-menu' });
    let lastGroup = '';
    for (const o of opts_) {
      const g = opts.groups?.[o.value];
      if (g && g !== lastGroup) {
        menu.append(h('div', { class: 'dd-group', text: g }));
        lastGroup = g;
      }
      const item = h(
        'button',
        { class: `dd-item${o.value === current ? ' active' : ''}${o.disabled ? ' disabled' : ''}`, type: 'button' },
        o.swatches ? swatches(o.swatches) : '',
        h('span', { text: o.label }),
      );
      if (!o.disabled)
        item.addEventListener('click', () => {
          current = o.value;
          render();
          close();
          onSelect(o.value);
        });
      menu.append(item);
    }
    document.body.append(menu);
    const r = btn.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 16, Math.max(r.width, opts.compact ? 200 : 290));
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(8, r.right - width)}px`;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const need = Math.min(420, menu.scrollHeight);
    if (below >= need || below >= above) {
      menu.style.top = `${r.bottom + 4}px`;
      menu.style.maxHeight = `${Math.min(420, below)}px`;
    } else {
      menu.style.bottom = `${window.innerHeight - r.top + 4}px`;
      menu.style.maxHeight = `${Math.min(420, above)}px`;
    }
    btn.classList.add('open');
    openDropdown = close;
    menu.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  });
  render();
  return {
    el: btn,
    set(v: string) {
      current = v;
      render();
    },
    setOptions(o: SelectOption[]) {
      opts_ = o;
      render();
    },
  };
}

export function selectControl(def: SelectParam, store: ParamStore) {
  const dd = dropdown(def.options, store.str(def.key), (v) => store.set(def.key, v));
  const row = h('div', { class: 'ctl ctl-select' }, h('label', { text: def.label }), dd.el);
  store.onChange((k, v) => k === def.key && dd.set(v as string));
  return withHint(row, def.label, def.hint);
}

export function iconButton(icon: string, title: string, onClick: () => void, cls = '') {
  const b = h('button', { class: `icon-btn ${cls}`, type: 'button', title, 'aria-label': title });
  b.innerHTML = icon;
  b.addEventListener('click', onClick);
  return b;
}

export const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M11.5 7 6 12l5.5 5M18 7l-5.5 5 5.5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fwd: '<svg viewBox="0 0 24 24"><path d="m12.5 7 5.5 5-5.5 5M6 7l5.5 5L6 17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  loop: '<svg viewBox="0 0 24 24"><path d="M5 11V9.5A2.5 2.5 0 0 1 7.5 7H18l-2.5-2.5M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H6l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wash: '<svg viewBox="0 0 24 24"><path d="M4 16c3-1 5 1 8 0s5-1 8 0M4 11c3-1 5 1 8 0s5-1 8 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 7l1.2-2h3.6L15 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  rec: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="currentColor"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  panel: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M14.5 4.5v15" stroke="currentColor" stroke-width="1.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/></svg>',
};
