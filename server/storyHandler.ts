import Anthropic from "@anthropic-ai/sdk";
import type { StoryErrorResponse, StoryRequest, StoryResponse, StoryStatusResponse } from "../src/shared/storyApi.js";

const MODEL = "claude-opus-5-5";
const MAX_SOURCES = 12;
const MAX_EXTRACT_CHARS = 2500;
// Przy opowieści o całym mieście, regionie czy kraju główny artykuł może być dłuższy.
const MAX_MAIN_EXTRACT_CHARS = 12000;

const LANGUAGE_NAMES: Record<string, string> = {
  pl: "polskim",
  en: "English",
};

const SCOPE_INSTRUCTIONS: Record<NonNullable<StoryRequest["scope"]>, string[]> = {
  place: [
    "Zacznij od miejsca, w którym słuchacz stoi (ulica, dzielnica), potem wpleć dwa do czterech najciekawszych pobliskich miejsc i ciekawostek, a na koniec zachęć do rozejrzenia się wokół.",
    "Długość: około 200 do 350 słów.",
  ],
  overview: [
    "To opowieść o mieście, regionie lub kraju jako całości, opisanym w pierwszym artykule — nie o jednym jego punkcie czy placu. Pokaż jego charakter, najważniejsze momenty historii w skrócie i najciekawsze ciekawostki; konkretne miejsca wspominaj tylko jako przykłady.",
    "Długość: około 300 do 450 słów.",
  ],
};

function systemPrompt(language: string, scope: NonNullable<StoryRequest["scope"]>): string {
  const languageName = LANGUAGE_NAMES[language] ?? language;
  return [
    "Jesteś Spacer: ciepły, błyskotliwy przewodnik, który opowiada słuchaczowi o miejscach.",
    `Pisz w języku: ${languageName}.`,
    "Tekst zostanie odczytany przez syntezator mowy, więc pisz jak do słuchania: naturalne zdania, bez list, nagłówków, markdownu, emoji, nawiasów i skrótów; liczby i daty zapisuj tak, by dobrze brzmiały na głos.",
    "Opieraj się wyłącznie na faktach z dostarczonych artykułów Wikipedii. Nie wymyślaj dat, nazwisk ani anegdot. Jeśli źródła są skąpe, opowieść ma być krótsza, a nie zmyślona.",
    ...SCOPE_INSTRUCTIONS[scope],
    'Odpowiedz wyłącznie obiektem JSON: {"title": "krótki tytuł opowieści", "text": "treść opowieści"}.',
  ].join("\n");
}

function userPrompt(req: StoryRequest): string {
  const { name, street, district, city, country } = req.place;
  const where = [
    name && `Miejsce: ${name}`,
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
      return `<artykul nr="${i + 1}" tytul="${s.title}"${distance}>\n${s.extract.slice(0, i === 0 && req.scope === "overview" ? MAX_MAIN_EXTRACT_CHARS : MAX_EXTRACT_CHARS)}\n</artykul>`;
    })
    .join("\n\n");
  const heading = req.scope === "overview" ? "O czym jest opowieść" : "Gdzie stoi słuchacz";
  return `${heading}:\n${where || "nieznane"}\n\nArtykuły z Wikipedii:\n${sources}`;
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

function json(status: number, body: StoryResponse | StoryErrorResponse | StoryStatusResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Komunikat z odpowiedzi API Anthropic, np. o braku środków na koncie. */
function upstreamMessage(error: InstanceType<typeof Anthropic.APIError>): string {
  const body = error.error as { error?: { message?: string } } | undefined;
  if (error.status === 401) return "Nieprawidłowy klucz API — sprawdź ANTHROPIC_API_KEY.";
  if (error.status === 429) return "Przekroczony limit zapytań API — spróbuj za chwilę.";
  return `Błąd API (${error.status ?? "brak statusu"}): ${body?.error?.message ?? error.message}`;
}

/** Obsługa /api/story — wspólna dla funkcji Vercela i serwera deweloperskiego Vite. */
export async function handleStoryRequest(request: Request, apiKey: string | undefined): Promise<Response> {
  if (request.method === "GET") {
    return json(200, { configured: Boolean(apiKey), model: MODEL });
  }
  if (!apiKey) {
    return json(503, {
      error: "not_configured",
      message: "Brak ANTHROPIC_API_KEY na serwerze — dodaj zmienną na Vercelu i zrób Redeploy.",
    });
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
      system: systemPrompt(body.language, body.scope === "overview" ? "overview" : "place"),
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
      return json(502, { error: "upstream_error", message: upstreamMessage(error) });
    }
    return json(502, { error: "upstream_error", message: "Nie udało się przygotować opowieści." });
  }
}
