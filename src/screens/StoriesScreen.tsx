import { useState } from "react";
import { placeParts } from "../components/PlaceCard";
import { t } from "../i18n";
import { listStories } from "../services/storyLibrary";

export function StoriesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [stories] = useState(listStories);

  return (
    <>
      <h1>{t.myStories.title}</h1>
      {stories.length === 0 ? (
        <p className="notice">{t.myStories.empty}</p>
      ) : (
        <ul className="story-list">
          {stories.map((story) => (
            <li key={story.id}>
              <button className="story-item" onClick={() => onOpen(story.id)}>
                <span className="story-item-title">{story.title}</span>
                <span className="story-item-meta">
                  {placeParts(story.place).join(" · ")}
                  <br />
                  {t.myStories.date(story.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="notice">{t.myStories.localNote}</p>
    </>
  );
}
