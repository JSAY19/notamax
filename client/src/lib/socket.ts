import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * URL Socket.io-сервера:
 * - dev: localhost:3001
 * - prod без VITE_SOCKET_URL: тот же origin (фронт и API с одного хоста — типичный VPS/PaaS без своего домена)
 * - prod + VITE_SOCKET_URL: отдельный бэкенд (другой поддомен/IP)
 */
function socketServerUrl(): string {
  const fromEnv = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3001";
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketServerUrl(), {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/** Hard destroy — use only on explicit logout. */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
