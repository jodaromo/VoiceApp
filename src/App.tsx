import { motion } from "motion/react";
import { MicButton } from "./components/MicButton";
import { SoundWaveAnimation } from "./components/SoundWaveAnimation";
import { StatusIndicator } from "./components/StatusIndicator";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { useDictation } from "./hooks/useDictation";

function App() {
  const {
    status,
    detectedLanguage,
    lastTranscript,
    error,
    apiKey,
    analyserNode,
    isActive,
    toggle,
    setApiKey,
  } = useDictation();

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center select-none overflow-hidden">
      {/* Draggable title bar */}
      <div
        data-tauri-drag-region
        className="w-full h-8 flex items-center justify-center shrink-0"
      >
        <span className="text-[11px] font-medium text-slate-500 tracking-wider uppercase">
          VoiceApp
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-4">
        {/* Sound wave animation */}
        <SoundWaveAnimation analyserNode={analyserNode} isActive={isActive} />

        {/* Mic / Stop button */}
        <MicButton isActive={isActive} onClick={toggle} />

        {/* Status + language indicator */}
        <StatusIndicator status={status} language={detectedLanguage} />

        {/* Last transcript preview */}
        {isActive && lastTranscript && (
          <motion.div
            className="w-full max-w-[240px] text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs text-slate-400 truncate" title={lastTranscript}>
              {lastTranscript}
            </p>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            className="w-full max-w-[240px] text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Hotkey hints */}
        <div className="text-[10px] text-slate-600 text-center">
          <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono">F10</span>
          {" "}Start
          <span className="mx-2">·</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono">F11</span>
          {" "}Stop
        </div>
      </div>

      {/* API Key section */}
      <div className="w-full px-6 pb-4 shrink-0">
        <ApiKeyInput onSubmit={setApiKey} hasKey={!!apiKey} />
      </div>
    </div>
  );
}

export default App;
