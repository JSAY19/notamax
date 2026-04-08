import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useChatStore } from "../store/chatStore";
import { useMessaging } from "../context/MessagingContext";
import { hideInText } from "../crypto/steganography";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

const STEGO_COVERS = [
  "Have a nice day!",
  "See you later.",
  "Sounds good to me.",
  "Thanks for letting me know.",
  "Got it, will do.",
  "Let me check and get back to you.",
];

export default function ChatWindow() {
  const activeChat = useChatStore((s) => s.activeChat);
  const messages = useChatStore((s) => s.messages);
  const username = useChatStore((s) => s.username);
  const cryptoKeys = useChatStore((s) => s.cryptoKeys);
  const { sendMessage } = useMessaging();
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMessages = activeChat ? messages.get(activeChat) || [] : [];
  const hasKey = activeChat ? !!cryptoKeys?.sharedKeys.get(activeChat) : false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-800/50 mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Select a user to start chatting</p>
          <p className="text-gray-700 text-xs mt-1">All messages are end-to-end encrypted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-800/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
          {activeChat[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-200">{activeChat}</h2>
          <div className="flex items-center gap-1">
            {hasKey ? (
              <>
                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[11px] text-emerald-400/70">
                  End-to-end encrypted
                </span>
              </>
            ) : (
              <span className="text-[11px] text-yellow-500/70">
                Exchanging encryption keys...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence>
          {chatMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.from === username}
            />
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={(text, selfDestruct, stegoMode) => {
          if (stegoMode) {
            const cover =
              STEGO_COVERS[Math.floor(Math.random() * STEGO_COVERS.length)];
            const stegoText = hideInText(text, cover);
            sendMessage(activeChat, stegoText, selfDestruct);
          } else {
            sendMessage(activeChat, text, selfDestruct);
          }
        }}
        disabled={!hasKey}
      />
    </div>
  );
}
