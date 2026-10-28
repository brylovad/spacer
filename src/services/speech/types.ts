export type PlaybackState = "idle" | "loading" | "playing" | "paused";

export interface VoiceOption {
  id: string;
  name: string;
  /** Głos lepszej jakości (np. „Enhanced”/„Premium” na iOS, „Natural” w Edge, głosy Google). */
  enhanced: boolean;
  /** „natural” — głos neuronowy działający w aplikacji (Piper), „device” — głos systemu telefonu. */
  kind: "natural" | "device";
}

export interface VoiceSettings {
  /** Brak = automatycznie najlepszy dostępny głos. */
  voiceId?: string;
  /** Tempo mowy, 1 = normalne. */
  rate: number;
}

/** Wymienialny moduł głosu (Piper w przeglądarce, głosy systemu, w przyszłości np. płatny TTS). */
export interface SpeechProvider {
  readonly supported: boolean;
  /** Wywołać w obsłudze kliknięcia — iOS pozwala na dźwięk tylko po geście użytkownika. */
  unlock(): void;
  /** Rozpoczyna w tle przygotowanie głosu (np. pobranie modelu), żeby pierwsza wypowiedź startowała szybciej. */
  prepare(): void;
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
  /** Postęp przygotowania głosu (0–1) w stanie „loading”; undefined, gdy nieznany. */
  onProgress(listener: (progress: number | undefined) => void): () => void;
}
