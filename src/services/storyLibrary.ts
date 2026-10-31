import type { PlaceContext, SourceArticle } from "../shared/storyApi";
import type { Story } from "./story";

// „Moje historie” zapisane tylko w tej przeglądarce. Bez współrzędnych — tylko nazwy miejsc.
// Gdy pojawią się konta, przeniesiemy je na konto przy pierwszym logowaniu.
const STORIES_KEY = "spacer.stories";

export interface SavedStory extends Story {
  id: string;
  /** Data zapisu (ISO 8601). */
  createdAt: string;
  place: PlaceContext;
  sources: Pick<SourceArticle, "title" | "url" | "distanceMeters">[];
}

let persistRequested = false;

/** Prosi przeglądarkę, by nie usuwała danych Spacera przy braku miejsca (działa, gdy przeglądarka się zgodzi). */
function requestPersistence() {
  if (persistRequested) return;
  persistRequested = true;
  navigator.storage?.persist?.().catch(() => {});
}

export function listStories(): SavedStory[] {
  try {
    const raw = localStorage.getItem(STORIES_KEY);
    const stories = raw ? (JSON.parse(raw) as SavedStory[]) : [];
    return stories.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function write(stories: SavedStory[]) {
  try {
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  } catch (error) {
    // Brak miejsca lub prywatny tryb — historia zostanie tylko do zamknięcia strony.
    console.warn("Could not save stories", error);
  }
}

export function getStory(id: string): SavedStory | undefined {
  return listStories().find((s) => s.id === id);
}

export function saveStory(story: Story, place: PlaceContext, sources: SourceArticle[]): SavedStory {
  const saved: SavedStory = {
    ...story,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    place: { street: place.street, district: place.district, city: place.city, country: place.country },
    sources: sources.map(({ title, url, distanceMeters }) => ({ title, url, distanceMeters })),
  };
  write([saved, ...listStories()]);
  requestPersistence();
  return saved;
}

export function deleteStory(id: string) {
  write(listStories().filter((s) => s.id !== id));
}
