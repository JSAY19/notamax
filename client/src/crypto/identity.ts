/**
 * Device identity: ECDH private key is encrypted at rest with a user-held recovery key.
 * Recovery key is random bytes, shown once; never sent to the server.
 */

const STORAGE_KEY = "notamax_identity_v1";

export interface StoredIdentity {
  v: 1;
  username: string;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
}

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Random 32-byte recovery secret, display as base64url (one line). */
export function generateRecoveryKey(): string {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return b64encode(raw.buffer)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function recoveryKeyToBytes(recoveryKey: string): ArrayBuffer {
  let b64 = recoveryKey.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return b64decode(b64);
}

async function deriveWrapKey(
  recoveryKeyBytes: ArrayBuffer,
  salt: Uint8Array
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    recoveryKeyBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const saltBuf = new Uint8Array(salt);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: 210_000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function exportKeyPairJwks(pair: CryptoKeyPair): Promise<{
  privateJwk: JsonWebKey;
  publicJwk: JsonWebKey;
}> {
  const [privateJwk, publicJwk] = await Promise.all([
    crypto.subtle.exportKey("jwk", pair.privateKey),
    crypto.subtle.exportKey("jwk", pair.publicKey),
  ]);
  return { privateJwk, publicJwk };
}

export async function importIdentityKeyPair(
  privateJwk: JsonWebKey,
  publicJwk: JsonWebKey
): Promise<CryptoKeyPair> {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
  return { privateKey, publicKey };
}

export async function sealIdentity(
  username: string,
  pair: CryptoKeyPair,
  recoveryKey: string
): Promise<StoredIdentity> {
  const { privateJwk, publicJwk } = await exportKeyPairJwks(pair);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrapKey = await deriveWrapKey(recoveryKeyToBytes(recoveryKey), salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(
    JSON.stringify({ privateJwk, publicJwk })
  );
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    plain
  );
  return {
    v: 1,
    username,
    saltB64: b64encode(salt.buffer),
    ivB64: b64encode(iv.buffer),
    ciphertextB64: b64encode(ct),
  };
}

export async function openIdentity(
  stored: StoredIdentity,
  recoveryKey: string
): Promise<{
  username: string;
  privateJwk: JsonWebKey;
  publicJwk: JsonWebKey;
}> {
  const salt = new Uint8Array(b64decode(stored.saltB64));
  const iv = new Uint8Array(b64decode(stored.ivB64));
  const wrapKey = await deriveWrapKey(recoveryKeyToBytes(recoveryKey), salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    b64decode(stored.ciphertextB64)
  );
  const bundle = JSON.parse(new TextDecoder().decode(decrypted)) as {
    privateJwk: JsonWebKey;
    publicJwk: JsonWebKey;
  };
  return {
    username: stored.username,
    privateJwk: bundle.privateJwk,
    publicJwk: bundle.publicJwk,
  };
}

export function saveIdentity(stored: StoredIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function loadStoredIdentity(): StoredIdentity | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

export function clearStoredIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const FRIENDS_KEY = "notamax_friends_v1";

export function loadFriends(): string[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveFriends(friends: string[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}
