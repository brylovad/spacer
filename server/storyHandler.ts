import Anthropic from "@anthropic-ai/sdk";
import type { StoryErrorResponse, StoryRequest, StoryResponse } from "../src/shared/storyApi";

const MODEL = "claude-opus-5-5";
const MAX_SOURCES = 12;
const MAX_EXTRACT_CHARS = 2500;

const LANGUAGE_NAMES: Record<string, string> = {
  pl: "polskim",
  en: "English",
};

function systemPrompt(language: string): string {
  const languageName = LANGUAGE_NAMES[language] ?? language;
  return [
    "Jesteś Spacer: ciepły, błyskotliwy przewodnik miejski, który opowiada słuchaczowi o miejscu, w którym właśnie stoi.",
    `Pisz w języku: ${languageName}.`,
    "Tekst zostanie odczytany przez syntezator mowy, więc pisz jak do słuchania: naturalne zdania, bez list, nagłówków, markdownu, emoji, nawiasów i skrótów; liczby i daty zapisuj tak, by dobrze brzmiały na głos.",
    "Opieraj się wyłącznie na faktach z dostarczonych artykułów Wikipedii. Nie wymyślaj dat, nazwisk ani anegdot. Jeśli źródła są skąpe, opowieść ma być krótsza, a nie zmyślona.",
    "Zacznij od miejsca, w którym słuchacz stoi (ulica, dzielnica), potem wpleć dwa do czterech najciekawszych pobliskich miejsc i ciekawostek, a na koniec zachęć do rozejrzenia się wokół.",
    "Długość: około 200 do 350 słów.",
    'Odpowiedz wyłącznie obiektem JSON: {"title": "krótki tytuł opowieści", "text": "treść opowieści"}.',
  ].join("\n");
}

function userPrompt(req: StoryRequest): string {
  const { street, district, city, country } = req.place;
  const where = [
    street && `Ulica: ${street}`,
    district && `Dzielnica: ${district}`,
    city && `Miasto: ${city}`,
    country && `Kraj: ${country}`,
  ]
    .filter(Boolean)
    .join("\n");
  const sources = req.sources
    .slice(0, MAX_SOURCES)
    .map((s, i) => {
      const distance = s.distanceMeters !== undefined ? ` (ok. ${Math.round(s.distanceMeters)} m od słuchacza)` : "";
      return `<artykul nr="${i + 1}" tytul="${s.title}"${distance}>\n${s.extract.slice(0, MAX_EXTRACT_CHARS)}\n</artykul>`;
    })
    .join("\n\n");
  return `Gdzie stoi słuchacz:\n${where || "nieznane"}\n\nArtykuły z Wikipedii:\n${sources}`;
}

function isStoryRequest(body: unknown): body is StoryRequest {
  const b = body as StoryRequest;
  return (
    typeof b === "object" &&
    b !== null &&
    typeof b.language === "string" &&
    typeof b.place === "object" &&
    Array.isArray(b.sources) &&
    b.sources.every((s) => typeof s?.title === "string" && typeof s?.extract === "string")
  );
}

function json(status: number, body: StoryResponse | StoryErrorResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Obsługa POST /api/story — wspólna dla funkcji Vercela i serwera deweloperskiego Vite. */
export async function handleStoryRequest(request: Request, apiKey: string | undefined): Promise<Response> {
  if (!apiKey) {
    return json(503, { error: "not_configured", message: "Brak ANTHROPIC_API_KEY na serwerze." });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "bad_request", message: "Niepoprawny JSON." });
  }
  if (!isStoryRequest(body) || body.sources.length === 0) {
    return json(400, { error: "bad_request", message: "Brak źródeł do opowieści." });
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Opowieść ma być gotowa szybko — wystarczy niski wysiłek.
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { title: { type: "string" }, text: { type: "string" } },
            required: ["title", "text"],
            additionalProperties: false,
          },
        },
      },
      system: systemPrompt(body.language),
      messages: [{ role: "user", content: userPrompt(body) }],
    });

    if (response.stop_reason === "refusal") {
      return json(422, { error: "refused", message: "Model odmówił przygotowania opowieści." });
    }
    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const story = JSON.parse(text) as StoryResponse;
    return json(200, story);
  } catch (error) {
    console.error("Story generation failed", error);
    if (error instanceof Anthropic.APIError) {
      return json(502, { error: "upstream_error", message: `Błąd API (${error.status ?? "brak statusu"}).` });
    }
    return json(502, { error: "upstream_error", message: "Nie udało się przygotować opowieści." });
  }
}
