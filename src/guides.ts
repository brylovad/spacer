import { PIPER_PREFIX } from "./services/speech/hybridSpeechProvider";

// Postacie przewodników. Na razie różnią się imieniem, awatarem i głosem;
// wygląd i charakter dopracujemy razem z design systemem.
export type GuideId = "kompas" | "sowa" | "lisc";

export interface Guide {
  id: GuideId;
  name: string;
  /** Tymczasowy awatar (emoji) do czasu ilustracji. */
  avatar: string;
  /** Głos opowieści — zmiana postaci zmienia głos. */
  voiceId: string;
}

export const GUIDES: Guide[] = [
  { id: "kompas", name: "Kompas", avatar: "🧭", voiceId: `${PIPER_PREFIX}pl_PL-gosia-medium` },
  { id: "sowa", name: "Sowa", avatar: "🦉", voiceId: `${PIPER_PREFIX}pl_PL-darkman-medium` },
  { id: "lisc", name: "Liść", avatar: "🍃", voiceId: `${PIPER_PREFIX}pl_PL-mc_speech-medium` },
];

export const DEFAULT_GUIDE: GuideId = "kompas";

export function guideById(id: string | undefined): Guide {
  return GUIDES.find((g) => g.id === id) ?? GUIDES[0];
}

// Zainteresowania. Na razie tylko zapisywane — wpływ na opowieść dodamy później.
export type InterestId = "general" | "nature" | "architecture";

export const INTERESTS: InterestId[] = ["general", "nature", "architecture"];
export const DEFAULT_INTERESTS: InterestId[] = ["general"];
