// Wiadomości między aplikacją a wątkiem syntezy Piper.
export type ToWorker =
  | { type: "load"; voiceId: string }
  | { type: "synth"; id: number; voiceId: string; text: string };

export type FromWorker =
  | { type: "progress"; voiceId: string; loaded: number; total: number }
  | { type: "ready"; voiceId: string }
  | { type: "loadError"; voiceId: string; message: string }
  | { type: "audio"; id: number; audio: Blob }
  | { type: "synthError"; id: number; message: string };
