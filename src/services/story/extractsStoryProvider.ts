import type { StoryRequest } from "../../shared/storyApi";
import type { Story, StoryProvider } from "./types";

// Wersja bez AI: składa opowieść z pierwszych zdań artykułów.

function firstSentences(text: string, count: number): string {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, count).join(" ").trim();
}

export class ExtractsStoryProvider implements StoryProvider {
  async createStory({ place, sources }: StoryRequest): Promise<Story> {
    const where = [place.street, place.district, place.city].filter(Boolean).join(", ");
    const intro = where ? `Jesteś w miejscu: ${where}.` : "";
    const parts = sources.slice(0, 5).map((s) => {
      const text = firstSentences(s.extract, 3);
      // Wstęp artykułu zwykle zaczyna się od jego nazwy — wtedy nie powtarzamy tytułu.
      const baseTitle = s.title.replace(/\s*\(.*\)$/, "");
      return text.startsWith(baseTitle) ? text : `${s.title}. ${text}`;
    });
    return {
      title: place.district ?? place.city ?? sources[0]?.title ?? "Okolica",
      text: [intro, ...parts].filter(Boolean).join("\n\n"),
      narrator: "extracts",
    };
  }
}
