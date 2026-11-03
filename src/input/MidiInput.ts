import type { NoteBus } from '../core/NoteBus';

export interface MidiDeviceInfo {
  id: string;
  name: string;
}

/**
 * Live MIDI through the Web MIDI API (Chrome, Edge, Firefox, Opera).
 * Safari does not implement Web MIDI — there the computer keyboard / files are the way in.
 * Devices are hot-plugged: plug a keyboard in at any time.
 */
export class MidiInput {
  private access: MIDIAccess | null = null;
  selected = 'all';
  devices: MidiDeviceInfo[] = [];
  onDevices?: (d: MidiDeviceInfo[]) => void;
  onActivity?: () => void;
  /** live notes are forwarded here too, so the sound engine can monitor them */
  onNote?: (on: boolean, note: number, vel: number) => void;
  onPedal?: (down: boolean) => void;

  constructor(private bus: NoteBus) {}

  static get supported() {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  async init(): Promise<boolean> {
    if (!MidiInput.supported) return false;
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      return false;
    }
    this.access.onstatechange = () => this.refresh();
    this.refresh();
    return true;
  }

  private refresh() {
    if (!this.access) return;
    this.devices = [];
    this.access.inputs.forEach((input) => {
      this.devices.push({ id: input.id, name: input.name ?? 'MIDI input' });
      input.onmidimessage = (e) => this.handle(input.id, e);
    });
    this.onDevices?.(this.devices);
  }

  private handle(id: string, e: MIDIMessageEvent) {
    if (this.selected !== 'all' && this.selected !== id) return;
    const d = e.data;
    if (!d || d.length < 1) return;
    const status = d[0] & 0xf0;
    const channel = d[0] & 0x0f;
    this.onActivity?.();
    if (status === 0x90 && d[2] > 0) {
      const vel = d[2] / 127;
      this.bus.noteOn({ note: d[1], velocity: vel, channel, source: 'midi' });
      this.onNote?.(true, d[1], vel);
    } else if (status === 0x80 || (status === 0x90 && d[2] === 0)) {
      this.bus.noteOff({ note: d[1], channel, source: 'midi' });
      this.onNote?.(false, d[1], 0);
    } else if (status === 0xb0) {
      const value = d[2] / 127;
      if (d[1] === 123 || d[1] === 120) {
        this.bus.allNotesOff();
        return;
      }
      this.bus.control({ controller: d[1], value, channel, source: 'midi' });
      if (d[1] === 64) this.onPedal?.(value >= 0.5);
    } else if (status === 0xe0) {
      const v = ((d[2] << 7) | d[1]) / 8192 - 1;
      this.bus.control({ controller: -1, value: v, channel, source: 'midi' });
    }
  }
}
