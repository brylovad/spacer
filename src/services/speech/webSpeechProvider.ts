import { splitIntoChunks } from "./text";
import type { PlaybackState, SpeechProvider, VoiceOption, VoiceSettings } from "./types";

// Chrome urywa długie wypowiedzi po ok. 15 s, więc czytamy tekst krótszymi kawałkami.
const MAX_CHUNK_CHARS = 200;
// Przeglądarki ładują listę głosów asynchronicznie; dłużej nie czekamy.
const VOICES_TIMEOUT_MS = 1500;
const ENHANCED_PATTERN = /enhanced|premium|natural|neural|wavenet|google|online/i;

function normalizeLang(lang: string): string {
  return lang.toLowerCase().replace("_", "-");
}

function isEnhanced(voice: SpeechSynthesisVoice): boolean {
  // iOS oznacza lepsze głosy w voiceURI (com.apple.voice.enhanced…, …premium…), Edge w nazwie („Natural”).
  return ENHANCED_PATTERN.test(voice.name) || ENHANCED_PATTERN.test(voice.voiceURI);
}

/** Etykieta czytelna dla użytkownika, np. „Zosia (lepsza jakość)”. */
function voiceLabel(voice: SpeechSynthesisVoice, enhancedLabel: string): string {
  const name = voice.name
    .replace(/^(Microsoft|Google)\s+/i, "")
    .replace(/\s*\((Enhanced|Premium|Ulepszony|Rozszerzony)\)\s*/i, "")
    .replace(/\s+Online \(Natural\)\s*-.*$/i, "")
    .replace(/\s*-\s*Polish.*$/i, "");
  return isEnhanced(voice) ? `${name} (${enhancedLabel})` : name;
}

export class WebSpeechProvider implements SpeechProvider {
  readonly supported = typeof window !== "undefined" && "speechSynthesis" in window;
  private listeners = new Set<(state: PlaybackState) => void>();
  private queue: string[] = [];
  private state: PlaybackState = "idle";
  /** Zwiększany przy każdym speak/stop, żeby zdarzenia starych wypowiedzi nie ruszały kolejki. */
  private session = 0;
  private settings: VoiceSettings = { rate: 1 };

  constructor(
    private locale: string,
    private enhancedLabel: string,
  ) {}

  private get synth() {
    return window.speechSynthesis;
  }

  private setState(state: PlaybackState) {
    this.state = state;
    this.listeners.forEach((l) => l(state));
  }

  /** Głosy w języku aplikacji: najpierw lepszej jakości, potem dokładny locale, potem lokalne. */
  private matchingVoices(): SpeechSynthesisVoice[] {
    const locale = normalizeLang(this.locale);
    const score = (v: SpeechSynthesisVoice) =>
      (isEnhanced(v) ? 4 : 0) + (normalizeLang(v.lang) === locale ? 2 : 0) + (v.localService ? 1 : 0);
    return this.synth
      .getVoices()
      .filter((v) => normalizeLang(v.lang).startsWith(locale.slice(0, 2)))
      .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  }

  private loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.supported) return Promise.resolve([]);
    const voices = this.matchingVoices();
    if (voices.length > 0) return Promise.resolve(voices);
    return new Promise((resolve) => {
      const done = () => {
        this.synth.removeEventListener("voiceschanged", done);
        clearTimeout(timer);
        resolve(this.matchingVoices());
      };
      const timer = setTimeout(done, VOICES_TIMEOUT_MS);
      this.synth.addEventListener("voiceschanged", done);
    });
  }

  async getVoices(): Promise<VoiceOption[]> {
    const voices = await this.loadVoices();
    return voices.map((v) => ({
      id: v.voiceURI,
      name: voiceLabel(v, this.enhancedLabel),
      enhanced: isEnhanced(v),
      kind: "device",
    }));
  }

  onVoicesChanged(listener: () => void) {
    if (!this.supported) return () => {};
    // Safari dokłada głosy stopniowo; po powrocie z Ustawień lista też mogła się zmienić.
    const onVisible = () => {
      if (document.visibilityState === "visible") listener();
    };
    this.synth.addEventListener("voiceschanged", listener);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      this.synth.removeEventListener("voiceschanged", listener);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }

  describeVoices(): string[] {
    if (!this.supported) return [];
    const all = this.synth.getVoices();
    const prefix = normalizeLang(this.locale).slice(0, 2);
    const matching = all
      .filter((v) => normalizeLang(v.lang).startsWith(prefix))
      .map((v) => `${v.name} · ${v.lang} · ${v.voiceURI}${v.localService ? "" : " · online"}`);
    return [`${all.length}`, ...matching];
  }

  prepare() {}

  onProgress() {
    return () => {};
  }

  configure(settings: VoiceSettings) {
    this.settings = settings;
  }

  private currentVoice(): SpeechSynthesisVoice | undefined {
    const voices = this.matchingVoices();
    return voices.find((v) => v.voiceURI === this.settings.voiceId) ?? voices[0];
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
    this.queue = splitIntoChunks(text, MAX_CHUNK_CHARS);
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
    u.rate = this.settings.rate;
    const voice = this.currentVoice();
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
