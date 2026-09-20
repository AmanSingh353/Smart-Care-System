import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";

export type CareEvent =
  | "patient:updated"
  | "lab:result"
  | "pharmacy:updated"
  | "notification:new"
  | "family:updated"
  | "admin:live";

let io: Server | null = null;

/**
 * Initialize Socket.io on the HTTP server.
 * Real-time domain events will emit through `emitCareEvent` in later phases.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on("join:patient", (patientId: string) => {
      if (typeof patientId === "string" && patientId.trim()) {
        socket.join(`patient:${patientId.trim().toUpperCase()}`);
      }
    });

    socket.on("join:role", (role: string) => {
      if (typeof role === "string" && role.trim()) {
        socket.join(`role:${role.trim().toLowerCase()}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  console.log(`[socket] Socket.io ready (CORS origin: ${env.clientUrl})`);
  return io;
}

export function getIO(): Server | null {
  return io;
}

/** Emit a typed care event — no-op until clients subscribe in Phase 3+. */
export function emitCareEvent(event: CareEvent, payload: unknown, room?: string) {
  if (!io) return;
  if (room) {
    io.to(room).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}
