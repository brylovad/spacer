import { handleStoryRequest } from "../server/storyHandler";

// Funkcja Vercela: POST /api/story
export async function POST(request: Request): Promise<Response> {
  return handleStoryRequest(request, process.env.ANTHROPIC_API_KEY);
}
