import { splitIntoChunks } from "../text";
import type { PlaybackState } from "../types";
import type { FromWorker, ToWorker } from "./protocol";

// Pierwszy fragment krótki, żeby mowa ruszyła szybko; kolejne dłuższe — syntezują się w trakcie odtwarzania poprzednich.
const FIRST_CHUNK_CHARS = 120;
const CHUNK_CHARS = 300;
// 0,05 s ciszy (WAV 8 kHz, 8 bit) do „odblokowania” odtwarzacza na iOS w geście użytkownika.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

function chunksFor(text: string): string[] {
  const [first, ...rest] = splitIntoChunks(text, FIRST_CHUNK_CHARS);
  return first ? [first, ...splitIntoChunks(rest.join(" "), CHUNK_CHARS)] : [];
}

/** Odtwarzanie mowy z modelu Piper działającego w Web Workerze. */
export class PiperEngine {
  readonly supported = typeof Worker !== "undefined" && typeof Audio !== "undefined" && "storage" in navigator;
  private worker?: Worker;
  private audio?: HTMLAudioElement;
  private nextId = 0;
  private pending = new Map<number, { resolve: (blob: Blob) => void; reject: (error: Error) => void }>();
  private loads = new Map<string, Promise<void>>();
  private loadWaiters = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  private session = 0;
  private state: PlaybackState = "idle";
  private rate = 1;
  /** Kończy oczekiwanie na koniec bieżącego fragmentu (także przy stop). Ustawione, gdy fragment jest w odtwarzaczu. */
  private finishCurrent?: () => void;
  private stateListeners = new Set<(state: PlaybackState) => void>();
  private progressListeners = new Set<(progress: number | undefined) => void>();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./piper.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (event: MessageEvent<FromWorker>) => this.handle(event.data);
      this.worker.onerror = (event) => this.failAll(new Error(event.message || "Piper worker error"));
    }
    return this.worker;
  }

  private getAudio(): HTMLAudioElement {
    this.audio ??= new Audio();
    return this.audio;
  }

  private handle(msg: FromWorker) {
    switch (msg.type) {
      case "progress":
        if (msg.total > 0) this.progressListeners.forEach((l) => l(msg.loaded / msg.total));
        break;
      case "ready":
        this.loadWaiters.get(msg.voiceId)?.resolve();
        break;
      case "loadError":
        this.loads.delete(msg.voiceId);
        this.loadWaiters.get(msg.voiceId)?.reject(new Error(msg.message));
        break;
      case "audio":
        this.pending.get(msg.id)?.resolve(msg.audio);
        this.pending.delete(msg.id);
        break;
      case "synthError":
        this.pending.get(msg.id)?.reject(new Error(msg.message));
        this.pending.delete(msg.id);
        break;
    }
  }

  private failAll(error: Error) {
    this.pending.forEach((p) => p.reject(error));
    this.pending.clear();
    this.loadWaiters.forEach((w) => w.reject(error));
    this.loads.clear();
    this.worker?.terminate();
    this.worker = undefined;
  }

  private send(message: ToWorker) {
    this.getWorker().postMessage(message);
  }

  private setState(state: PlaybackState) {
    if (this.state === state) return;
    this.state = state;
    this.stateListeners.forEach((l) => l(state));
  }

  /** Pobiera i uruchamia model głosu (raz na sesję strony). */
  load(voiceId: string): Promise<void> {
    let load = this.loads.get(voiceId);
    if (!load) {
      load = new Promise<void>((resolve, reject) => {
        this.loadWaiters.set(voiceId, { resolve, reject });
        this.send({ type: "load", voiceId });
      });
      this.loads.set(voiceId, load);
      load.catch(() => {}).finally(() => this.loadWaiters.delete(voiceId));
    }
    return load;
  }

  private synth(voiceId: string, text: string): Promise<Blob> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ type: "synth", id, voiceId, text });
    });
  }

  unlock() {
    const audio = this.getAudio();
    audio.src = SILENT_WAV;
    audio.play().catch(() => {});
  }

  setRate(rate: number) {
    this.rate = rate;
    if (this.audio) this.audio.playbackRate = rate;
  }

  /** Czyta tekst; kończy się po przeczytaniu całości lub po stop(). Odrzuca, gdy Piper nie działa. */
  async speak(voiceId: string, text: string): Promise<void> {
    this.stop();
    const session = ++this.session;
    const chunks = chunksFor(text);
    if (chunks.length === 0) return;
    this.setState("loading");
    try {
      await this.load(voiceId);
      let next: Promise<Blob> | undefined = this.synth(voiceId, chunks[0]);
      for (let i = 0; i < chunks.length && next; i++) {
        const blob: Blob = await next;
        if (session !== this.session) return;
        next = i + 1 < chunks.length ? this.synth(voiceId, chunks[i + 1]) : undefined;
        // Nieużyty wynik (po stop) nie może zgłosić nieobsłużonego błędu.
        next?.catch(() => {});
        await this.playBlob(blob, session);
        if (session !== this.session) return;
      }
      this.setState("idle");
    } catch (error) {
      if (session === this.session) this.setState("idle");
      throw error;
    }
  }

  private playBlob(blob: Blob, session: number): Promise<void> {
    const audio = this.getAudio();
    const url = URL.createObjectURL(blob);
    return new Promise<void>((resolve, reject) => {
      const finish = () => {
        audio.onended = null;
        audio.onerror = null;
        this.finishCurrent = undefined;
        URL.revokeObjectURL(url);
        resolve();
      };
      this.finishCurrent = finish;
      audio.onended = finish;
      audio.onerror = () => {
        finish();
        reject(new Error("Nie udało się odtworzyć dźwięku."));
      };
      audio.src = url;
      audio.playbackRate = this.rate;
      // Gdy użytkownik wstrzymał w trakcie syntezy, fragment czeka na wznowienie.
      if (this.state === "paused") return;
      audio
        .play()
        .then(() => {
          if (session === this.session && this.state !== "paused") this.setState("playing");
        })
        .catch((error: unknown) => {
          finish();
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  pause() {
    if (this.state !== "playing" && this.state !== "loading") return;
    this.audio?.pause();
    this.setState("paused");
  }

  resume() {
    if (this.state !== "paused") return;
    if (this.finishCurrent) {
      this.setState("playing");
      this.audio?.play().catch(() => {});
    } else {
      // Następny fragment jeszcze się syntezuje — playBlob uruchomi go sam.
      this.setState("loading");
    }
  }

  stop() {
    this.session++;
    this.audio?.pause();
    this.finishCurrent?.();
    this.setState("idle");
  }

  onStateChange(listener: (state: PlaybackState) => void) {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onProgress(listener: (progress: number | undefined) => void) {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }
}
