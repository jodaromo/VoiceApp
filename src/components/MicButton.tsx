import { motion, AnimatePresence } from "motion/react";

interface MicButtonProps {
  isActive: boolean;
  onClick: () => void;
}

function MicIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function MicButton({ isActive, onClick }: MicButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      style={{
        background: isActive
          ? "linear-gradient(135deg, #ef4444, #dc2626)"
          : "linear-gradient(135deg, #3b82f6, #6366f1)",
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      aria-label={isActive ? "Stop dictation" : "Start dictation"}
    >
      {/* Pulse ring when active */}
      {isActive && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-red-400"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.span
            key="stop"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <StopIcon />
          </motion.span>
        ) : (
          <motion.span
            key="mic"
            initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
            transition={{ duration: 0.2 }}
          >
            <MicIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
