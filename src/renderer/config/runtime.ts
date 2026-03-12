const SERVER_URL_KEY = "pacemeter.serverBaseUrl";
const SESSION_ID_KEY = "pacemeter.sessionId";
const INPUT_MODE_KEY = "pacemeter.inputMode";

export type InputMode = "LIVE" | "REPLAY";

export function getServerBaseUrl(): string {
  const stored = window.localStorage.getItem(SERVER_URL_KEY)?.trim();
  return stored && stored.length > 0 ? stored : "http://127.0.0.1:8080";
}

export function setServerBaseUrl(next: string) {
  window.localStorage.setItem(SERVER_URL_KEY, next.trim().replace(/\/+$/, ""));
}

export function getSessionId(): string {
  const stored = window.localStorage.getItem(SESSION_ID_KEY)?.trim();
  if (stored && stored.length > 0) {
    return stored;
  }
  return resetSessionId();
}

export function resetSessionId(): string {
  const created = window.crypto.randomUUID();
  window.localStorage.setItem(SESSION_ID_KEY, created);
  return created;
}

export function getInputMode(): InputMode {
  const stored = window.localStorage.getItem(INPUT_MODE_KEY);
  return stored === "REPLAY" ? "REPLAY" : "REPLAY";
}

export function setInputMode(next: InputMode) {
  window.localStorage.setItem(INPUT_MODE_KEY, next);
}

export function toOverlayWsUrl(baseUrl: string, sessionId?: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/overlay/ws";
  url.search = sessionId ? `sessionId=${encodeURIComponent(sessionId)}` : "";
  return url.toString();
}

export function toDebugUrl(baseUrl: string, sessionId?: string): string {
  const url = new URL(baseUrl);
  url.pathname = "/api/debug/combat";
  url.search = sessionId ? `sessionId=${encodeURIComponent(sessionId)}` : "";
  return url.toString();
}

export function toRelayUrl(baseUrl: string, sessionId: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/api/relay/${encodeURIComponent(sessionId)}/events`;
  url.search = "";
  return url.toString();
}
