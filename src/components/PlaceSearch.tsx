import { useEffect, useState } from "react";
import { config } from "../config";
import { t } from "../i18n";
import { MIN_QUERY_LENGTH, searchPlaces, type PlaceLevel, type PlaceSuggestion } from "../services/placeSearch";

// Czekamy z zapytaniem, aż użytkownik przestanie pisać — oszczędza publiczne usługi.
const DEBOUNCE_MS = 350;

const levelIcons: Record<PlaceLevel, string> = {
  country: "🌍",
  region: "🗺️",
  city: "🏙️",
  district: "🏘️",
  street: "🛣️",
  object: "🏛️",
};

type SearchState = "idle" | "loading" | "done" | "error";

/** Ręczne wyszukiwanie miejsca — gdy użytkownik nie chce lub nie może użyć lokalizacji. */
export function PlaceSearch({ onSelect }: { onSelect: (suggestion: PlaceSuggestion) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [state, setState] = useState<SearchState>("idle");

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setState("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState("loading");
      searchPlaces(text, config.language, config.searchBias, controller.signal)
        .then((found) => {
          setResults(found);
          setState("done");
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.warn("Place search failed", error);
          setState("error");
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const select = (suggestion: PlaceSuggestion) => {
    setQuery("");
    onSelect(suggestion);
  };

  return (
    <section className="place-search">
      <label className="field">
        <span>{t.search.label}</span>
        <input
          type="search"
          value={query}
          placeholder={t.search.placeholder}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>
      {state === "loading" && (
        <p className="status" role="status">
          <span className="spinner" aria-hidden /> {t.search.searching}
        </p>
      )}
      {state === "error" && <p className="error">{t.search.error}</p>}
      {state === "done" && results.length === 0 && <p className="notice">{t.search.noResults}</p>}
      {results.length > 0 && (
        <>
          <ul className="search-results">
            {results.map((s) => (
              <li key={s.id}>
                <button className="search-result" onClick={() => select(s)}>
                  <span className="search-result-icon" aria-hidden>
                    {levelIcons[s.level]}
                  </span>
                  <span>
                    <span className="search-result-name">{s.name}</span>
                    <span className="search-result-meta">
                      {[t.search.levels[s.level], s.context].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="notice">{t.search.attribution}</p>
        </>
      )}
    </section>
  );
}
