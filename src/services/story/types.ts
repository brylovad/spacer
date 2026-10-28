import type { StoryRequest } from "../../shared/storyApi";

export interface Story {
  title: string;
  text: string;
  /** Kto przygotował opowieść — pozwala pokazać w UI, że to wersja zastępcza. */
  narrator: "ai" | "extracts";
  /** Dlaczego nie zadziałał narrator AI (gdy użyto wersji zastępczej). */
  fallbackReason?: string;
}

/** Wymienialny moduł tworzący opowieść ze źródeł (AI, gotowe fragmenty, w przyszłości pamięć podręczna). */
export interface StoryProvider {
  createStory(request: StoryRequest): Promise<Story>;
}
