import { t } from "../i18n";

/** Komunikat w trakcie przygotowywania głosu (pobieranie modelu lub synteza pierwszego zdania). */
export function PlaybackStatus({ progress }: { progress?: number }) {
  const downloading = progress !== undefined && progress < 1;
  return (
    <p className="status" role="status">
      <span className="spinner" aria-hidden />{" "}
      {downloading ? t.voice.downloading(Math.round(progress * 100)) : t.voice.preparing}
    </p>
  );
}
