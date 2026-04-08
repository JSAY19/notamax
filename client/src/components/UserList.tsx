import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../store/chatStore";
import { useMessaging } from "../context/MessagingContext";
import KeyQR from "./KeyQR";
import { disconnectSocket } from "../lib/socket";

export default function UserList() {
  const users = useChatStore((s) => s.users);
  const friends = useChatStore((s) => s.friends);
  const addFriend = useChatStore((s) => s.addFriend);
  const removeFriend = useChatStore((s) => s.removeFriend);
  const resetSession = useChatStore((s) => s.resetSession);
  const activeChat = useChatStore((s) => s.activeChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const username = useChatStore((s) => s.username);
  const cryptoKeys = useChatStore((s) => s.cryptoKeys);
  const { resyncFriendKeys } = useMessaging();

  const [friendInput, setFriendInput] = useState("");

  const handleAddFriend = () => {
    addFriend(friendInput);
    setFriendInput("");
    queueMicrotask(() => resyncFriendKeys());
  };

  const handleLogout = () => {
    resetSession();
    disconnectSocket();
  };

  return (
    <div className="w-72 bg-gray-900/50 border-r border-gray-800/50 flex flex-col">
      <div className="p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-gray-300 flex-1 truncate">
            {username}
          </span>
          <KeyQR />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Онлайн: {users.length}. Добавьте друга по имени — оба должны добавить
          друг друга.
        </p>
      </div>

      <div className="p-3 border-b border-gray-800/50 space-y-2">
        <div className="flex gap-2">
          <input
            value={friendInput}
            onChange={(e) => setFriendInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
            placeholder="Имя друга"
            className="flex-1 min-w-0 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40"
          />
          <button
            type="button"
            onClick={handleAddFriend}
            disabled={!friendInput.trim()}
            className="px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-white shrink-0"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {friends.length === 0 ? (
            <div className="p-4 text-center text-gray-600 text-sm">
              Список друзей пуст. Добавьте имя того, с кем общаетесь.
            </div>
          ) : (
            friends.map((fname) => {
              const onlineUser = users.find((u) => u.username === fname);
              const hasKey = !!cryptoKeys?.sharedKeys.get(fname);
              const isOnline = !!onlineUser;
              return (
                <motion.div
                  key={fname}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-stretch border-b border-gray-800/30"
                >
                  <button
                    type="button"
                    onClick={() => isOnline && setActiveChat(fname)}
                    disabled={!isOnline}
                    className={`flex-1 px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                      activeChat === fname ? "bg-gray-800/70" : ""
                    } ${isOnline ? "hover:bg-gray-800/50" : "opacity-50 cursor-not-allowed"}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300 shrink-0">
                      {fname[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-200 truncate">
                          {fname}
                        </span>
                        {isOnline && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                        {hasKey && isOnline && (
                          <svg
                            className="w-3 h-3 text-emerald-400 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {!isOnline
                          ? "Не в сети"
                          : hasKey
                            ? "E2E готов"
                            : "Обмен ключами…"}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFriend(fname)}
                    className="px-2 text-gray-600 hover:text-red-400 text-xs"
                    title="Удалить из друзей"
                  >
                    ×
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-gray-800/50 space-y-2">
        <div className="flex items-center gap-1.5 text-gray-600">
          <span className="text-xs">Spy Mode — чаты только в RAM</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800/50"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
