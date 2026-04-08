import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { ChatMessage } from "../types";
import { useChatStore } from "../store/chatStore";
import { containsHidden, extractFromText } from "../crypto/steganography";

interface Props {
  message: ChatMessage;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: Props) {
  const removeMessage = useChatStore((s) => s.removeMessage);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const hasStegoContent = containsHidden(message.text);
  const hiddenText = hasStegoContent ? extractFromText(message.text) : null;

  useEffect(() => {
    if (!message.selfDestructAt) return;

    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((message.selfDestructAt! - Date.now()) / 1000)
      );
      setRemaining(left);
      if (left <= 0) {
        const peer = isMine ? message.to : message.from;
        removeMessage(peer, message.id);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [message, isMine, removeMessage]);

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusIcon =
    message.status === "delivered" ? (
      <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.75l6 6" />
      </svg>
    ) : message.status === "sent" ? (
      <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ) : (
      <div className="w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{
        opacity: remaining !== null && remaining <= 3 ? 0.5 : 1,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
    >
      <div
        className={`max-w-[70%] px-3.5 py-2 rounded-2xl ${
          isMine
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-gray-800 text-gray-100 rounded-bl-md"
        }`}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {showHidden && hiddenText ? hiddenText : message.text.replace(/[\u200B\u200C\u200D\uFEFF]/g, "")}
        </p>
        {hasStegoContent && (
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`text-[10px] mt-0.5 ${
              isMine ? "text-emerald-200/60" : "text-violet-400/60"
            } hover:underline`}
          >
            {showHidden ? "Show cover" : "Reveal hidden"}
          </button>
        )}
        <div
          className={`flex items-center gap-1.5 mt-1 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] ${
              isMine ? "text-emerald-200/70" : "text-gray-500"
            }`}
          >
            {time}
          </span>
          {remaining !== null && (
            <span
              className={`text-[10px] font-mono ${
                remaining <= 5
                  ? "text-red-400"
                  : isMine
                  ? "text-emerald-200/70"
                  : "text-gray-500"
              }`}
            >
              {remaining}s
            </span>
          )}
          {isMine && statusIcon}
        </div>
      </div>
    </motion.div>
  );
}
