// Głosy Piper (open source, licencje w kartach modeli na huggingface.co/rhasspy/piper-voices).
// Nowy język = nowe wpisy tutaj; identyfikatory muszą istnieć w @mintplex-labs/piper-tts-web.
export interface PiperVoice {
  id: string;
  name: string;
  sizeMb: number;
}

export const PIPER_VOICES: Record<string, PiperVoice[]> = {
  pl: [
    { id: "pl_PL-gosia-medium", name: "Gosia", sizeMb: 63 },
    { id: "pl_PL-darkman-medium", name: "Darkman", sizeMb: 63 },
    { id: "pl_PL-mc_speech-medium", name: "MC Speech", sizeMb: 63 },
  ],
};
