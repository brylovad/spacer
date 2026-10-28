import { useEffect, useState } from "react";
import { speechProvider, type PlaybackState } from "./services/speech";

/** Stan odtwarzacza i postęp przygotowania głosu. */
export function usePlayback() {
  const [state, setState] = useState<PlaybackState>("idle");
  const [progress, setProgress] = useState<number>();

  useEffect(() => speechProvider.onStateChange(setState), []);
  useEffect(() => speechProvider.onProgress(setProgress), []);

  return { state, progress };
}
