import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import fs from "fs";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";
import { registerHandlers } from "./socket/handlers";

const app = express();
app.use(express.json());

/** CORS: ALLOWED_ORIGINS=url1,url2 или пусто = разрешить origin запроса (удобно без своего домена). */
function socketCorsOrigin(): string[] | boolean {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

app.use(
  cors({
    origin: socketCorsOrigin(),
  })
);

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: socketCorsOrigin(),
    methods: ["GET", "POST"],
  },
});

/** Собранный Vite: один процесс на хостинге (тот же URL, что выдаёт PaaS — без своего домена). */
const clientDist = path.join(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

io.on("connection", (socket) => {
  console.log(`[+] Connected: ${socket.id}`);
  registerHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`[-] Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`notamax server running on :${PORT}`);
});
