import { config } from "../../config";
import { t } from "../../i18n";
import { loadVoiceSettings } from "../settings";
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
speechProvider.configure(loadVoiceSettings());
