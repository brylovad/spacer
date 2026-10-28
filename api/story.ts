// Rozszerzenie .js jest wymagane: Vercel uruchamia funkcję jako moduł ESM w Node,
// który nie dopisuje rozszerzeń do importów.
import { handleStoryRequest } from "../server/storyHandler.js";

// Funkcja Vercela. GET /api/story — diagnostyka konfiguracji, POST /api/story — opowieść.
export async function GET(request: Request): Promise<Response> {
  return handleStoryRequest(request, process.env.ANTHROPIC_API_KEY);
}

export async function POST(request: Request): Promise<Response> {
  return handleStoryRequest(request, process.env.ANTHROPIC_API_KEY);
}
