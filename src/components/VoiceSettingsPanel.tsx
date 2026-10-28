import { useEffect, useState } from "react";
import { t } from "../i18n";
import { loadVoiceSettings, saveVoiceSettings } from "../services/settings";
import { speechProvider, type VoiceOption, type VoiceSettings } from "../services/speech";
import { usePlayback } from "../usePlayback";
import { PlaybackStatus } from "./PlaybackStatus";

export function VoiceSettingsPanel() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const playback = usePlayback();

  useEffect(() => {
    const refresh = () => {
      speechProvider.getVoices().then((list) => {
        setVoices(list);
        setDiagnostics(speechProvider.describeVoices());
      });
    };
    refresh();
    return speechProvider.onVoicesChanged(refresh);
  }, []);

  const update = (patch: Partial<VoiceSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    speechProvider.configure(next);
    saveVoiceSettings(next);
  };

  const natural = voices.filter((v) => v.kind === "natural");
  const device = voices.filter((v) => v.kind === "device");

  return (
    <details className="card voice-settings" onToggle={() => setDiagnostics(speechProvider.describeVoices())}>
      <summary>{t.voice.title}</summary>
      {voices.length === 0 ? (
        <p className="notice">{t.voice.none}</p>
      ) : (
        <label className="field">
          <span>{t.voice.voice}</span>
          <select value={settings.voiceId ?? ""} onChange={(e) => update({ voiceId: e.target.value || undefined })}>
            <option value="">{t.voice.auto}</option>
            {natural.length > 0 && (
              <optgroup label={t.voice.naturalGroup}>
                {natural.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}
            {device.length > 0 && (
              <optgroup label={t.voice.deviceGroup}>
                {device.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}
      <label className="field">
        <span>
          {t.voice.rate}: {settings.rate.toFixed(1)}×
        </span>
        <input
          type="range"
          min="0.7"
          max="1.3"
          step="0.1"
          value={settings.rate}
          onChange={(e) => update({ rate: Number(e.target.value) })}
          aria-valuetext={`${settings.rate.toFixed(1)}×`}
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
      {natural.length > 0 && !settings.voiceId?.startsWith("system:") && (
        <p className="notice">{t.voice.naturalNote}</p>
      )}
      <details className="diagnostics">
        <summary>{t.voice.diagnostics}</summary>
        <p>{t.voice.allVoices(Number(diagnostics[0] ?? 0))}</p>
        <ul>
          {diagnostics.slice(1).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </details>
  );
}
