import { create } from "zustand";
import type { ChatMessage, MessageStatus, User } from "../types";
import { loadFriends, saveFriends } from "../crypto/identity";

interface CryptoKeys {
  keyPair: CryptoKeyPair;
  sharedKeys: Map<string, CryptoKey>;
}

interface ChatState {
  username: string;
  connected: boolean;
  users: User[];
  friends: string[];
  messages: Map<string, ChatMessage[]>;
  activeChat: string | null;
  cryptoKeys: CryptoKeys | null;
  spyMode: boolean;

  setUsername: (username: string) => void;
  setConnected: (connected: boolean) => void;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (user: User) => void;
  setActiveChat: (username: string | null) => void;
  setCryptoKeys: (keys: CryptoKeys) => void;
  setSharedKey: (username: string, key: CryptoKey) => void;
  getSharedKey: (username: string) => CryptoKey | undefined;
  addFriend: (username: string) => void;
  removeFriend: (username: string) => void;
  hydrateFriends: () => void;
  addMessage: (peer: string, message: ChatMessage) => void;
  updateMessageStatus: (messageId: string, status: MessageStatus) => void;
  removeMessage: (peer: string, messageId: string) => void;
  resetSession: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  username: "",
  connected: false,
  users: [],
  friends: [],
  messages: new Map(),
  activeChat: null,
  cryptoKeys: null,
  spyMode: true,

  setUsername: (username) => set({ username }),
  setConnected: (connected) => set({ connected }),

  setUsers: (users) => set({ users }),

  addUser: (user) =>
    set((state) => ({
      users: state.users.some((u) => u.username === user.username)
        ? state.users
        : [...state.users, user],
    })),

  removeUser: (user) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== user.id),
    })),

  setActiveChat: (username) => set({ activeChat: username }),

  setCryptoKeys: (keys) => set({ cryptoKeys: keys }),

  setSharedKey: (username, key) => {
    const { cryptoKeys } = get();
    if (cryptoKeys) {
      cryptoKeys.sharedKeys.set(username, key);
      set({ cryptoKeys: { ...cryptoKeys } });
    }
  },

  getSharedKey: (username) => {
    const { cryptoKeys } = get();
    return cryptoKeys?.sharedKeys.get(username);
  },

  hydrateFriends: () => set({ friends: loadFriends() }),

  addFriend: (name) => {
    const n = name.trim();
    if (!n) return;
    const { username, friends } = get();
    if (n === username) return;
    if (friends.includes(n)) return;
    const next = [...friends, n];
    saveFriends(next);
    set({ friends: next });
  },

  removeFriend: (name) => {
    const { friends, activeChat } = get();
    const next = friends.filter((f) => f !== name);
    saveFriends(next);
    set({
      friends: next,
      activeChat: activeChat === name ? null : activeChat,
    });
  },

  addMessage: (peer, message) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const existing = newMessages.get(peer) || [];
      if (existing.some((m) => m.id === message.id)) {
        return {};
      }
      newMessages.set(peer, [...existing, message]);
      return { messages: newMessages };
    }),

  updateMessageStatus: (messageId, status) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      for (const [peer, msgs] of newMessages) {
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const updated = [...msgs];
          updated[idx] = { ...updated[idx], status };
          newMessages.set(peer, updated);
          break;
        }
      }
      return { messages: newMessages };
    }),

  removeMessage: (peer, messageId) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const existing = newMessages.get(peer) || [];
      newMessages.set(
        peer,
        existing.filter((m) => m.id !== messageId)
      );
      return { messages: newMessages };
    }),

  resetSession: () =>
    set({
      username: "",
      connected: false,
      users: [],
      messages: new Map(),
      activeChat: null,
      cryptoKeys: null,
    }),
}));
