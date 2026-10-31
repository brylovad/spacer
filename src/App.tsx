import { useState } from "react";
import { t } from "./i18n";
import { loadProfile } from "./services/profile";
import { HomeScreen } from "./screens/HomeScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { StoriesScreen } from "./screens/StoriesScreen";
import { StoryScreen } from "./screens/StoryScreen";
import { useGuide } from "./useGuide";

type Screen =
  | { name: "onboarding" }
  | { name: "home" }
  | { name: "settings" }
  | { name: "stories" }
  | { name: "story"; id: string };

export default function App() {
  // Stos ekranów: „Wróć” zdejmuje ostatni.
  const [stack, setStack] = useState<Screen[]>(() => [{ name: loadProfile().onboarded ? "home" : "onboarding" }]);
  // Stan opowieści żyje tutaj, żeby przejście do innych ekranów i z powrotem go nie gubiło.
  const guide = useGuide();

  const screen = stack[stack.length - 1];
  const open = (next: Screen) => setStack((s) => [...s, next]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const goHome = () => setStack([{ name: "home" }]);

  return (
    <main className="app">
      <header className="header">
        {stack.length > 1 ? (
          <button className="header-action" onClick={back}>
            ← {t.back}
          </button>
        ) : (
          <span className="app-name">{t.appName}</span>
        )}
        {screen.name !== "onboarding" && (
          <nav className="header-nav">
            {screen.name !== "stories" && (
              <button className="header-action" onClick={() => open({ name: "stories" })}>
                {t.myStories.title}
              </button>
            )}
            {screen.name !== "settings" && (
              <button className="header-action" onClick={() => open({ name: "settings" })} aria-label={t.settings}>
                ⚙
              </button>
            )}
          </nav>
        )}
      </header>

      {screen.name === "onboarding" && <OnboardingScreen onDone={goHome} />}
      {screen.name === "settings" && <SettingsScreen onDone={back} />}
      {screen.name === "home" && <HomeScreen state={guide.state} start={guide.start} startFromSuggestion={guide.startFromSuggestion} />}
      {screen.name === "stories" && <StoriesScreen onOpen={(id) => open({ name: "story", id })} />}
      {screen.name === "story" && <StoryScreen id={screen.id} onDeleted={back} />}

      <footer className="footer">
        <p>{t.privacy}</p>
      </footer>
    </main>
  );
}
