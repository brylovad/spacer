import { useEffect, useState } from "react";
import { t } from "../i18n";
import { saveVoiceSettings, loadVoiceSettings } from "../services/settings";
import { speechProvider, type VoiceOption, type VoiceSettings } from "../services/speech";

function platformHint(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return t.voice.hintIos;
  if (/Android/.test(ua)) return t.voice.hintAndroid;
  return t.voice.hintDesktop;
}

export function VoiceSettingsPanel() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

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

  const hasEnhanced = voices.some((v) => v.enhanced);

  return (
    <details className="card voice-settings">
      <summary>{t.voice.title}</summary>
      {voices.length === 0 ? (
        <p className="notice">{t.voice.none}</p>
      ) : (
        <label className="field">
          <span>{t.voice.voice}</span>
          <select value={settings.voiceId ?? ""} onChange={(e) => update({ voiceId: e.target.value || undefined })}>
            <option value="">{t.voice.auto}</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
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
      <button
        onClick={() => {
          speechProvider.unlock();
          speechProvider.speak(t.voice.sample);
        }}
      >
        ▶ {t.voice.preview}
      </button>
      {!hasEnhanced && <p className="notice">{platformHint()}</p>}
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
