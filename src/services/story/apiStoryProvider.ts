import type { StoryErrorResponse, StoryRequest, StoryResponse } from "../../shared/storyApi";
import type { Story, StoryProvider } from "./types";

/** Opowieść generowana przez model AI na serwerze (/api/story), który przechowuje klucz API. */
export class ApiStoryProvider implements StoryProvider {
  constructor(private endpoint = "/api/story") {}

  async createStory(request: StoryRequest): Promise<Story> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (res.ok) {
      const story = (await res.json()) as StoryResponse;
      return { ...story, narrator: "ai" };
    }
    const error = (await res.json().catch(() => undefined)) as StoryErrorResponse | undefined;
    throw new Error(error?.message ?? `Story API ${res.status}`);
  }
}
