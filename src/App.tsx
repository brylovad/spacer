import { useState } from "react";
import { t } from "./i18n";
import { loadProfile } from "./services/profile";
import { HomeScreen } from "./screens/HomeScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { useGuide } from "./useGuide";

type Screen = "onboarding" | "home" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (loadProfile().onboarded ? "home" : "onboarding"));
  // Stan opowieści żyje tutaj, żeby przejście do ustawień i z powrotem go nie gubiło.
  const guide = useGuide();

  return (
    <main className="app">
      <header className="header">
        <span className="app-name">{t.appName}</span>
        {screen === "home" && (
          <button className="header-action" onClick={() => setScreen("settings")}>
            ⚙ {t.settings}
          </button>
        )}
        {screen === "settings" && (
          <button className="header-action" onClick={() => setScreen("home")}>
            ← {t.back}
          </button>
        )}
      </header>

      {screen === "onboarding" && <OnboardingScreen onDone={() => setScreen("home")} />}
      {screen === "settings" && <SettingsScreen onDone={() => setScreen("home")} />}
      {screen === "home" && <HomeScreen state={guide.state} start={guide.start} />}

      <footer className="footer">
        <p>{t.privacy}</p>
      </footer>
    </main>
  );
}
