export interface User {
  id: string;
  username: string;
}

export type MessageStatus = "sending" | "sent" | "delivered";

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  status: MessageStatus;
  selfDestructSeconds?: number;
  selfDestructAt?: number;
}

export interface EncryptedPayload {
  id: string;
  from: string;
  to: string;
  iv: string;
  ciphertext: string;
  selfDestructSeconds?: number;
  timestamp: number;
}

export interface PublicKeyPayload {
  from: string;
  to: string;
  publicKeyJWK: JsonWebKey;
}
