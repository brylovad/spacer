import { NearbyList } from "../components/NearbyList";
import { PlaceCard } from "../components/PlaceCard";
import { PlaceSearch } from "../components/PlaceSearch";
import { StoryCard } from "../components/StoryCard";
import { t } from "../i18n";
import type { PlaceSuggestion } from "../services/placeSearch";
import type { GuidePhase, GuideState } from "../useGuide";

const busyLabels: Partial<Record<GuidePhase, string>> = {
  locating: t.locating,
  identifying: t.identifying,
  searching: t.searching,
  writing: t.writing,
};

interface Props {
  state: GuideState;
  start: () => void;
  startFromSuggestion: (suggestion: PlaceSuggestion) => void;
}

export function HomeScreen({ state, start, startFromSuggestion }: Props) {
  const { phase, origin, place, sources, story, error } = state;
  const busyLabel = busyLabels[phase];

  return (
    <>
      <p className="lead muted">{t.tagline}</p>

      {!busyLabel && (
        <button className="sw-btn sw-btn--primary sw-btn--lg sw-btn--block" onClick={start}>
          {phase === "idle" ? t.start : phase === "error" ? t.retry : t.refresh}
        </button>
      )}

      {!busyLabel && <PlaceSearch onSelect={startFromSuggestion} />}

      {busyLabel && (
        <p className="status" role="status">
          <span className="spinner" aria-hidden />
          {busyLabel}
        </p>
      )}

      {error && (
        <p className="alert" role="alert">
          <strong>{t.errorLabel}</strong> {error}
        </p>
      )}

      {place && <PlaceCard place={place} label={origin === "search" ? t.chosenPlace : t.youAreHere} />}

      {story && (
        <>
          <StoryCard story={story} />
          <p className="info">{t.myStories.savedNotice}</p>
        </>
      )}

      {phase === "ready" && <NearbyList sources={sources} />}

      {phase === "ready" && <p className="footer">{t.sources}</p>}
    </>
  );
}
