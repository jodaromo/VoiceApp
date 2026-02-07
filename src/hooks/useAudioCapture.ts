import { useCallback, useRef, useState } from "react";
import type { AudioServiceHandle } from "../services/audioService";
import { startAudioCapture } from "../services/audioService";
import { sendAudioChunk } from "../services/tauriCommands";

export function useAudioCapture() {
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const handleRef = useRef<AudioServiceHandle | null>(null);

  const start = useCallback(async () => {
    if (handleRef.current) return; // already running

    const handle = await startAudioCapture(async (chunk) => {
      try {
        await sendAudioChunk(chunk);
      } catch {
        // Channel may be closed if dictation was stopped
      }
    });

    handleRef.current = handle;
    setAnalyserNode(handle.analyserNode);
  }, []);

  const stop = useCallback(() => {
    if (handleRef.current) {
      handleRef.current.stop();
      handleRef.current = null;
      setAnalyserNode(null);
    }
  }, []);

  return { analyserNode, start, stop };
}
