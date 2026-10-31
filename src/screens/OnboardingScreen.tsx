import { PreferencesForm } from "../components/PreferencesForm";
import { t } from "../i18n";

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  return (
    <>
      <h1>{t.onboarding.greeting}</h1>
      <PreferencesForm onSaved={onDone} />
    </>
  );
}
