export interface User {
  id: string;
  username: string;
}

export interface PublicKeyPayload {
  from: string;
  to: string;
  publicKeyJWK: Record<string, unknown>;
}

export interface EncryptedMessagePayload {
  id: string;
  from: string;
  to: string;
  iv: string;
  ciphertext: string;
  selfDestructSeconds?: number;
  timestamp: number;
}

export interface ServerToClientEvents {
  "user-joined": (user: User) => void;
  "user-left": (user: User) => void;
  "user-list": (users: User[]) => void;
  "public-key": (payload: PublicKeyPayload) => void;
  "encrypted-message": (payload: EncryptedMessagePayload) => void;
  "message-delivered": (data: { messageId: string; to: string }) => void;
}

export interface ClientToServerEvents {
  join: (data: { username: string }) => void;
  "public-key": (payload: PublicKeyPayload) => void;
  "encrypted-message": (payload: EncryptedMessagePayload) => void;
  "message-delivered": (data: { messageId: string; to: string }) => void;
}
