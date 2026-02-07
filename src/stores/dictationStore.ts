import { create } from "zustand";

export type DictationStatus = "active" | "inactive";
export type DetectedLanguage = "EN-US" | "ES-CO" | "...";

interface DictationState {
  status: DictationStatus;
  detectedLanguage: DetectedLanguage;
  lastTranscript: string;
  apiKey: string;
  error: string | null;

  setStatus: (status: DictationStatus) => void;
  setDetectedLanguage: (lang: DetectedLanguage) => void;
  setLastTranscript: (transcript: string) => void;
  setApiKey: (key: string) => void;
  setError: (error: string | null) => void;
}

export const useDictationStore = create<DictationState>((set) => ({
  status: "inactive",
  detectedLanguage: "...",
  lastTranscript: "",
  apiKey: "",
  error: null,

  setStatus: (status) => set({ status, error: null }),
  setDetectedLanguage: (detectedLanguage) => set({ detectedLanguage }),
  setLastTranscript: (lastTranscript) => set({ lastTranscript }),
  setApiKey: (apiKey) => set({ apiKey }),
  setError: (error) => set({ error }),
}));
