import { DEFAULT_GUIDE, DEFAULT_INTERESTS, GUIDES, INTERESTS, type GuideId, type InterestId } from "../guides";

// Profil użytkownika zapisany tylko w tej przeglądarce (bez kont). Gdy pojawią się konta,
// przeniesiemy go na konto przy pierwszym logowaniu.
const PROFILE_KEY = "spacer.profile";

export interface Profile {
  guideId: GuideId;
  interests: InterestId[];
  /** Czy użytkownik przeszedł ekran powitalny. */
  onboarded: boolean;
}

const DEFAULT_PROFILE: Profile = { guideId: DEFAULT_GUIDE, interests: DEFAULT_INTERESTS, onboarded: false };

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const saved = JSON.parse(raw) as Partial<Profile>;
    return {
      guideId: GUIDES.some((g) => g.id === saved.guideId) ? saved.guideId! : DEFAULT_GUIDE,
      interests: (saved.interests ?? DEFAULT_INTERESTS).filter((i) => INTERESTS.includes(i)),
      onboarded: saved.onboarded === true,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Prywatny tryb lub zablokowana pamięć — ustawienia zadziałają do zamknięcia strony.
  }
}
