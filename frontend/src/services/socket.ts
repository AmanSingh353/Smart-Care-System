import { io, Socket } from "socket.io-client";
import { api } from "./api";
import { getIdToken } from "@/lib/firebase";

type CareGuardSocketEvent = "careguard:signal-created" | "careguard:signal-updated";

let socket: Socket | null = null;
const listeners = new Map<string, Set<(payload: unknown) => void>>();

async function getSocketAuth(): Promise<Record<string, string>> {
  try {
    const raw = sessionStorage.getItem("scs30-auth");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      kind?: string;
      role?: string;
      patientId?: string;
    };
    const headers: Record<string, string> = {};
    if (parsed.kind === "family" || parsed.role === "family") {
      if (parsed.role) headers["x-scs-role"] = "family";
      if (parsed.patientId) headers["x-scs-patient-id"] = parsed.patientId;
      headers.Authorization = `Bearer ${btoa(JSON.stringify({ role: "family", patientId: parsed.patientId }))}`;
      return headers;
    }
    const token = await getIdToken(false);
    if (token) headers.Authorization = `Bearer ${token}`;
    if (parsed.role) headers["x-scs-role"] = parsed.role;
    return headers;
  } catch {
    return {};
  }
}

/** Connect once; no-op if already connected. Cleans up on disconnectSocket. */
export function connectSocket(role?: string | null) {
  if (typeof window === "undefined") return null;
  if (socket?.connected) {
    if (role && role !== "family") socket.emit("join:role", role);
    return socket;
  }

  socket = io(api.baseUrl, {
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
  });

  void getSocketAuth().then(auth => {
    if (!socket) return;
    socket.auth = auth;
    socket.connect();
  });

  socket.on("connect", () => {
    void getSocketAuth().then(headers => {
      const r = role || headers["x-scs-role"];
      if (r && r !== "family") socket?.emit("join:role", r);
    });
  });

  socket.onAny((event, payload) => {
    const set = listeners.get(event);
    if (!set) return;
    set.forEach(fn => {
      try {
        fn(payload);
      } catch {
        /* ignore listener errors */
      }
    });
  });

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  listeners.clear();
}

export function joinPatientRoom(patientId: string) {
  if (!socket?.connected || !patientId) return;
  socket.emit("join:patient", patientId.toUpperCase());
}

export function onSocketEvent(event: CareGuardSocketEvent | string, handler: (payload: unknown) => void) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

export function getSocket() {
  return socket;
}
