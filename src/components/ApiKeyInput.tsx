import { useState } from "react";
import { motion } from "motion/react";

interface ApiKeyInputProps {
  onSubmit: (key: string) => void;
  hasKey: boolean;
}

export function ApiKeyInput({ onSubmit, hasKey }: ApiKeyInputProps) {
  const [key, setKey] = useState("");
  const [isEditing, setIsEditing] = useState(!hasKey);

  if (!isEditing && hasKey) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
      >
        Change API key
      </button>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="w-full flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (key.trim()) {
          onSubmit(key.trim());
          setIsEditing(false);
        }
      }}
    >
      <input
        type="password"
        placeholder="Deepgram API key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
        autoFocus
      />
      <button
        type="submit"
        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors cursor-pointer"
      >
        Save Key
      </button>
    </motion.form>
  );
}
