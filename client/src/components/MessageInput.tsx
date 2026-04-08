import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onSend: (text: string, selfDestruct?: number, stegoMode?: boolean) => void;
  disabled: boolean;
}

const DESTRUCT_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5s", value: 5 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
];

export default function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [selfDestruct, setSelfDestruct] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [stegoMode, setStegoMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, selfDestruct || undefined, stegoMode);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-gray-800/50 bg-gray-900/30 p-3">
      <AnimatePresence>
        {showTimer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 mb-2 overflow-hidden"
          >
            {DESTRUCT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelfDestruct(opt.value);
                  setShowTimer(false);
                }}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  selfDestruct === opt.value
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowTimer(!showTimer)}
          className={`p-2 rounded-lg transition-colors ${
            selfDestruct > 0
              ? "text-red-400 bg-red-500/10"
              : "text-gray-500 hover:text-gray-400 hover:bg-gray-800"
          }`}
          title="Self-destruct timer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button
          onClick={() => setStegoMode(!stegoMode)}
          className={`p-2 rounded-lg transition-colors ${
            stegoMode
              ? "text-violet-400 bg-violet-500/10"
              : "text-gray-500 hover:text-gray-400 hover:bg-gray-800"
          }`}
          title="Steganography mode — hide message in innocent text"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={disabled ? "Exchanging keys..." : "Type a message..."}
          disabled={disabled}
          className="flex-1 px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40 transition-colors disabled:opacity-40"
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </motion.button>
      </div>

      {(selfDestruct > 0 || stegoMode) && (
        <div className="flex gap-3 mt-1.5 ml-10">
          {selfDestruct > 0 && (
            <p className="text-[10px] text-red-400/70">
              Self-destruct: {selfDestruct}s
            </p>
          )}
          {stegoMode && (
            <p className="text-[10px] text-violet-400/70">
              Steganography mode active
            </p>
          )}
        </div>
      )}
    </div>
  );
}
