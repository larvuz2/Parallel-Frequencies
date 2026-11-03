import type { Transport } from '../input/Transport';
import { ICONS, dropdown, h, iconButton } from './controls';

const fmt = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};

/** Floating playback bar — only exists while a file or the demo is loaded. */
export class TransportBar {
  readonly el: HTMLElement;
  private t: Transport | null = null;
  private playBtn: HTMLButtonElement;
  private loopBtn: HTMLButtonElement;
  private timeEl: HTMLElement;
  private durEl: HTMLElement;
  private nameEl: HTMLElement;
  private scrub: HTMLCanvasElement;
  private hoverT = -1;
  private dragging = false;
  private profile: number[] = [];
  private profileAge = 0;
  onClose?: () => void;

  constructor() {
    this.playBtn = iconButton(ICONS.play, 'Play / pause (Space)', () => this.toggle(), 'play');
    this.loopBtn = iconButton(ICONS.loop, 'Loop', () => {
      if (!this.t) return;
      this.t.loop = !this.t.loop;
      this.loopBtn.classList.toggle('active', this.t.loop);
    });
    this.timeEl = h('span', { class: 'time' });
    this.durEl = h('span', { class: 'time dim' });
    this.nameEl = h('span', { class: 'name' });
    this.scrub = h('canvas', { class: 'scrub' });
    const speed = dropdown(
      [0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => ({ value: String(v), label: `${v}×` })),
      '1',
      (v) => this.t && (this.t.rate = parseFloat(v)),
      { compact: true },
    );
    speed.el.classList.add('speed');
    this.el = h(
      'div',
      { class: 'transport hidden' },
      h('div', { class: 'tp-top' }, this.nameEl, h('div', { class: 'tp-right' }, speed.el, this.loopBtn, iconButton(ICONS.close, 'Close file', () => this.onClose?.(), 'tiny'))),
      h(
        'div',
        { class: 'tp-main' },
        iconButton(ICONS.back, 'Back 10 s (←)', () => this.t && this.t.seek(this.t.position - 10)),
        this.playBtn,
        iconButton(ICONS.fwd, 'Forward 10 s (→)', () => this.t && this.t.seek(this.t.position + 10)),
        this.timeEl,
        this.scrub,
        this.durEl,
      ),
    );
    const posAt = (e: PointerEvent) => {
      const r = this.scrub.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (this.t?.duration ?? 0);
    };
    this.scrub.addEventListener('pointerdown', (e) => {
      if (!this.t) return;
      this.dragging = true;
      this.scrub.setPointerCapture(e.pointerId);
      this.t.seek(posAt(e));
    });
    this.scrub.addEventListener('pointermove', (e) => {
      this.hoverT = posAt(e);
      if (this.dragging && this.t) this.t.seek(this.hoverT);
    });
    this.scrub.addEventListener('pointerup', () => (this.dragging = false));
    this.scrub.addEventListener('pointerleave', () => (this.hoverT = -1));
  }

  attach(t: Transport | null) {
    this.t = t;
    this.el.classList.toggle('hidden', !t);
    this.profile = [];
    this.profileAge = 0;
    if (t) {
      this.nameEl.textContent = t.name;
      this.loopBtn.classList.toggle('active', t.loop);
    }
  }

  toggle() {
    if (!this.t) return;
    if (this.t.playing) this.t.pause();
    else this.t.play();
  }

  tick() {
    const t = this.t;
    if (!t) return;
    this.playBtn.innerHTML = t.playing ? ICONS.pause : ICONS.play;
    this.timeEl.textContent = fmt(t.position);
    this.durEl.textContent = fmt(t.duration);
    const c = this.scrub;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(10, Math.round(c.clientWidth * dpr));
    const hh = Math.max(10, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== hh) {
      c.width = w;
      c.height = hh;
    }
    const bins = Math.floor(w / (3 * dpr));
    if (this.profile.length !== bins || (this.profileAge++ % 120 === 0 && t.kind === 'audio')) this.profile = t.profile(bins);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, w, hh);
    const prog = t.duration ? t.position / t.duration : 0;
    const bw = w / bins;
    for (let i = 0; i < bins; i++) {
      const v = this.profile[i] ?? 0;
      const bh = Math.max(dpr, v * hh * 0.9);
      const played = i / bins < prog;
      ctx.fillStyle = played ? 'rgba(240, 214, 190, 0.95)' : 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(i * bw + bw * 0.2, (hh - bh) / 2, Math.max(1, bw * 0.6), bh);
    }
    if (this.hoverT >= 0 && t.duration) {
      const x = (this.hoverT / t.duration) * w;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x - dpr / 2, 0, dpr, hh);
    }
  }
}
