/**
 * Original instrumental demonstration, created specifically for this project.
 * Audio playback starts ONLY following a user gesture. No copyrighted recording,
 * imitation of an identified singer, or claim of an authentic traditional song.
 */
const track = `${import.meta.env.BASE_URL}audio/night-river-original.mp3`;

export class NightMusic {
  private readonly audio: HTMLAudioElement;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private disposed = false;

  constructor() {
    this.audio = new Audio(track);
    this.audio.preload = 'none';
    this.audio.loop = true;
    this.audio.volume = 0.47;
  }

  get playing(): boolean {
    return !this.audio.paused;
  }

  async toggle(): Promise<boolean> {
    if (this.disposed) return false;
    if (this.playing) {
      this.audio.pause();
      return false;
    }
    // Called synchronously by the React click handler; browser gesture permits
    // first-time AudioContext initialization and media playback.
    if (!this.context) {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.78;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      const source = this.context.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
    await this.context.resume();
    await this.audio.play();
    return true;
  }

  /**
   * Read actual FFT energy; called from Pixi ticker, not a React state loop.
   * A gentle envelope drives the subtle painted-water reflection overlay.
   */
  sampleEnergy(): number {
    if (!this.playing || !this.analyser || !this.frequencyData) return 0;
    this.analyser.getByteFrequencyData(this.frequencyData);
    let sum = 0;
    const count = Math.min(this.frequencyData.length, 52);
    for (let i = 2; i < count; i += 1) sum += this.frequencyData[i];
    return Math.min(1, Math.max(0, sum / Math.max(1, count - 2) / 76));
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
    this.audio.removeAttribute('src');
    this.audio.load();
    void this.context?.close();
    this.context = null;
    this.analyser = null;
    this.frequencyData = null;
  }
}
