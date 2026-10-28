import type { StoryRequest } from "../../shared/storyApi";
import { ApiStoryProvider } from "./apiStoryProvider";
import { ExtractsStoryProvider } from "./extractsStoryProvider";
import type { Story, StoryProvider } from "./types";

export type { Story, StoryProvider } from "./types";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Próbuje narratora AI, a gdy jest niedostępny — składa opowieść z fragmentów Wikipedii. */
class FallbackStoryProvider implements StoryProvider {
  constructor(private providers: StoryProvider[]) {}

  async createStory(request: StoryRequest): Promise<Story> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        const story = await provider.createStory(request);
        return lastError === undefined ? story : { ...story, fallbackReason: errorText(lastError) };
      } catch (error) {
        console.warn("Story provider failed, trying next", error);
        lastError = error;
      }
    }
    throw lastError;
  }
}

export const storyProvider: StoryProvider = new FallbackStoryProvider([
  new ApiStoryProvider(),
  new ExtractsStoryProvider(),
]);
