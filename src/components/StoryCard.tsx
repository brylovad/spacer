import { useEffect, useState } from "react";
import { t } from "../i18n";
import { getNowPlaying, onNowPlayingChange, setNowPlaying } from "../services/nowPlaying";
import { speechProvider } from "../services/speech";
import type { SavedStory } from "../services/storyLibrary";
import { usePlayback } from "../usePlayback";
import { PlaybackStatus } from "./PlaybackStatus";

/** Opowieść z odtwarzaczem. Ta sama na ekranie głównym i w „Moich historiach”. */
export function StoryCard({ story }: { story: SavedStory }) {
  const { state: playback, progress } = usePlayback();
  const [nowPlaying, setNowPlayingState] = useState(getNowPlaying);
  useEffect(() => onNowPlayingChange(setNowPlayingState), []);

  // Odtwarzacz jest jeden; przyciski sterują nim tylko przy historii, która w nim jest.
  const state = nowPlaying === story.id ? playback : "idle";

  const play = () => {
    speechProvider.unlock();
    setNowPlaying(story.id);
    speechProvider.speak(story.text);
  };

  return (
    <article className="sw-card">
      <h2>{story.title}</h2>
      {speechProvider.supported ? (
        <div className="player">
          {state === "idle" && (
            <button className="sw-btn" onClick={play}>
              ▶ {t.play}
            </button>
          )}
          {state === "loading" && <PlaybackStatus progress={progress} />}
          {state === "playing" && (
            <button className="sw-btn" onClick={() => speechProvider.pause()}>
              {t.pause}
            </button>
          )}
          {state === "paused" && (
            <button className="sw-btn" onClick={() => speechProvider.resume()}>
              ▶ {t.resume}
            </button>
          )}
          {state !== "idle" && (
            <button className="sw-btn sw-btn--outline" onClick={() => speechProvider.stop()}>
              {t.stop}
            </button>
          )}
        </div>
      ) : (
        <p className="info">{t.noSpeech}</p>
      )}
      {story.narrator === "extracts" && (
        <p className="info">
          {t.fallbackNotice}
          {story.fallbackReason && ` ${t.fallbackReason} ${story.fallbackReason}`}
        </p>
      )}
      <div className="story-text">
        {story.text.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
