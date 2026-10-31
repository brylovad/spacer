import { useState } from "react";
import { placeParts } from "../components/PlaceCard";
import { ShapeArt } from "../components/ShapeArt";
import { t } from "../i18n";
import { listStories } from "../services/storyLibrary";

export function StoriesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [stories] = useState(listStories);

  return (
    <>
      <h1>{t.myStories.title}</h1>
      {stories.length === 0 ? (
        <section className="sw-card">
          <ShapeArt seed="empty-stories" width={320} height={120} className="story-cover" />
          <p className="muted">{t.myStories.empty}</p>
        </section>
      ) : (
        <ul className="story-list">
          {stories.map((story) => (
            <li key={story.id}>
              <article className="sw-card sw-route">
                <ShapeArt seed={story.id} width={320} height={136} className="sw-route__art" />
                <div className="sw-route__body">
                  <h3 className="sw-card__title">{story.title}</h3>
                  <div className="sw-route__meta">
                    {placeParts(story.place)
                      .slice(-2)
                      .map((part) => (
                        <span key={part} className="sw-badge">
                          {part}
                        </span>
                      ))}
                    <span className="sw-badge sw-badge--accent">{t.myStories.date(story.createdAt)}</span>
                  </div>
                  <div>
                    <button className="sw-btn sw-btn--sm" onClick={() => onOpen(story.id)}>
                      {t.myStories.open}
                    </button>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted">{t.myStories.localNote}</p>
    </>
  );
}
