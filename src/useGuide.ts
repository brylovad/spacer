import { useCallback, useEffect, useState } from "react";
import { config } from "./config";
import { t } from "./i18n";
import { reverseGeocode } from "./services/geocoding";
import { GeolocationError, getCurrentPosition, type Coordinates } from "./services/geolocation";
import { setNowPlaying } from "./services/nowPlaying";
import type { PlaceSuggestion } from "./services/placeSearch";
import { speechProvider } from "./services/speech";
import { storyProvider } from "./services/story";
import { saveStory, type SavedStory } from "./services/storyLibrary";
import { gatherSources, type GatherOptions } from "./services/wikipedia";
import type { PlaceContext, SourceArticle } from "./shared/storyApi";

export type GuidePhase = "idle" | "locating" | "identifying" | "searching" | "writing" | "ready" | "error";

export interface GuideState {
  phase: GuidePhase;
  /** Skąd jest miejsce: lokalizacja telefonu czy wyszukiwarka. */
  origin?: "here" | "search";
  place?: PlaceContext;
  sources: SourceArticle[];
  /** Opowieść już zapisana w „Moich historiach”. */
  story?: SavedStory;
  error?: string;
}

interface Target {
  coords: Coordinates;
  place: PlaceContext;
  options: GatherOptions;
}

class NoPlacesError extends Error {}

function errorMessage(error: unknown): string {
  if (error instanceof GeolocationError) return t.errors[error.code];
  if (error instanceof NoPlacesError) return t.errors.noPlaces;
  return t.errors.network;
}

/** Cały przepływ: miejsce (GPS lub wyszukiwarka) → artykuły z Wikipedii → opowieść → zapis → głos. */
export function useGuide() {
  const [state, setState] = useState<GuideState>({ phase: "idle", sources: [] });

  useEffect(() => () => speechProvider.stop(), []);

  const run = useCallback(async (origin: GuideState["origin"], resolveTarget: () => Promise<Target>) => {
    speechProvider.stop();
    speechProvider.unlock();
    // Głos (np. model Piper) przygotowuje się równolegle z ustalaniem miejsca i pisaniem opowieści.
    speechProvider.prepare();
    setState({ phase: origin === "here" ? "locating" : "searching", origin, sources: [] });
    try {
      const { coords, place, options } = await resolveTarget();

      setState((s) => ({ ...s, phase: "searching", place }));
      const sources = await gatherSources(config.language, coords, place, options);
      if (sources.length === 0) throw new NoPlacesError();

      setState((s) => ({ ...s, phase: "writing", sources }));
      const created = await storyProvider.createStory({ language: config.language, place, sources });
      // Każda historia od razu trafia do „Moich historii”, żeby można było do niej wrócić bez ponownego generowania.
      const story = saveStory(created, place, sources);

      setState((s) => ({ ...s, phase: "ready", story }));
      setNowPlaying(story.id);
      speechProvider.speak(story.text);
    } catch (error) {
      console.error(error);
      setState((s) => ({ ...s, phase: "error", error: errorMessage(error) }));
    }
  }, []);

  /** Opowieść o miejscu, gdzie stoi użytkownik — lokalizacja pobierana tylko teraz, raz. */
  const start = useCallback(
    () =>
      run("here", async () => {
        const coords = await getCurrentPosition();
        setState((s) => ({ ...s, phase: "identifying" }));
        const place = await reverseGeocode(coords, config.language);
        return { coords, place, options: { radius: config.searchRadiusMeters, limit: config.maxNearbyPlaces } };
      }),
    [run],
  );

  /** Opowieść o miejscu wybranym w wyszukiwarce. */
  const startFromSuggestion = useCallback(
    (suggestion: PlaceSuggestion) =>
      run("search", async () => {
        let place = suggestion.place;
        // Zabytki z Wikipedii nie mają adresu — dopytujemy raz o ulicę, dzielnicę i miasto.
        if (suggestion.level === "object" && !place.city) {
          setState((s) => ({ ...s, phase: "identifying" }));
          place = { ...(await reverseGeocode(suggestion.coords, config.language)), name: suggestion.name };
        }
        // Kraj, region i obiekt mają własny artykuł jako główny temat; miasto, dzielnicę i ulicę
        // znajduje się po nazwach w opisie miejsca.
        const hasOwnTopic = ["country", "region", "object"].includes(suggestion.level);
        return {
          coords: suggestion.coords,
          place,
          options: {
            radius: config.searchRadiusByLevel[suggestion.level],
            limit: config.maxNearbyPlaces,
            focus: hasOwnTopic
              ? { pageId: suggestion.wikiPageId, name: suggestion.name, context: place.city ?? place.country }
              : undefined,
          },
        };
      }),
    [run],
  );

  return { state, start, startFromSuggestion };
}
