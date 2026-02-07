import { motion } from "motion/react";
import type { DictationStatus } from "../stores/dictationStore";

interface StatusIndicatorProps {
  status: DictationStatus;
  language: string;
}

export function StatusIndicator({ status, language }: StatusIndicatorProps) {
  const isActive = status === "active";

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {/* Status dot */}
      <span className="relative flex h-2.5 w-2.5">
        {isActive && (
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-green-400"
            animate={{ opacity: [1, 0.5, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isActive ? "bg-green-500" : "bg-slate-500"
          }`}
        />
      </span>

      {/* Status text */}
      <span className={isActive ? "text-green-400" : "text-slate-400"}>
        {isActive ? "Active" : "Inactive"}
      </span>

      {/* Language badge */}
      {isActive && language !== "..." && (
        <motion.span
          className="px-1.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {language}
        </motion.span>
      )}
    </div>
  );
}
