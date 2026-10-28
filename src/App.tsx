import { PlaybackStatus } from "./components/PlaybackStatus";
import { VoiceSettingsPanel } from "./components/VoiceSettingsPanel";
import { t } from "./i18n";
import { speechProvider } from "./services/speech";
import { useGuide, type GuidePhase } from "./useGuide";
import { usePlayback } from "./usePlayback";

const busyLabels: Partial<Record<GuidePhase, string>> = {
  locating: t.locating,
  identifying: t.identifying,
  searching: t.searching,
  writing: t.writing,
};

export default function App() {
  const { state, start } = useGuide();
  const { state: playback, progress } = usePlayback();
  const { phase, place, sources, story, error } = state;
  const busyLabel = busyLabels[phase];
  const nearby = sources.filter((s) => s.distanceMeters !== undefined);
  const [placeMain, ...placeRest] = [place?.street, place?.district, place?.city].filter(Boolean);

  return (
    <main className="app">
      <header className="header">
        <h1>{t.appName}</h1>
        <p className="tagline">{t.tagline}</p>
      </header>

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

      {place && (
        <section className="card">
          <h2 className="label">{t.youAreHere}</h2>
          <p className="place-main">{placeMain}</p>
          {placeRest.length > 0 && <p className="place-sub">{placeRest.join(" · ")}</p>}
        </section>
      )}

      {story && (
        <section className="card story">
          <h2>{story.title}</h2>
          {speechProvider.supported ? (
            <div className="player">
              {playback === "idle" && (
                <button
                  onClick={() => {
                    speechProvider.unlock();
                    speechProvider.speak(story.text);
                  }}
                >
                  ▶ {t.play}
                </button>
              )}
              {playback === "loading" && <PlaybackStatus progress={progress} />}
              {playback === "playing" && <button onClick={() => speechProvider.pause()}>❚❚ {t.pause}</button>}
              {playback === "paused" && <button onClick={() => speechProvider.resume()}>▶ {t.resume}</button>}
              {playback !== "idle" && <button onClick={() => speechProvider.stop()}>■ {t.stop}</button>}
            </div>
          ) : (
            <p className="notice">{t.noSpeech}</p>
          )}
          {story.narrator === "extracts" && (
            <p className="notice">
              {t.fallbackNotice}
              {story.fallbackReason && ` ${t.fallbackReason} ${story.fallbackReason}`}
            </p>
          )}
          {story.text.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </section>
      )}

      {phase === "ready" && nearby.length > 0 && (
        <section className="card">
          <h2 className="label">{t.nearby}</h2>
          <ul className="places">
            {nearby.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
                <span className="distance">{t.meters(s.distanceMeters!)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {speechProvider.supported && <VoiceSettingsPanel />}

      <footer className="footer">
        {phase === "ready" && <p>{t.sources}</p>}
        <p>{t.privacy}</p>
      </footer>
    </main>
  );
}
