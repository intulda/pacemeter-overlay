import { create } from "zustand";
import type { OverlayTickUi } from "../ws/schemas";

export type ConnectionState =
  | "DISCONNECTED"
  | "CONNECTED_IDLE"
  | "CONNECTED_ACTIVE"
  | "CONNECTED_STALE";

export type SeriesPoint = { t: number; youCumulativeDps: number };

type OverlayState = {
    connection: ConnectionState;
    tick: OverlayTickUi | null;

    // chart용(최근 N초)
    series: SeriesPoint[];
    seriesMaxLen: number;

    // overlay behavior
    locked: boolean;

    // actions
    setConnection: (c: ConnectionState) => void;
    setTick: (t: OverlayTickUi | null) => void;
    pushSeriesPoint: (p: SeriesPoint) => void;

    toggleLocked: () => void;
    setLocked: (v: boolean) => void;
};

export const useOverlayStore = create<OverlayState>((set, get) => ({
    connection: "DISCONNECTED",
    tick: null,

    series: [],
    seriesMaxLen: 120, // 최근 2분(1초 tick 기준). 취향대로 60~180

    locked: false,

    setConnection: (c) => set({ connection: c }),
    setTick: (t) => set({ tick: t }),

    pushSeriesPoint: (p) => {
        const { series, seriesMaxLen } = get();
        const next = [...series, p];
        const trimmed = next.length > seriesMaxLen ? next.slice(next.length - seriesMaxLen) : next;
        set({ series: trimmed });
    },

    toggleLocked: () => set((s) => ({ locked: !s.locked })),
    setLocked: (v) => set({ locked: v }),
}));
