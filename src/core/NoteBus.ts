import type { ControlEvent, NoteOffEvent, NoteOnEvent } from './types';

export interface NoteBusListener {
  noteOn?(e: NoteOnEvent): void;
  noteOff?(e: NoteOffEvent): void;
  control?(e: ControlEvent): void;
  allNotesOff?(): void;
}

/** Every input (live MIDI, files, audio analysis, computer keyboard, demo) speaks through this bus. */
export class NoteBus {
  private listeners = new Set<NoteBusListener>();
  lastInputTime = 0;
  lastLiveInputTime = -1e9;

  subscribe(l: NoteBusListener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  noteOn(e: NoteOnEvent) {
    this.lastInputTime = performance.now() / 1000;
    if (e.source === 'midi' || e.source === 'keyboard') this.lastLiveInputTime = this.lastInputTime;
    for (const l of this.listeners) l.noteOn?.(e);
  }

  noteOff(e: NoteOffEvent) {
    for (const l of this.listeners) l.noteOff?.(e);
  }

  control(e: ControlEvent) {
    for (const l of this.listeners) l.control?.(e);
  }

  allNotesOff() {
    for (const l of this.listeners) l.allNotesOff?.();
  }
}
