import { useCallback, useEffect, useState } from "react";
import { config } from "./config";
import { t } from "./i18n";
import { reverseGeocode } from "./services/geocoding";
import { GeolocationError, getCurrentPosition } from "./services/geolocation";
import { speechProvider, type PlaybackState } from "./services/speech";
import { storyProvider, type Story } from "./services/story";
import { gatherSources } from "./services/wikipedia";
import type { PlaceContext, SourceArticle } from "./shared/storyApi";

export type GuidePhase = "idle" | "locating" | "identifying" | "searching" | "writing" | "ready" | "error";

export interface GuideState {
  phase: GuidePhase;
  place?: PlaceContext;
  sources: SourceArticle[];
  story?: Story;
  error?: string;
}

class NoPlacesError extends Error {}

function errorMessage(error: unknown): string {
  if (error instanceof GeolocationError) return t.errors[error.code];
  if (error instanceof NoPlacesError) return t.errors.noPlaces;
  return t.errors.network;
}

/** Cały przepływ: lokalizacja → nazwa miejsca → artykuły z Wikipedii → opowieść → głos. */
export function useGuide() {
  const [state, setState] = useState<GuideState>({ phase: "idle", sources: [] });
  const [playback, setPlayback] = useState<PlaybackState>("idle");

  useEffect(() => speechProvider.onStateChange(setPlayback), []);
  useEffect(() => () => speechProvider.stop(), []);

  const start = useCallback(async () => {
    speechProvider.stop();
    speechProvider.unlock();
    setState({ phase: "locating", sources: [] });
    try {
      const coords = await getCurrentPosition();

      setState((s) => ({ ...s, phase: "identifying" }));
      const place = await reverseGeocode(coords, config.language);

      setState((s) => ({ ...s, phase: "searching", place }));
      const sources = await gatherSources(
        config.language,
        coords,
        place,
        config.searchRadiusMeters,
        config.maxNearbyPlaces,
      );
      if (sources.length === 0) throw new NoPlacesError();

      setState((s) => ({ ...s, phase: "writing", sources }));
      const story = await storyProvider.createStory({ language: config.language, place, sources });

      setState((s) => ({ ...s, phase: "ready", story }));
      speechProvider.speak(story.text);
    } catch (error) {
      console.error(error);
      setState((s) => ({ ...s, phase: "error", error: errorMessage(error) }));
    }
  }, []);

  return { state, playback, start };
}
