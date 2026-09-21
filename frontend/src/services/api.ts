/**
 * Central HTTP client for the SCS30 backend.
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type TokenProvider = () => Promise<string | null> | string | null;
let tokenProvider: TokenProvider | null = null;

/** Register async Firebase ID token provider (set by AuthContext). */
export function setAuthTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;
}

async function request<T>(path: string, options: RequestInit = {}, extraHeaders?: HeadersInit): Promise<T> {
  const url = `${API_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
    ...(extraHeaders as Record<string, string> | undefined),
  };

  if (!headers.Authorization && tokenProvider) {
    const token = await tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, extraHeaders?: HeadersInit) => request<T>(path, { method: "GET" }, extraHeaders),
  post: <T>(path: string, body?: unknown, extraHeaders?: HeadersInit) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }, extraHeaders),
  put: <T>(path: string, body?: unknown, extraHeaders?: HeadersInit) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }, extraHeaders),
  patch: <T>(path: string, body?: unknown, extraHeaders?: HeadersInit) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }, extraHeaders),
  delete: <T>(path: string, extraHeaders?: HeadersInit) => request<T>(path, { method: "DELETE" }, extraHeaders),
  baseUrl: API_URL,
};

export default api;
