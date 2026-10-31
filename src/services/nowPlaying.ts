// Która historia jest teraz w odtwarzaczu — żeby przyciski pauzy/stopu pokazywały się tylko przy niej.
let current: string | undefined;
const listeners = new Set<(id: string | undefined) => void>();

export function getNowPlaying() {
  return current;
}

export function setNowPlaying(id: string | undefined) {
  current = id;
  listeners.forEach((l) => l(id));
}

export function onNowPlayingChange(listener: (id: string | undefined) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
