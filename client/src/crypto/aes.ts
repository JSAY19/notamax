/**
 * AES-GCM-256 encryption/decryption.
 *
 * - Each message gets a unique 12-byte IV (NIST recommendation for GCM).
 * - IV is sent alongside ciphertext — it's not secret, but must be unique per message.
 * - GCM provides both confidentiality and integrity (built-in authentication tag).
 */

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    iv: toBase64(iv.buffer),
    ciphertext: toBase64(cipherBuffer),
  };
}

export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const cipherBuffer = fromBase64(ciphertext);
  const ivBuffer = new Uint8Array(fromBase64(iv));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    cipherBuffer
  );

  return new TextDecoder().decode(decrypted);
}
