import type { VoiceSettings } from "./speech/types";

// Ustawienia zapisywane tylko w tej przeglądarce. Gdy pojawią się konta, mogą trafić na serwer.
const VOICE_KEY = "spacer.voice";
const DEFAULT_VOICE: VoiceSettings = { rate: 1 };

export function loadVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(VOICE_KEY);
    return raw ? { ...DEFAULT_VOICE, ...(JSON.parse(raw) as Partial<VoiceSettings>) } : DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(settings));
  } catch {
    // Prywatny tryb lub zablokowana pamięć — ustawienie zadziała do zamknięcia strony.
  }
}
