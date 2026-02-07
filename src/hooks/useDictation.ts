import { useCallback } from "react";
import { useDictationStore } from "../stores/dictationStore";
import { useAudioCapture } from "./useAudioCapture";
import { useTauriEvents } from "./useTauriEvents";
import {
  startDictation as startDictationCmd,
  stopDictation as stopDictationCmd,
  setApiKey as setApiKeyCmd,
} from "../services/tauriCommands";

/**
 * Main dictation hook — orchestrates audio capture, Tauri commands, and events.
 */
export function useDictation() {
  const { analyserNode, start: startAudio, stop: stopAudio } = useAudioCapture();

  const status = useDictationStore((s) => s.status);
  const detectedLanguage = useDictationStore((s) => s.detectedLanguage);
  const lastTranscript = useDictationStore((s) => s.lastTranscript);
  const error = useDictationStore((s) => s.error);
  const apiKey = useDictationStore((s) => s.apiKey);
  const setApiKey = useDictationStore((s) => s.setApiKey);
  const setError = useDictationStore((s) => s.setError);
  const setStatus = useDictationStore((s) => s.setStatus);

  const handleStart = useCallback(async () => {
    if (status === "active") return;
    try {
      setError(null);
      // Start audio capture first so the stream is ready
      await startAudio();
      // Tell the Rust backend to start the Deepgram session
      await startDictationCmd();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      stopAudio();
    }
  }, [status, startAudio, setError, stopAudio]);

  const handleStop = useCallback(async () => {
    if (status === "inactive") return;
    try {
      await stopDictationCmd();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      stopAudio();
    }
  }, [status, stopAudio, setError]);

  const handleSetApiKey = useCallback(
    async (key: string) => {
      setApiKey(key);
      try {
        await setApiKeyCmd(key);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    },
    [setApiKey, setError]
  );

  const toggle = useCallback(() => {
    if (status === "active") {
      handleStop();
    } else {
      handleStart();
    }
  }, [status, handleStart, handleStop]);

  // Listen to backend events and hotkeys
  useTauriEvents(handleStart, handleStop);

  return {
    status,
    detectedLanguage,
    lastTranscript,
    error,
    apiKey,
    analyserNode,
    isActive: status === "active",
    toggle,
    start: handleStart,
    stop: handleStop,
    setApiKey: handleSetApiKey,
    setStatus,
    setError,
  };
}
