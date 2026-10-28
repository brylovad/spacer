export type PlaybackState = "idle" | "playing" | "paused";

/** Wymienialny moduł głosu: dziś synteza wbudowana w przeglądarkę, w przyszłości np. płatny TTS. */
export interface SpeechProvider {
  readonly supported: boolean;
  /** Wywołać w obsłudze kliknięcia — iOS pozwala na dźwięk tylko po geście użytkownika. */
  unlock(): void;
  speak(text: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  onStateChange(listener: (state: PlaybackState) => void): () => void;
}
