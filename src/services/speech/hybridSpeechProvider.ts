import { PiperEngine } from "./piper/piperEngine";
import type { PiperVoice } from "./piper/voices";
import type { PlaybackState, SpeechProvider, VoiceOption, VoiceSettings } from "./types";

// Identyfikatory głosów niosą informację, który silnik je obsługuje.
export const PIPER_PREFIX = "piper:";
export const DEVICE_PREFIX = "system:";

interface Labels {
  natural: (name: string, sizeMb: number) => string;
  device: (name: string) => string;
}

/** Głosy Piper (domyślnie) z zapasem w postaci głosów systemu telefonu, gdy Piper nie zadziała. */
export class HybridSpeechProvider implements SpeechProvider {
  readonly supported: boolean;
  private settings: VoiceSettings = { rate: 1 };
  private lastError?: string;
  private stateListeners = new Set<(state: PlaybackState) => void>();

  constructor(
    private piper: PiperEngine,
    private device: SpeechProvider,
    private piperVoices: PiperVoice[],
    private labels: Labels,
  ) {
    this.supported = (piper.supported && piperVoices.length > 0) || device.supported;
    const forward = (state: PlaybackState) => this.stateListeners.forEach((l) => l(state));
    piper.onStateChange(forward);
    device.onStateChange(forward);
  }

  private get usePiper(): boolean {
    return this.piper.supported && this.piperVoices.length > 0 && !this.settings.voiceId?.startsWith(DEVICE_PREFIX);
  }

  private get piperVoiceId(): string {
    const chosen = this.settings.voiceId?.startsWith(PIPER_PREFIX) && this.settings.voiceId.slice(PIPER_PREFIX.length);
    return this.piperVoices.find((v) => v.id === chosen)?.id ?? this.piperVoices[0].id;
  }

  unlock() {
    this.piper.unlock();
    this.device.unlock();
  }

  prepare() {
    if (!this.usePiper) return;
    this.piper.load(this.piperVoiceId).catch((error: unknown) => this.recordError(error));
  }

  async getVoices(): Promise<VoiceOption[]> {
    const natural: VoiceOption[] = this.piper.supported
      ? this.piperVoices.map((v) => ({
          id: PIPER_PREFIX + v.id,
          name: this.labels.natural(v.name, v.sizeMb),
          enhanced: true,
          kind: "natural",
        }))
      : [];
    const device = (await this.device.getVoices()).map((v) => ({
      ...v,
      id: DEVICE_PREFIX + v.id,
      name: this.labels.device(v.name),
    }));
    return [...natural, ...device];
  }

  onVoicesChanged(listener: () => void) {
    return this.device.onVoicesChanged(listener);
  }

  describeVoices(): string[] {
    const [count = "0", ...lines] = this.device.describeVoices();
    return [count, ...lines, ...(this.lastError ? [`⚠ Piper: ${this.lastError}`] : [])];
  }

  configure(settings: VoiceSettings) {
    this.settings = settings;
    this.piper.setRate(settings.rate);
    const deviceVoice = settings.voiceId?.startsWith(DEVICE_PREFIX)
      ? settings.voiceId.slice(DEVICE_PREFIX.length)
      : undefined;
    this.device.configure({ ...settings, voiceId: deviceVoice });
  }

  private recordError(error: unknown) {
    this.lastError = error instanceof Error ? error.message : String(error);
    console.warn("Piper failed, using device voice", error);
  }

  speak(text: string) {
    this.stop();
    if (!this.usePiper) {
      this.device.speak(text);
      return;
    }
    this.piper.speak(this.piperVoiceId, text).catch((error: unknown) => {
      this.recordError(error);
      this.device.speak(text);
    });
  }

  pause() {
    this.piper.pause();
    this.device.pause();
  }

  resume() {
    this.piper.resume();
    this.device.resume();
  }

  stop() {
    this.piper.stop();
    this.device.stop();
  }

  onStateChange(listener: (state: PlaybackState) => void) {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onProgress(listener: (progress: number | undefined) => void) {
    return this.piper.onProgress(listener);
  }
}
