// Ustawienia odtwarzania zapisywane tylko w tej przeglądarce. Głos wynika z wybranego przewodnika (profil).
const VOICE_KEY = "spacer.voice";

export interface PlaybackSettings {
  /** Tempo mowy, 1 = normalne. */
  rate: number;
}

const DEFAULT_PLAYBACK: PlaybackSettings = { rate: 1 };

export function loadPlaybackSettings(): PlaybackSettings {
  try {
    const raw = localStorage.getItem(VOICE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<PlaybackSettings>) : {};
    return { rate: typeof saved.rate === "number" ? saved.rate : DEFAULT_PLAYBACK.rate };
  } catch {
    return DEFAULT_PLAYBACK;
  }
}

export function savePlaybackSettings(settings: PlaybackSettings) {
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(settings));
  } catch {
    // Prywatny tryb lub zablokowana pamięć — ustawienie zadziała do zamknięcia strony.
  }
}
