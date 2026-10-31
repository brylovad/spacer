import { NearbyList } from "../components/NearbyList";
import { PlaceCard } from "../components/PlaceCard";
import { StoryCard } from "../components/StoryCard";
import { t } from "../i18n";
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
}

export function HomeScreen({ state, start }: Props) {
  const { phase, place, sources, story, error } = state;
  const busyLabel = busyLabels[phase];

  return (
    <>
      <p className="tagline">{t.tagline}</p>

      {!busyLabel && (
        <button className="primary" onClick={start}>
          {phase === "idle" ? t.start : phase === "error" ? t.retry : t.refresh}
        </button>
      )}

      {busyLabel && (
        <p className="status" role="status">
          <span className="spinner" aria-hidden /> {busyLabel}
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {place && <PlaceCard place={place} />}

      {story && (
        <>
          <StoryCard story={story} />
          <p className="notice">{t.myStories.savedNotice}</p>
        </>
      )}

      {phase === "ready" && <NearbyList sources={sources} />}

      {phase === "ready" && <p className="footer">{t.sources}</p>}
    </>
  );
}
