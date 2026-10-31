import { useState } from "react";
import { GUIDES, INTERESTS, type InterestId } from "../guides";
import { t } from "../i18n";
import { loadProfile, saveProfile } from "../services/profile";
import { loadPlaybackSettings } from "../services/settings";
import { applyVoice, speechProvider } from "../services/speech";
import { usePlayback } from "../usePlayback";
import { PlaybackStatus } from "./PlaybackStatus";
import { ShapeArt } from "./ShapeArt";

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
    <>
      <section className="section">
        <h2>{t.preferences.chooseGuide}</h2>
        <div className="guides" role="radiogroup" aria-label={t.preferences.chooseGuide}>
          {GUIDES.map((guide) => {
            const selected = guide.id === guideId;
            return (
              <div key={guide.id} className="guide">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="choice"
                  onClick={() => setGuideId(guide.id)}
                >
                  <ShapeArt seed={`guide-${guide.id}`} width={96} height={96} className="avatar" />
                  <span>{guide.name}</span>
                  <span className="choice-state">{selected ? `✓ ${t.preferences.selected}` : ""}</span>
                </button>
                <button
                  type="button"
                  className="sw-btn sw-btn--ghost sw-btn--sm guide-listen"
                  aria-label={`${t.preferences.listen}: ${guide.name}`}
                  onClick={() => {
                    speechProvider.unlock();
                    speechProvider.speak(t.preferences.guideSample(guide.name), guide.voiceId);
                  }}
                >
                  ▶ {t.preferences.listen}
                </button>
              </div>
            );
          })}
        </div>
        {playback.state === "loading" && <PlaybackStatus progress={playback.progress} />}
        <p className="small muted">{t.preferences.listenNote}</p>
      </section>

      <section className="section">
        <div className="stack" style={{ gap: "var(--space-1)" }}>
          <h2>{t.preferences.interestsTitle}</h2>
          <p className="muted">{t.preferences.interestsHint}</p>
        </div>
        <div className="chips">
          {INTERESTS.map((id) => {
            const on = interests.includes(id);
            return (
              <button key={id} type="button" className="chip" aria-pressed={on} onClick={() => toggleInterest(id)}>
                {on && <span aria-hidden>✓</span>}
                {t.preferences.interests[id]}
              </button>
            );
          })}
        </div>
      </section>

      <button className="sw-btn sw-btn--primary sw-btn--lg sw-btn--block" onClick={save}>
        {t.save}
      </button>
    </>
  );
}
