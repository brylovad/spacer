import { useState } from "react";
import { GUIDES, INTERESTS, type InterestId } from "../guides";
import { t } from "../i18n";
import { loadProfile, saveProfile } from "../services/profile";
import { loadPlaybackSettings } from "../services/settings";
import { applyVoice, speechProvider } from "../services/speech";
import { usePlayback } from "../usePlayback";
import { PlaybackStatus } from "./PlaybackStatus";

interface Props {
  onSaved: () => void;
}

/** Wybór przewodnika i zainteresowań — wspólny dla ekranu powitalnego i ustawień. */
export function PreferencesForm({ onSaved }: Props) {
  const [initial] = useState(loadProfile);
  const [guideId, setGuideId] = useState(initial.guideId);
  const [interests, setInterests] = useState<InterestId[]>(initial.interests);
  const playback = usePlayback();

  const toggleInterest = (id: InterestId) =>
    setInterests((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]));

  const save = () => {
    saveProfile({ guideId, interests, onboarded: true });
    applyVoice(guideId, loadPlaybackSettings().rate);
    onSaved();
  };

  return (
    <div className="preferences">
      <section>
        <h2>{t.preferences.chooseGuide}</h2>
        <div className="guides" role="radiogroup" aria-label={t.preferences.chooseGuide}>
          {GUIDES.map((guide) => (
            <div key={guide.id} className="guide">
              <button
                type="button"
                role="radio"
                aria-checked={guide.id === guideId}
                className="guide-select"
                onClick={() => setGuideId(guide.id)}
              >
                <span className="guide-avatar" aria-hidden>
                  {guide.avatar}
                </span>
                <span>{guide.name}</span>
              </button>
              <button
                type="button"
                className="guide-listen"
                aria-label={`${t.preferences.listen}: ${guide.name}`}
                onClick={() => {
                  speechProvider.unlock();
                  speechProvider.speak(t.preferences.guideSample(guide.name), guide.voiceId);
                }}
              >
                ▶ {t.preferences.listen}
              </button>
            </div>
          ))}
        </div>
        {playback.state === "loading" && <PlaybackStatus progress={playback.progress} />}
        <p className="notice">{t.preferences.listenNote}</p>
      </section>

      <section>
        <h2>{t.preferences.interestsTitle}</h2>
        <p className="notice">{t.preferences.interestsHint}</p>
        <div className="chips">
          {INTERESTS.map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={interests.includes(id)}
              onClick={() => toggleInterest(id)}
            >
              {t.preferences.interests[id]}
            </button>
          ))}
        </div>
      </section>

      <button className="primary" onClick={save}>
        {t.save}
      </button>
    </div>
  );
}
