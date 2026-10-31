import { NearbyList } from "../components/NearbyList";
import { PlaceCard } from "../components/PlaceCard";
import { ShapeArt } from "../components/ShapeArt";
import { StoryCard } from "../components/StoryCard";
import { t } from "../i18n";
import { getNowPlaying, setNowPlaying } from "../services/nowPlaying";
import { speechProvider } from "../services/speech";
import { deleteStory, getStory } from "../services/storyLibrary";

export function StoryScreen({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const story = getStory(id);
  if (!story) return <p className="info">{t.myStories.empty}</p>;

  const remove = () => {
    if (!window.confirm(t.myStories.confirmDelete(story.title))) return;
    if (getNowPlaying() === story.id) {
      speechProvider.stop();
      setNowPlaying(undefined);
    }
    deleteStory(story.id);
    onDeleted();
  };

  return (
    <>
      <ShapeArt seed={story.id} width={320} height={136} className="story-cover" />
      <p className="eyebrow">{t.myStories.date(story.createdAt)}</p>
      <PlaceCard place={story.place} label={t.myStories.title} />
      <StoryCard story={story} />
      <NearbyList sources={story.sources} />
      <p className="footer">{t.sources}</p>
      <div>
        <button className="sw-btn sw-btn--destructive" onClick={remove}>
          {t.myStories.delete}
        </button>
      </div>
    </>
  );
}
