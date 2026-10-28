// Kontrakt między aplikacją a endpointem /api/story.
// Wspólny dla przeglądarki i serwera, więc nie może importować niczego z DOM ani Node.

export interface PlaceContext {
  street?: string;
  district?: string;
  city?: string;
  country?: string;
}

export interface SourceArticle {
  title: string;
  url: string;
  /** Odległość od użytkownika w metrach; brak dla artykułów o dzielnicy/mieście. */
  distanceMeters?: number;
  extract: string;
}

export interface StoryRequest {
  /** Kod języka opowieści, np. "pl". */
  language: string;
  place: PlaceContext;
  sources: SourceArticle[];
}

export interface StoryResponse {
  title: string;
  text: string;
}

export interface StoryErrorResponse {
  error: "not_configured" | "bad_request" | "refused" | "upstream_error";
  message: string;
}

/** Odpowiedź GET /api/story — pozwala sprawdzić w przeglądarce, czy serwer widzi klucz. */
export interface StoryStatusResponse {
  configured: boolean;
  model: string;
}
