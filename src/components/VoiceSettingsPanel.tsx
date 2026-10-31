import { useEffect, useState } from "react";
import { t } from "../i18n";
import { loadProfile } from "../services/profile";
import { loadPlaybackSettings, savePlaybackSettings } from "../services/settings";
import { applyVoice, speechProvider } from "../services/speech";
import { usePlayback } from "../usePlayback";
import { PlaybackStatus } from "./PlaybackStatus";

/** Tempo mowy, próbka głosu i diagnostyka. Sam głos wynika z wybranego przewodnika. */
export function VoiceSettingsPanel() {
  const [rate, setRate] = useState(() => loadPlaybackSettings().rate);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const playback = usePlayback();

  useEffect(() => {
    const refresh = () => setDiagnostics(speechProvider.describeVoices());
    speechProvider.getVoices().then(refresh);
    return speechProvider.onVoicesChanged(refresh);
  }, []);

  const updateRate = (next: number) => {
    setRate(next);
    savePlaybackSettings({ rate: next });
    applyVoice(loadProfile().guideId, next);
  };

  return (
    <section className="card voice-settings">
      <h2>{t.voice.title}</h2>
      <label className="field">
        <span>
          {t.voice.rate}: {rate.toFixed(1)}×
        </span>
        <input
          type="range"
          min="0.7"
          max="1.3"
          step="0.1"
          value={rate}
          onChange={(e) => updateRate(Number(e.target.value))}
          aria-valuetext={`${rate.toFixed(1)}×`}
        />
        <span className="range-labels">
          <span>{t.voice.rateSlow}</span>
          <span>{t.voice.rateFast}</span>
        </span>
      </label>
      {playback.state === "loading" ? (
        <PlaybackStatus progress={playback.progress} />
      ) : (
        <button
          onClick={() => {
            speechProvider.unlock();
            speechProvider.speak(t.voice.sample);
          }}
        >
          ▶ {t.voice.preview}
        </button>
      )}
      <details className="diagnostics" onToggle={() => setDiagnostics(speechProvider.describeVoices())}>
        <summary>{t.voice.diagnostics}</summary>
        <p>{t.voice.allVoices(Number(diagnostics[0] ?? 0))}</p>
        <ul>
          {diagnostics.slice(1).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
