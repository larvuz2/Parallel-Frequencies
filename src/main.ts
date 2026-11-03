import './styles.css';
import { Engine } from './core/Engine';
import { ParamStore } from './core/ParamStore';
import { ENGINE_PARAMS } from './core/engineParams';
import type { ModRoute, MovementDefinition, ParamValues, Preset } from './core/types';
import { movementById } from './movements/registry';
import { AudioEngine } from './input/AudioEngine';
import { MidiInput } from './input/MidiInput';
import { KeyboardInput } from './input/KeyboardInput';
import { MidiFilePlayer, parseMidi } from './input/MidiFilePlayer';
import { AudioFilePlayer } from './input/AudioFilePlayer';
import { composeReverie } from './input/DemoComposer';
import type { Transport } from './input/Transport';
import { Sidebar, type AppApi } from './ui/Sidebar';
import { TransportBar } from './ui/TransportBar';
import { ICONS, h, iconButton } from './ui/controls';
import { Recorder, download } from './ui/Recorder';

class App implements AppApi {
  readonly params = new ParamStore();
  readonly movement: MovementDefinition;
  readonly engine: Engine;
  readonly audio = new AudioEngine();
  readonly midi: MidiInput;
  readonly keyboard: KeyboardInput;
  private transport: Transport | null = null;
  private dreaming = false;
  private sidebar: Sidebar;
  private bar = new TransportBar();
  private recorder = new Recorder();
  private toastEl = h('div', { class: 'toast' });
  private statsEl = h('div', { class: 'stats hidden' });
  private hud: HTMLElement;
  private presetId: string;
  private clearArmed = 0;
  private idleTimer = 0;

  constructor() {
    const root = document.getElementById('app')!;
    this.movement = movementById(localStorage.getItem('pf:movement') ?? 'impressionism');
    this.params.storageKey = `pf:params:${this.movement.id}`;
    this.params.register(ENGINE_PARAMS);
    this.params.register(this.movement.params ?? []);
    this.presetId = localStorage.getItem(`pf:preset:${this.movement.id}`) ?? '';
    const restored = this.params.load();
    if (!restored) {
      const first = this.movement.presets?.[0];
      if (first) {
        this.params.applyPreset(first);
        this.presetId = first.id;
      }
      this.params.setRoutes((this.movement.defaultRoutes ?? []).map((r) => ({ ...r })));
    }

    const stage = h('div', { class: 'stage' });
    root.append(stage);
    try {
      this.engine = new Engine(stage, this.params);
    } catch (e) {
      root.append(h('div', { class: 'fatal', text: 'This experience needs WebGL2. Please use a recent Chrome, Edge, Firefox or Safari.' }));
      throw e;
    }
    this.engine.setMovement(this.movement);

    this.midi = new MidiInput(this.engine.bus);
    this.keyboard = new KeyboardInput(this.engine.bus);

    this.hud = h(
      'div',
      { class: 'hud' },
      h('div', { class: 'hud-title', text: this.movement.title }),
      h('div', { class: 'hud-sub', text: this.movement.pairing }),
    );
    this.sidebar = new Sidebar(this);
    const reopen = iconButton(ICONS.panel, 'Show panel (H)', () => this.toggleSidebar(), 'reopen');
    root.append(this.hud, this.sidebar.el, this.bar.el, reopen, this.toastEl, this.statsEl, this.dropOverlay());
    this.bar.onClose = () => this.setTransport(null);

    this.wireInputs();
    this.wireKeys();
    this.wireIdleCursor();
    this.engine.onFrame(() => this.frame());
    this.engine.start();
    if (localStorage.getItem('pf:sb-hidden') === '1') document.body.classList.add('sb-hidden');
  }

  get signals() {
    return this.engine.signals.values;
  }

  /* ---------------------------------------------------------------- inputs */

