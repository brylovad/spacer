import { config } from "../../config";
import { t } from "../../i18n";
import { loadVoiceSettings } from "../settings";
import type { SpeechProvider } from "./types";
import { WebSpeechProvider } from "./webSpeechProvider";

export type { PlaybackState, SpeechProvider, VoiceOption, VoiceSettings } from "./types";

export const speechProvider: SpeechProvider = new WebSpeechProvider(config.speechLocale, t.voice.enhanced);
speechProvider.configure(loadVoiceSettings());
