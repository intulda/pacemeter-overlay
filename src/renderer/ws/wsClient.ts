import { OverlayMessageSchema } from "./schemas";
import { useOverlayStore } from "../store/overlayStore";
import { snapshotToUi } from "./mapTick";

type Options = {
  url: string;
  staleMs?: number;
};

export function startWsClient({ url, staleMs = 2000 }: Options) {
  let ws: WebSocket | null = null;
  let closedByUser = false;
  let retry = 0;
  let lastTickAt = 0;

  const setConn = (c: any) => useOverlayStore.getState().setConnection(c);

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
      setConn("CONNECTED_IDLE");
      startStaleTimer();
    };

    ws.onclose = () => {
      console.log("[ws] disconnected");
      useOverlayStore.getState().setData(null);
      setConn("DISCONNECTED");
      const delay = Math.min(5000, 250 * Math.pow(2, retry++));
      setTimeout(connect, delay);
    };

    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data);
        const parsed = OverlayMessageSchema.safeParse(raw);

        if (!parsed.success) {
          console.warn("[ws] invalid message", parsed.error);
          return;
        }

        // OverlaySnapshot → OverlayUi 변환
        const ui = snapshotToUi(parsed.data.snapshot);
        useOverlayStore.getState().setData(ui);

        lastTickAt = Date.now();
        setConn("CONNECTED_ACTIVE");
      } catch (err) {
        console.error("[ws] parse error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[ws] error", err);
    };
  };

  connect();

  return {
    stop() {
      closedByUser = true;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      setConn("DISCONNECTED");
    },
  };
}
