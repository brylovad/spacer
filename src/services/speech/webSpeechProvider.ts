import type { PlaybackState, SpeechProvider } from "./types";

// Chrome urywa długie wypowiedzi po ok. 15 s, więc czytamy tekst krótszymi kawałkami.
const MAX_CHUNK_CHARS = 200;

function splitIntoChunks(text: string): string[] {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export class WebSpeechProvider implements SpeechProvider {
  readonly supported = typeof window !== "undefined" && "speechSynthesis" in window;
  private listeners = new Set<(state: PlaybackState) => void>();
  private queue: string[] = [];
  private state: PlaybackState = "idle";
  /** Zwiększany przy każdym speak/stop, żeby zdarzenia starych wypowiedzi nie ruszały kolejki. */
  private session = 0;

  constructor(private locale: string) {}

  private get synth() {
    return window.speechSynthesis;
  }

  private setState(state: PlaybackState) {
    this.state = state;
    this.listeners.forEach((l) => l(state));
  }

  private pickVoice(): SpeechSynthesisVoice | undefined {
    const lang = this.locale.toLowerCase();
    const voices = this.synth.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(lang.slice(0, 2)));
    return voices.find((v) => v.lang.toLowerCase().replace("_", "-") === lang && v.localService) ?? voices[0];
  }

  unlock() {
    if (!this.supported) return;
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    this.synth.speak(u);
  }

  speak(text: string) {
    if (!this.supported) return;
    this.stop();
    this.queue = splitIntoChunks(text);
    this.setState("playing");
    this.speakNext(this.session);
  }

  private speakNext(session: number) {
    if (session !== this.session) return;
    const chunk = this.queue.shift();
    if (!chunk) {
      this.setState("idle");
      return;
    }
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = this.locale;
    const voice = this.pickVoice();
    if (voice) u.voice = voice;
    u.onend = () => this.speakNext(session);
    u.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") console.warn("Speech error", e.error);
      this.speakNext(session);
    };
    this.synth.speak(u);
  }

  pause() {
    if (this.state !== "playing") return;
    this.synth.pause();
    this.setState("paused");
  }

  resume() {
    if (this.state !== "paused") return;
    this.synth.resume();
    this.setState("playing");
  }

  stop() {
    if (!this.supported) return;
    this.session++;
    this.queue = [];
    this.synth.cancel();
    if (this.state !== "idle") this.setState("idle");
  }

  onStateChange(listener: (state: PlaybackState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
