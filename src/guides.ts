import { PIPER_PREFIX } from "./services/speech/hybridSpeechProvider";

// Postacie przewodników. Różnią się imieniem, głosem i geometrycznym awatarem (ShapeArt z ziarnem = id);
// charakter postaci dopracujemy później.
export type GuideId = "kompas" | "sowa" | "lisc";

export interface Guide {
  id: GuideId;
  name: string;
  /** Głos opowieści — zmiana postaci zmienia głos. */
  voiceId: string;
}

export const GUIDES: Guide[] = [
  { id: "kompas", name: "Kompas", voiceId: `${PIPER_PREFIX}pl_PL-gosia-medium` },
  { id: "sowa", name: "Sowa", voiceId: `${PIPER_PREFIX}pl_PL-darkman-medium` },
  { id: "lisc", name: "Liść", voiceId: `${PIPER_PREFIX}pl_PL-mc_speech-medium` },
];

export const DEFAULT_GUIDE: GuideId = "kompas";

export function guideById(id: string | undefined): Guide {
  return GUIDES.find((g) => g.id === id) ?? GUIDES[0];
}

// Zainteresowania. Na razie tylko zapisywane — wpływ na opowieść dodamy później.
export type InterestId = "general" | "nature" | "architecture";

export const INTERESTS: InterestId[] = ["general", "nature", "architecture"];
export const DEFAULT_INTERESTS: InterestId[] = ["general"];
