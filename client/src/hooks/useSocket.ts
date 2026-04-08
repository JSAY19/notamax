import { useCallback, useEffect } from "react";
import { getSocket } from "../lib/socket";
import { useChatStore } from "../store/chatStore";
import { useCrypto } from "./useCrypto";
import { encrypt, decrypt } from "../crypto/aes";
import { exportPublicKey } from "../crypto/ecdh";
import type { EncryptedPayload, PublicKeyPayload, User } from "../types";

const pendingDecrypt = new Map<string, EncryptedPayload[]>();

/** Throttle re-sends: first emit may miss if peer was not on server yet. */
const lastPublicKeyEmitAt = new Map<string, number>();
const PUBLIC_KEY_THROTTLE_MS = 600;

export function useSocket() {
  const username = useChatStore((s) => s.username);
  const { handlePeerPublicKey } = useCrypto();

  const emitOurPublicKey = useCallback(async (toUsername: string) => {
    const state = useChatStore.getState();
    if (!state.username || toUsername === state.username) return;
    if (!state.friends.includes(toUsername)) return;
    if (!state.cryptoKeys) return;

    const now = Date.now();
    const last = lastPublicKeyEmitAt.get(toUsername) ?? 0;
    if (now - last < PUBLIC_KEY_THROTTLE_MS) return;

    const jwk = await exportPublicKey(state.cryptoKeys.keyPair.publicKey);
    lastPublicKeyEmitAt.set(toUsername, Date.now());
    getSocket().emit("public-key", {
      from: state.username,
      to: toUsername,
      publicKeyJWK: jwk,
    });
  }, []);

  const resyncFriendKeys = useCallback(() => {
    const { users, friends } = useChatStore.getState();
    for (const u of users) {
      if (friends.includes(u.username)) void emitOurPublicKey(u.username);
    }
  }, [emitOurPublicKey]);

  useEffect(() => {
    if (!username) return;

    lastPublicKeyEmitAt.clear();
    const socket = getSocket();

    const isFriend = (name: string) =>
      useChatStore.getState().friends.includes(name);

    const processIncomingEncrypted = async (
      payload: EncryptedPayload,
      key: CryptoKey
    ) => {
      let text: string;
      try {
        text = await decrypt(payload.ciphertext, payload.iv, key);
      } catch {
        return;
      }
      useChatStore.getState().addMessage(payload.from, {
        id: payload.id,
        from: payload.from,
        to: payload.to,
        text,
        timestamp: payload.timestamp,
        status: "delivered",
        selfDestructSeconds: payload.selfDestructSeconds,
        selfDestructAt: payload.selfDestructSeconds
          ? Date.now() + payload.selfDestructSeconds * 1000
          : undefined,
      });
      socket.emit("message-delivered", {
        messageId: payload.id,
        to: payload.from,
      });
    };

    const flushPending = async (peerUsername: string) => {
      const queue = pendingDecrypt.get(peerUsername);
      if (!queue?.length) return;
      pendingDecrypt.set(peerUsername, []);
      const key = useChatStore.getState().getSharedKey(peerUsername);
      if (!key) {
        pendingDecrypt.set(peerUsername, queue);
        return;
      }
      for (const payload of queue) {
        await processIncomingEncrypted(payload, key);
      }
    };

    const retryPublicKeysToFriends = () => {
      for (const u of useChatStore.getState().users) {
        if (u.username !== username && isFriend(u.username)) {
          lastPublicKeyEmitAt.delete(u.username);
          void emitOurPublicKey(u.username);
        }
      }
    };

    const onConnect = () => {
      useChatStore.getState().setConnected(true);
      socket.emit("join", { username });
      setTimeout(retryPublicKeysToFriends, 800);
      setTimeout(retryPublicKeysToFriends, 2500);
    };

    const onDisconnect = () => {
      useChatStore.getState().setConnected(false);
    };

    const onUserList = (users: User[]) => {
      useChatStore.getState().setUsers(
        users.filter((u) => u.username !== username)
      );
      for (const u of users) {
        if (u.username !== username && isFriend(u.username)) {
          void emitOurPublicKey(u.username);
        }
      }
    };

    const onUserJoined = (user: User) => {
      if (user.username === username) return;
      useChatStore.getState().addUser(user);
      if (isFriend(user.username)) void emitOurPublicKey(user.username);
    };

    const onUserLeft = (user: User) => {
      useChatStore.getState().removeUser(user);
      lastPublicKeyEmitAt.delete(user.username);
    };

    const onPublicKey = async (payload: PublicKeyPayload) => {
      if (payload.to !== username) return;
      if (!isFriend(payload.from)) return;

      await handlePeerPublicKey(payload.from, payload.publicKeyJWK);
      await flushPending(payload.from);

      // Всегда шлём свой ключ обратно (с троттлингом): второй клиент мог не
      // получить первый emit, пока не был в комнате сервера.
      await emitOurPublicKey(payload.from);
    };

    const onEncryptedMessage = async (payload: EncryptedPayload) => {
      if (payload.to !== username) return;
      if (!isFriend(payload.from)) return;

      const key = useChatStore.getState().getSharedKey(payload.from);
      if (!key) {
        const q = pendingDecrypt.get(payload.from) || [];
        if (!q.some((p) => p.id === payload.id)) q.push(payload);
        pendingDecrypt.set(payload.from, q);
        return;
      }
      await processIncomingEncrypted(payload, key);
    };

    const onDelivered = (data: { messageId: string }) => {
      useChatStore.getState().updateMessageStatus(data.messageId, "delivered");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("user-list", onUserList);
    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("public-key", onPublicKey);
    socket.on("encrypted-message", onEncryptedMessage);
    socket.on("message-delivered", onDelivered);

    if (!socket.connected) socket.connect();
    else onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("user-list", onUserList);
      socket.off("user-joined", onUserJoined);
      socket.off("user-left", onUserLeft);
      socket.off("public-key", onPublicKey);
      socket.off("encrypted-message", onEncryptedMessage);
      socket.off("message-delivered", onDelivered);
    };
  }, [username, emitOurPublicKey, handlePeerPublicKey]);

  const sendMessage = useCallback(
    async (
      to: string,
      plaintext: string,
      selfDestructSeconds?: number
    ) => {
      const state = useChatStore.getState();
      if (!state.friends.includes(to)) return;
      const key = state.getSharedKey(to);
      if (!key) return;

      const encrypted = await encrypt(plaintext, key);
      const id = crypto.randomUUID();
      const timestamp = Date.now();

      getSocket().emit("encrypted-message", {
        id,
        from: state.username,
        to,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        selfDestructSeconds,
        timestamp,
      });

      state.addMessage(to, {
        id,
        from: state.username,
        to,
        text: plaintext,
        timestamp,
        status: "sent",
        selfDestructSeconds,
        selfDestructAt: selfDestructSeconds
          ? Date.now() + selfDestructSeconds * 1000
          : undefined,
      });
    },
    []
  );

  return { sendMessage, resyncFriendKeys };
}
