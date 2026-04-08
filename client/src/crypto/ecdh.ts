/**
 * ECDH key exchange using Web Crypto API (P-256 curve).
 *
 * Flow:
 * 1. Each client generates an ECDH key pair
 * 2. Public keys are exchanged via the server (server sees only JWK, not private keys)
 * 3. Each side derives the same shared AES-GCM key from their private key + peer's public key
 *    (Diffie-Hellman property: g^(ab) === g^(ba))
 */

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, // extractable — needed to export public key as JWK
    ["deriveKey"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

/**
 * Derive a symmetric AES-GCM-256 key from our private key and the peer's public key.
 * Both sides independently derive the same key (ECDH math guarantee).
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable for security
    ["encrypt", "decrypt"]
  );
}
