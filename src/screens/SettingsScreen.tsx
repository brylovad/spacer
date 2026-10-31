import { PreferencesForm } from "../components/PreferencesForm";
import { VoiceSettingsPanel } from "../components/VoiceSettingsPanel";
import { t } from "../i18n";
import { speechProvider } from "../services/speech";

export function SettingsScreen({ onDone }: { onDone: () => void }) {
  return (
    <>
      <h1>{t.settings}</h1>
      <PreferencesForm onSaved={onDone} />
      {speechProvider.supported && <VoiceSettingsPanel />}
    </>
  );
}
