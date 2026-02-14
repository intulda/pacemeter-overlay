import {OverlayTickEnvelopeSchema} from "./schemas";
import { useOverlayStore } from "../store/overlayStore";
import {envelopeToUi} from "./mapTick";

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
      console.log("[ws] open", url);
      retry = 0;
      setConn("CONNECTED_IDLE");
      startStaleTimer();
    };

    ws.onclose = () => {
      useOverlayStore.getState().setTick(null);
      setConn("DISCONNECTED");
      const delay = Math.min(5000, 250 * Math.pow(2, retry++));
      setTimeout(connect, delay);
    };

    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data);
        const parsed = OverlayTickEnvelopeSchema.safeParse(raw);
        if (!parsed.success) return;

        const ui = envelopeToUi(parsed.data);
        useOverlayStore.getState().setTick(ui);

        // 연결 상태
        useOverlayStore.getState().setConnection("CONNECTED_ACTIVE");
      } catch {
        // ignore
      }
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
