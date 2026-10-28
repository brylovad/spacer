export type PlaybackState = "idle" | "playing" | "paused";

export interface VoiceOption {
  id: string;
  name: string;
  /** Głos lepszej jakości (np. „Enhanced”/„Premium” na iOS, „Natural” w Edge, głosy Google). */
  enhanced: boolean;
}

export interface VoiceSettings {
  /** Brak = automatycznie najlepszy dostępny głos. */
  voiceId?: string;
  /** Tempo mowy, 1 = normalne. */
  rate: number;
}

/** Wymienialny moduł głosu: dziś synteza wbudowana w przeglądarkę, w przyszłości np. płatny TTS. */
export interface SpeechProvider {
  readonly supported: boolean;
  /** Wywołać w obsłudze kliknięcia — iOS pozwala na dźwięk tylko po geście użytkownika. */
  unlock(): void;
  /** Dostępne głosy w języku aplikacji, od najlepszego. */
  getVoices(): Promise<VoiceOption[]>;
  /** Powiadamia, gdy urządzenie zgłosi nową listę głosów (np. po pobraniu głosu w ustawieniach). */
  onVoicesChanged(listener: () => void): () => void;
  /** Surowe informacje o głosach do diagnostyki problemów na konkretnym telefonie. */
  describeVoices(): string[];
  configure(settings: VoiceSettings): void;
  speak(text: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  onStateChange(listener: (state: PlaybackState) => void): () => void;
}