  private wireInputs() {
    // audio needs a user gesture before it may start
    const unlock = () => {
      this.audio.start().then(() => this.audio.setVolume(this.params.num('src.volume')));
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.audio.onStatus = (s) => this.toast(s);
    this.audio.instrument = this.params.str('src.instrument') as 'piano' | 'soft';

    this.midi.onDevices = (d) => {
      this.sidebar.refreshMidi();
      if (d.length) this.toast(`MIDI connected — ${d.map((x) => x.name).join(', ')}`);
    };
    this.midi.onActivity = () => this.sidebar.blinkMidi();
    this.midi.onNote = (on, n, v) => {
      this.wakeFromDream();
      if (!this.params.bool('src.monitor')) return;
      if (on) this.audio.noteOn(n, v);
      else this.audio.noteOff(n);
    };
    this.midi.onPedal = (d) => this.params.bool('src.monitor') && this.audio.setPedal(d);
    this.midi.init().then(() => this.sidebar.refreshMidi());

    this.keyboard.enabled = this.params.bool('src.keyboard');
    this.keyboard.onNote = (on, n, v) => {
      this.wakeFromDream();
      if (on) this.audio.noteOn(n, v);
      else this.audio.noteOff(n);
    };
    this.keyboard.onPedal = (d) => this.audio.setPedal(d);

    this.params.onChange((k, v) => {
      if (k === 'src.keyboard') {
        this.keyboard.enabled = v as boolean;
        if (v) this.toast('Computer keyboard: A W S E D F T G Y H U J K · Z/X octave · Space = pedal');
      }
      if (k === 'src.volume') this.audio.setVolume(v as number);
      if (k === 'src.instrument') this.audio.instrument = v as 'piano' | 'soft';
      if (k === 'quality.fps') this.statsEl.classList.toggle('hidden', !v);
    });
    this.statsEl.classList.toggle('hidden', !this.params.bool('quality.fps'));
  }

  midiStatus() {
    return { supported: MidiInput.supported, devices: this.midi?.devices ?? [], selected: this.midi?.selected ?? 'all' };
  }

  selectMidi(id: string) {
    this.midi.selected = id;
  }

  /* ---------------------------------------------------------------- files */

  openFile() {
    const input = h('input', { type: 'file', accept: '.mid,.midi,audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac' });
    input.addEventListener('change', () => input.files?.[0] && this.loadFile(input.files[0]));
    input.click();
  }

  async loadFile(file: File) {
    await this.audio.start();
    this.audio.setVolume(this.params.num('src.volume'));
    const isMidi = /\.midi?$/i.test(file.name) || file.type === 'audio/midi' || file.type === 'audio/x-midi';
    try {
      if (isMidi) {
        const seq = parseMidi(await file.arrayBuffer(), file.name.replace(/\.[^.]+$/, ''));
        if (!seq.events.length) throw new Error('No notes found in this MIDI file.');
        this.setTransport(new MidiFilePlayer(seq, this.audio, this.engine.bus));
      } else {
        this.setTransport(new AudioFilePlayer(file, this.audio, this.engine.bus, this.engine.signals));
      }
      this.transport?.play();
      this.toast(`Now playing — ${this.transport?.name}`);
    } catch (e) {
      this.toast(`Could not open this file. ${(e as Error).message ?? ''}`);
    }
  }

  async playDemo() {
    await this.audio.start();
    this.audio.setVolume(this.params.num('src.volume'));
    this.setTransport(new MidiFilePlayer(composeReverie(Math.floor(Math.random() * 1000)), this.audio, this.engine.bus, 'demo'));
    this.transport!.play();
  }

  private setTransport(t: Transport | null) {
    this.transport?.dispose();
    this.transport = t;
    this.dreaming = false;
    this.bar.attach(t);
    document.body.classList.toggle('has-transport', !!t);
  }

  private dropOverlay() {
    const ov = h('div', { class: 'drop' }, h('div', { text: 'Drop a MIDI file or an audio recording' }));
    let depth = 0;
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      depth++;
      ov.classList.add('show');
    });
    window.addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) ov.classList.remove('show');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0;
      ov.classList.remove('show');
      const f = e.dataTransfer?.files?.[0];
      if (f) this.loadFile(f);
    });
    return ov;
  }

  /* ---------------------------------------------------------------- idle dream */

  private frame() {
    this.transport?.tick();
    this.bar.tick();
    this.sidebar.tick();
    if (!this.statsEl.classList.contains('hidden')) {
      this.statsEl.textContent = `${Math.round(this.engine.fps)} fps`;
    }
    if (this.params.bool('src.idle') && (!this.transport || !this.transport.playing)) {
      const now = performance.now() / 1000;
      const idleFor = now - Math.max(this.engine.bus.lastInputTime, this.engine.bus.lastLiveInputTime);
      if (idleFor > this.params.num('src.idleAfter')) this.startDream();
    }
  }

  private startDream() {
    const p = new MidiFilePlayer(composeReverie(Math.floor(Math.random() * 1e6)), this.audio, this.engine.bus, 'demo');
    p.loop = true;
    p.muted = !this.params.bool('src.idleSound');
    this.setTransport(p);
    this.dreaming = true;
    this.bar.attach(null);
    document.body.classList.remove('has-transport');
    p.play();
  }

  private wakeFromDream() {
    if (this.dreaming) this.setTransport(null);
  }

  /* ---------------------------------------------------------------- presets */

  presets() {
    return { builtIn: this.movement.presets ?? [], saved: this.loadSaved() };
  }

  currentPreset() {
    return this.presetId;
  }

  applyPreset(id: string) {
    const { builtIn, saved } = this.presets();
    const p = [...builtIn, ...saved].find((x) => x.id === id);
    if (!p) return;
    this.params.applyPreset(p, 1.6);
    this.presetId = id;
    localStorage.setItem(`pf:preset:${this.movement.id}`, id);
    this.sidebar.refreshPresets();
    this.toast(p.label);
  }

  private stepPreset(dir: number) {
    const all = [...this.presets().builtIn, ...this.presets().saved];
    const i = all.findIndex((p) => p.id === this.presetId);
    const next = all[(i + dir + all.length) % all.length];
    if (next) this.applyPreset(next.id);
  }

  private loadSaved(): Preset[] {
    try {
      return JSON.parse(localStorage.getItem(`pf:saved:${this.movement.id}`) ?? '[]');
    } catch {
      return [];
    }
  }

  private writeSaved(list: Preset[]) {
    localStorage.setItem(`pf:saved:${this.movement.id}`, JSON.stringify(list));
  }

  private movementValues(): ParamValues {
    const snap = this.params.snapshot().values;
    const out: ParamValues = {};
    for (const d of this.movement.params ?? []) out[d.key] = snap[d.key];
    return out;
  }

  savePreset(name: string) {
    const list = this.loadSaved();
    const p: Preset = { id: `user-${Date.now()}`, label: name, description: 'Saved preset.', values: this.movementValues(), routes: this.params.routes.map((r) => ({ ...r })) };
    list.push(p);
    this.writeSaved(list);
    this.presetId = p.id;
    localStorage.setItem(`pf:preset:${this.movement.id}`, p.id);
    this.sidebar.refreshPresets();
    this.toast(`Saved “${name}”`);
  }

  deletePreset(id: string) {
    this.writeSaved(this.loadSaved().filter((p) => p.id !== id));
    this.presetId = '';
    this.sidebar.refreshPresets();
  }

  randomise() {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const opts = (k: string) => {
      const d = this.params.def(k);
      return d && d.type === 'select' ? d.options.map((o) => o.value) : [];
    };
    this.params.apply(
      {
        'im.palette': pick(opts('im.palette')),
        'im.groundTone': pick(opts('im.groundTone')),
        'im.ground': pick(['linen', 'linen', 'coarse', 'paper', 'gesso']),
        'im.layout': pick(['horizon', 'horizon', 'focus', 'scatter', 'radial', 'pitchclass']),
        'im.colorMode': pick(['register', 'register', 'pitchclass', 'harmony', 'height']),
        'im.brush': pick(['auto', 'auto', 'filbert', 'flat', 'round', 'dab']),
        'im.size': r(0.006, 0.02),
        'im.speed': r(0.08, 0.38),
        'im.curvature': r(0, 0.7),
        'im.flowFollow': r(0.1, 0.8),
        'im.horizontality': r(0.2, 0.9),
        'im.brokenColor': r(0.3, 0.8),
        'im.pickup': r(0.2, 0.7),
        'im.impasto': r(0.4, 1.6),
        'im.bristleContrast': r(0.4, 0.9),
        'im.lightAz': r(60, 200),
        'im.lightEl': r(18, 55),
        'im.haze': r(0, 0.12),
      },
      2,
    );
    this.presetId = '';
    this.sidebar.refreshPresets();
    this.toast('A new variation');
  }

  exportSettings() {
    const data = {
      app: 'parallel-frequencies',
      movement: this.movement.id,
      values: this.params.snapshot().values,
      routes: this.params.routes,
      saved: this.loadSaved(),
    };
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `parallel-frequencies-${this.movement.id}.json`);
  }

  importSettings() {
    const input = h('input', { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text()) as { values?: ParamValues; routes?: ModRoute[]; saved?: Preset[] };
        if (data.values) this.params.apply(data.values, 1);
        if (data.routes) this.params.setRoutes(data.routes);
        if (data.saved?.length) {
          const list = this.loadSaved();
          for (const p of data.saved) if (!list.some((x) => x.id === p.id)) list.push(p);
          this.writeSaved(list);
        }
        this.sidebar.refreshPresets();
        this.toast('Settings imported');
      } catch {
        this.toast('That file could not be read.');
      }
    });
    input.click();
  }

  resetAll() {
    this.params.resetToDefaults();
    const first = this.movement.presets?.[0];
    if (first) this.params.applyPreset(first);
    this.params.setRoutes((this.movement.defaultRoutes ?? []).map((r) => ({ ...r })));
    this.presetId = first?.id ?? '';
    this.sidebar.refreshPresets();
  }

  setMovement(id: string) {
    if (id === this.movement.id) return;
    localStorage.setItem('pf:movement', id);
    location.reload();
  }

  /* ---------------------------------------------------------------- actions */

  clear() {
    this.engine.clear();
    this.toast('Washing the canvas');
  }

  async snapshot() {
    const blob = await this.engine.snapshot();
    if (blob) download(blob, `parallel-frequencies-${stamp()}.png`);
    this.toast('Image saved');
  }

  async toggleRecord() {
    if (this.recorder.recording) {
      const blob = await this.recorder.stop();
      this.sidebar.setRecording(false);
      if (blob) download(blob, `parallel-frequencies-${stamp()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
      this.toast('Recording saved');
    } else {
      try {
        this.recorder.start(this.engine.renderer.domElement, this.audio.recordStream());
        this.sidebar.setRecording(true);
        this.toast('Recording…');
      } catch {
        this.toast('Recording is not supported in this browser.');
      }
    }
  }

  isRecording() {
    return this.recorder.recording;
  }

  fullscreen() {
    const d = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (document.fullscreenElement || d.webkitFullscreenElement) {
      (document.exitFullscreen?.bind(document) ?? d.webkitExitFullscreen?.bind(d))?.();
    } else {
      (el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el))?.();
    }
  }

  hideUI() {
    const on = !document.body.classList.contains('perform');
    document.body.classList.toggle('perform', on);
    if (on) this.toast('Performance view — press P or Esc to return');
  }

  private toggleSidebar() {
    if (document.body.classList.contains('perform')) document.body.classList.remove('perform');
    const hidden = document.body.classList.toggle('sb-hidden');
    localStorage.setItem('pf:sb-hidden', hidden ? '1' : '0');
  }

  private toastTimer = 0;
  toast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2600);
  }

  /* ---------------------------------------------------------------- keys & cursor */

  private wireKeys() {
    window.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (t as HTMLInputElement).type !== 'range') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // with the computer-keyboard piano on, shortcuts need Shift
      if (this.params.bool('src.keyboard') && !e.shiftKey && e.code !== 'Escape') return;
      switch (e.code) {
        case 'KeyH': this.toggleSidebar(); break;
        case 'KeyF': this.fullscreen(); break;
        case 'KeyP': this.hideUI(); break;
        case 'Escape': document.body.classList.remove('perform'); break;
        case 'KeyS': this.snapshot(); break;
        case 'KeyR': this.toggleRecord(); break;
        case 'KeyD': this.playDemo(); break;
        case 'KeyO': this.openFile(); break;
        case 'BracketLeft': this.stepPreset(-1); break;
        case 'BracketRight': this.stepPreset(1); break;
        case 'KeyC': {
          const now = performance.now();
          if (now - this.clearArmed < 1200) {
            this.clear();
            this.clearArmed = 0;
          } else {
            this.clearArmed = now;
            this.toast('Press C again to wash the canvas');
          }
          break;
        }
        case 'Space':
          if (this.transport && !this.dreaming) {
            e.preventDefault();
            this.bar.toggle();
          }
          break;
        case 'ArrowLeft': this.transport?.seek(this.transport.position - 5); break;
        case 'ArrowRight': this.transport?.seek(this.transport.position + 5); break;
        default: return;
      }
    });
  }

  private wireIdleCursor() {
    const wake = () => {
      document.body.classList.remove('idle');
      clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(() => document.body.classList.add('idle'), 2800);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    wake();
  }
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

new App();
