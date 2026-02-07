import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDictationStore } from "../stores/dictationStore";
import type { DetectedLanguage } from "../stores/dictationStore";

/**
 * Listens to events from the Tauri Rust backend and global hotkeys,
 * updating the Zustand store accordingly.
 */
export function useTauriEvents(
  onStartDictation: () => void,
  onStopDictation: () => void
) {
  const setStatus = useDictationStore((s) => s.setStatus);
  const setDetectedLanguage = useDictationStore((s) => s.setDetectedLanguage);
  const setLastTranscript = useDictationStore((s) => s.setLastTranscript);
  const setError = useDictationStore((s) => s.setError);

  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    const setup = async () => {
      // Dictation status changes from backend
      const u1 = await listen<string>("dictation-status-changed", (event) => {
        setStatus(event.payload as "active" | "inactive");
      });
      unlisteners.push(u1);

      // Language detection
      const u2 = await listen<string>("language-detected", (event) => {
        setDetectedLanguage(event.payload as DetectedLanguage);
      });
      unlisteners.push(u2);

      // Transcription results (for UI display)
      const u3 = await listen<string>("transcription-result", (event) => {
        setLastTranscript(event.payload);
      });
      unlisteners.push(u3);

      // Errors from backend
      const u4 = await listen<string>("dictation-error", (event) => {
        setError(event.payload);
      });
      unlisteners.push(u4);

      // Hotkey: F10 pressed → start dictation
      const u5 = await listen("hotkey-start-dictation", () => {
        onStartDictation();
      });
      unlisteners.push(u5);

      // Hotkey: F11 pressed → stop dictation
      const u6 = await listen("hotkey-stop-dictation", () => {
        onStopDictation();
      });
      unlisteners.push(u6);

      // Tray menu toggle
      const u7 = await listen("tray-toggle-dictation", () => {
        const status = useDictationStore.getState().status;
        if (status === "inactive") {
          onStartDictation();
        } else {
          onStopDictation();
        }
      });
      unlisteners.push(u7);
    };

    setup();

    return () => {
      unlisteners.forEach((u) => u());
    };
  }, [
    onStartDictation,
    onStopDictation,
    setStatus,
    setDetectedLanguage,
    setLastTranscript,
    setError,
  ]);
}
