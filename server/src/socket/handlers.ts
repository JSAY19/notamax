import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  User,
} from "../types";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const users = new Map<string, User>();

export function registerHandlers(io: IOServer, socket: IOSocket) {
  socket.on("join", ({ username }) => {
    const user: User = { id: socket.id, username };
    users.set(socket.id, user);

    const list = Array.from(users.values());
    io.emit("user-list", list);
    socket.broadcast.emit("user-joined", user);
  });

  // Relay public keys without inspecting them
  socket.on("public-key", (payload) => {
    const target = Array.from(users.values()).find(
      (u) => u.username === payload.to
    );
    if (target) {
      io.to(target.id).emit("public-key", payload);
    }
  });

  // Relay encrypted blobs — server never decrypts
  socket.on("encrypted-message", (payload) => {
    const target = Array.from(users.values()).find(
      (u) => u.username === payload.to
    );
    if (target) {
      io.to(target.id).emit("encrypted-message", payload);
    }
  });

  socket.on("message-delivered", (data) => {
    const sender = Array.from(users.values()).find(
      (u) => u.username === data.to
    );
    if (sender) {
      io.to(sender.id).emit("message-delivered", data);
    }
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit("user-left", user);
    }
  });
}
