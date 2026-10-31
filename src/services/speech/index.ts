import { config } from "../../config";
import { guideById } from "../../guides";
import { t } from "../../i18n";
import { loadProfile } from "../profile";
import { loadPlaybackSettings } from "../settings";
import { HybridSpeechProvider } from "./hybridSpeechProvider";
import { PiperEngine } from "./piper/piperEngine";
import { PIPER_VOICES } from "./piper/voices";
import type { SpeechProvider } from "./types";
import { WebSpeechProvider } from "./webSpeechProvider";

export type { PlaybackState, SpeechProvider, VoiceOption, VoiceSettings } from "./types";

export const speechProvider: SpeechProvider = new HybridSpeechProvider(
  new PiperEngine(),
  new WebSpeechProvider(config.speechLocale, t.voice.enhanced),
  PIPER_VOICES[config.language] ?? [],
  { natural: t.voice.naturalLabel, device: t.voice.deviceLabel },
);

/** Ustawia głos opowieści: głos wybranego przewodnika i tempo. */
export function applyVoice(guideId: string, rate: number) {
  speechProvider.configure({ voiceId: guideById(guideId).voiceId, rate });
}

applyVoice(loadProfile().guideId, loadPlaybackSettings().rate);
