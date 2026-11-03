import type { NoteBus } from '../core/NoteBus';

// Two-row "piano" layout used by most DAWs.
const KEYS: Record<string, number> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};

/** Computer keyboard as a piano — for Safari (no Web MIDI) and for quick tests. */
export class KeyboardInput {
  enabled = false;
  octave = 4;
  private down = new Map<string, number>();
  onNote?: (on: boolean, note: number, vel: number) => void;
  onPedal?: (down: boolean) => void;

  constructor(private bus: NoteBus) {
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => this.releaseAll());
  }

  private key(e: KeyboardEvent, on: boolean) {
    if (!this.enabled || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (on && e.code === 'KeyZ') { this.octave = Math.max(1, this.octave - 1); return; }
    if (on && e.code === 'KeyX') { this.octave = Math.min(7, this.octave + 1); return; }
    if (e.code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      this.bus.control({ controller: 64, value: on ? 1 : 0, channel: 15, source: 'keyboard' });
      this.onPedal?.(on);
      return;
    }
    const off = KEYS[e.code];
    if (off === undefined) return;
    e.preventDefault();
    if (on) {
      if (this.down.has(e.code)) return;
      const note = (this.octave + 1) * 12 + off;
      // a little human variation in velocity
      const vel = 0.45 + Math.random() * 0.4;
      this.down.set(e.code, note);
      this.bus.noteOn({ note, velocity: vel, channel: 15, source: 'keyboard' });
      this.onNote?.(true, note, vel);
    } else {
      const note = this.down.get(e.code);
      if (note === undefined) return;
      this.down.delete(e.code);
      this.bus.noteOff({ note, channel: 15, source: 'keyboard' });
      this.onNote?.(false, note, 0);
    }
  }

  releaseAll() {
    for (const note of this.down.values()) {
      this.bus.noteOff({ note, channel: 15, source: 'keyboard' });
      this.onNote?.(false, note, 0);
    }
    this.down.clear();
  }
}
