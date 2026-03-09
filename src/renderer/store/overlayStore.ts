import { create } from "zustand";
import type { OverlayUi } from "../ws/schemas";

export type ConnectionState =
  | "DISCONNECTED"
  | "CONNECTED_IDLE"
  | "CONNECTED_ACTIVE"
  | "CONNECTED_STALE";

type OverlayState = {
  connection: ConnectionState;
  data: OverlayUi | null;

  // overlay behavior
  locked: boolean;
  showParty: boolean;

  // actions
  setConnection: (c: ConnectionState) => void;
  setData: (d: OverlayUi | null) => void;

  toggleLocked: () => void;
  toggleShowParty: () => void;
  setLocked: (v: boolean) => void;
};

export const useOverlayStore = create<OverlayState>((set) => ({
  connection: "DISCONNECTED",
  data: null,

  locked: false,
  showParty: false,

  setConnection: (c) => set({ connection: c }),
  setData: (d) => set({ data: d }),

  toggleLocked: () => set((s) => ({ locked: !s.locked })),
  toggleShowParty: () => set((s) => ({ showParty: !s.showParty })),
  setLocked: (v) => set({ locked: v }),
}));
