import { create } from "zustand";
import { getInputMode, getServerBaseUrl, getSessionId, type InputMode } from "../config/runtime";
import type { OverlayUi } from "../ws/schemas";

export type ConnectionState =
  | "DISCONNECTED"
  | "CONNECTED_IDLE"
  | "CONNECTED_ACTIVE"
  | "CONNECTED_STALE";

export type RelayConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "ERROR";

type OverlayState = {
  connection: ConnectionState;
  actRelayConnection: RelayConnectionState;
  data: OverlayUi | null;
  serverBaseUrl: string;
  sessionId: string;
  inputMode: InputMode;

  // overlay behavior
  locked: boolean;
  showParty: boolean;
  showDebug: boolean;

  // actions
  setConnection: (c: ConnectionState) => void;
  setActRelayConnection: (c: RelayConnectionState) => void;
  setData: (d: OverlayUi | null) => void;
  setServerBaseUrl: (url: string) => void;
  setSessionId: (sessionId: string) => void;
  setInputMode: (inputMode: InputMode) => void;

  toggleLocked: () => void;
  toggleShowParty: () => void;
  toggleShowDebug: () => void;
  setLocked: (v: boolean) => void;
};

export const useOverlayStore = create<OverlayState>((set) => ({
  connection: "DISCONNECTED",
  actRelayConnection: "DISCONNECTED",
  data: null,
  serverBaseUrl: getServerBaseUrl(),
  sessionId: getSessionId(),
  inputMode: getInputMode(),

  locked: false,
  showParty: false,
  showDebug: false,

  setConnection: (c) => set({ connection: c }),
  setActRelayConnection: (c) => set({ actRelayConnection: c }),
  setData: (d) => set({ data: d }),
  setServerBaseUrl: (serverBaseUrl) => set({ serverBaseUrl }),
  setSessionId: (sessionId) => set({ sessionId }),
  setInputMode: (inputMode) => set({ inputMode }),

  toggleLocked: () => set((s) => ({ locked: !s.locked })),
  toggleShowParty: () => set((s) => ({ showParty: !s.showParty })),
  toggleShowDebug: () => set((s) => ({ showDebug: !s.showDebug })),
  setLocked: (v) => set({ locked: v }),
}));
