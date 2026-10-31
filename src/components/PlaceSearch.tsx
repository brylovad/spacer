import { useEffect, useId, useState } from "react";
import { config } from "../config";
import { t } from "../i18n";
import { MIN_QUERY_LENGTH, searchPlaces, type PlaceSuggestion } from "../services/placeSearch";

// Czekamy z zapytaniem, aż użytkownik przestanie pisać — oszczędza publiczne usługi.
const DEBOUNCE_MS = 350;

type SearchState = "idle" | "loading" | "done" | "error";

/** Ręczne wyszukiwanie miejsca — gdy użytkownik nie chce lub nie może użyć lokalizacji. */
export function PlaceSearch({ onSelect }: { onSelect: (suggestion: PlaceSuggestion) => void }) {
  const inputId = useId();
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
    <section className="section">
      <div className="sw-field">
        <label className="sw-label" htmlFor={inputId}>
          {t.search.label}
        </label>
        <input
          id={inputId}
          className="sw-input"
          type="search"
          value={query}
          placeholder={t.search.placeholder}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      {state === "loading" && (
        <p className="status small" role="status">
          <span className="spinner" aria-hidden />
          {t.search.searching}
        </p>
      )}
      {state === "error" && (
        <p className="alert" role="alert">
          <strong>{t.errorLabel}</strong> {t.search.error}
        </p>
      )}
      {state === "done" && results.length === 0 && <p className="info">{t.search.noResults}</p>}
      {results.length > 0 && (
        <>
          <ul className="search-results">
            {results.map((s) => (
              <li key={s.id}>
                <button className="search-result" onClick={() => select(s)}>
                  <span className="search-result-name">{s.name}</span>
                  <span className="search-result-meta">
                    <span className="sw-badge">{t.search.levels[s.level]}</span>
                    {s.context}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="footer">{t.search.attribution}</p>
        </>
      )}
    </section>
  );
}
