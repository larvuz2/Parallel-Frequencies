/** Records the canvas (and the sound, when available) to a video file. */
export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  get recording() {
    return !!this.rec && this.rec.state === 'recording';
  }

  start(canvas: HTMLCanvasElement, audio: MediaStream | null) {
    const stream = canvas.captureStream(60);
    audio?.getAudioTracks().forEach((t) => stream.addTrack(t));
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a', 'video/mp4'];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
    this.chunks = [];
    this.rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 24_000_000 });
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(500);
  }

  stop(): Promise<Blob | null> {
    return new Promise((res) => {
      if (!this.rec) return res(null);
      const rec = this.rec;
      rec.onstop = () => {
        res(new Blob(this.chunks, { type: rec.mimeType || 'video/webm' }));
        this.rec = null;
      };
      rec.stop();
    });
  }
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
