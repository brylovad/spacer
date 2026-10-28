import { config } from "../../config";
import type { SpeechProvider } from "./types";
import { WebSpeechProvider } from "./webSpeechProvider";

export type { PlaybackState, SpeechProvider } from "./types";

export const speechProvider: SpeechProvider = new WebSpeechProvider(config.speechLocale);
