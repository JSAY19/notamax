import { useCallback } from "react";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
} from "../crypto";
import { useChatStore } from "../store/chatStore";

/**
 * All callbacks read cryptoKeys via useChatStore.getState() — not from a
 * reactive selector — so their identity is stable across renders.
 * This prevents the useSocket effect from re-running on every setSharedKey.
 */
export function useCrypto() {
  const initKeys = useCallback(async () => {
    const keyPair = await generateKeyPair();
    useChatStore.getState().setCryptoKeys({
      keyPair,
      sharedKeys: new Map<string, CryptoKey>(),
    });
    return keyPair;
  }, []);

  const loadKeyPair = useCallback((keyPair: CryptoKeyPair) => {
    useChatStore.getState().setCryptoKeys({
      keyPair,
      sharedKeys: new Map<string, CryptoKey>(),
    });
  }, []);

  const getPublicKeyJWK = useCallback(
    async (): Promise<JsonWebKey | null> => {
      const { cryptoKeys } = useChatStore.getState();
      if (!cryptoKeys) return null;
      return exportPublicKey(cryptoKeys.keyPair.publicKey);
    },
    []
  );

  const handlePeerPublicKey = useCallback(
    async (peerUsername: string, peerJWK: JsonWebKey) => {
      const { cryptoKeys } = useChatStore.getState();
      if (!cryptoKeys) return;
      const peerKey = await importPublicKey(peerJWK);
      const shared = await deriveSharedKey(
        cryptoKeys.keyPair.privateKey,
        peerKey
      );
      useChatStore.getState().setSharedKey(peerUsername, shared);
    },
    []
  );

  return {
    initKeys,
    loadKeyPair,
    getPublicKeyJWK,
    handlePeerPublicKey,
  };
}
