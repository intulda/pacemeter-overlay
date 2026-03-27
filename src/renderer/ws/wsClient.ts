import { useOverlayStore } from "@/renderer/features/hud/store/overlayStore";
import { snapshotToUi } from "@/renderer/ws/mapTick";
import { OverlayMessageSchema } from "@/renderer/ws/schemas";

type Options = {
  url: string;
  staleMs?: number;
};

export function startWsClient({ url, staleMs = 2000 }: Options) {
  let ws: WebSocket | null = null;
  let closedByUser = false;
  let retry = 0;
  let lastTickAt = 0;
  let reconnectTimer: number | null = null;
  let reconnectScheduled = false;

  const setConn = (c: any) => useOverlayStore.getState().setConnection(c);

  const scheduleReconnect = () => {
    if (closedByUser || reconnectScheduled) return;
    reconnectScheduled = true;
    const delay = Math.min(5000, 250 * Math.pow(2, retry++));
    reconnectTimer = window.setTimeout(() => {
      reconnectScheduled = false;
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const startStaleTimer = () => {
    const timer = setInterval(() => {
      if (closedByUser) {
        clearInterval(timer);
        return;
      }
      if (!lastTickAt) return;
      const now = Date.now();
      const cur = useOverlayStore.getState().connection;
      if (cur !== "DISCONNECTED" && now - lastTickAt > staleMs) {
        setConn("CONNECTED_STALE");
      }
    }, 500);
  };

  const connect = () => {
    if (closedByUser) return;

    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("[ws] connected to", url);
      retry = 0;
      reconnectScheduled = false;
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      setConn("CONNECTED_IDLE");
      startStaleTimer();
    };

    ws.onclose = () => {
      console.log("[ws] disconnected");
      useOverlayStore.getState().setData(null);
      setConn("DISCONNECTED");
      scheduleReconnect();
    };

    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data);
        const parsed = OverlayMessageSchema.safeParse(raw);

        if (!parsed.success) {
          console.warn("[ws] invalid message", parsed.error);
          return;
        }

        // rdps 순서로 파티원 정렬
        const sortedActors = [...parsed.data.snapshot.actors].sort(
          (a, b) => b.onlineRdps - a.onlineRdps,
        );
        const sortedData = {
          ...parsed.data.snapshot,
          sortedActors,
        };

        // OverlaySnapshot → OverlayUi 변환
        const ui = snapshotToUi(sortedData);
        useOverlayStore.getState().setData(ui);

        lastTickAt = Date.now();
        setConn("CONNECTED_ACTIVE");
      } catch (err) {
        console.error("[ws] parse error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[ws] error", err);
      setConn("DISCONNECTED");
      scheduleReconnect();
    };
  };

  connect();

  return {
    stop() {
      closedByUser = true;
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      setConn("DISCONNECTED");
    },
  };
}
