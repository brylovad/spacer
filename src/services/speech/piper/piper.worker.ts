/// <reference lib="webworker" />
import { INFERENCE_PROGRESS_URL, TtsSession, remove } from "@mintplex-labs/piper-tts-web";
import type { FromWorker, ToWorker } from "./protocol";

// Synteza w osobnym wątku, żeby interfejs nie zamarzał. Model pobiera się raz i zostaje w pamięci przeglądarki.

declare const self: DedicatedWorkerGlobalScope;

let session: Promise<TtsSession> | undefined;
let sessionVoice: string | undefined;

function post(message: FromWorker) {
  self.postMessage(message);
}

function getSession(voiceId: string): Promise<TtsSession> {
  if (!session || sessionVoice !== voiceId) {
    // Biblioteka trzyma jedną sesję na stronę; zmiana głosu wymaga nowej.
    TtsSession._instance = null;
    sessionVoice = voiceId;
    const created = TtsSession.create({
      voiceId,
      progress: ({ url, loaded, total }) => {
        if (url !== INFERENCE_PROGRESS_URL && url.endsWith(".onnx")) post({ type: "progress", voiceId, loaded, total });
      },
    });
    session = created;
    created.catch(() => {
      if (session === created) session = undefined;
    });
  }
  return session;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  if (msg.type === "load") {
    try {
      await getSession(msg.voiceId);
      post({ type: "ready", voiceId: msg.voiceId });
    } catch (error) {
      // Biblioteka zapisuje pobrane pliki bez sprawdzania statusu odpowiedzi — usuwamy je,
      // żeby uszkodzony model (np. strona błędu) nie psuł głosu przy kolejnych próbach.
      await remove(msg.voiceId).catch(() => {});
      post({ type: "loadError", voiceId: msg.voiceId, message: message(error) });
    }
    return;
  }
  try {
    const tts = await getSession(msg.voiceId);
    post({ type: "audio", id: msg.id, audio: await tts.predict(msg.text) });
  } catch (error) {
    post({ type: "synthError", id: msg.id, message: message(error) });
  }
};
