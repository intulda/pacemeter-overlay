import { toRelayUrl } from "../config/runtime";
import type { RelayConnectionState } from "../store/overlayStore";

const ACT_WS_URL = "ws://127.0.0.1:10501/ws";
const MAX_BATCH_SIZE = 200;
const MAX_QUEUE_SIZE = 5000;

type RelayEnvelope =
  | { type: "rawLine"; rawLine: string }
  | { type: "changePrimaryPlayer"; ts: string; playerId: number; playerName: string }
  | { type: "changeZone"; ts: string; zoneId: number; zoneName: string }
  | { type: "combatantAdded"; ts: string; actorId: number; name: string; jobId: number; currentHp: number; maxHp: number }
  | { type: "combatDataReady"; memberCount: number };

type Options = {
  serverBaseUrl: string;
  sessionId: string;
  batchMs?: number;
  onStatusChange?: (status: RelayConnectionState) => void;
};

export function startActRelayClient({
  serverBaseUrl,
  sessionId,
  batchMs = 50,
  onStatusChange,
}: Options) {
  let ws: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let flushTimer: number | null = null;
  let stopped = false;
  let retry = 0;
  let inflight = false;
  let queue: RelayEnvelope[] = [];

  const relayUrl = toRelayUrl(serverBaseUrl, sessionId);

  const setStatus = (status: RelayConnectionState) => {
    onStatusChange?.(status);
  };

  const enqueue = (event: RelayEnvelope) => {
    queue.push(event);
    if (queue.length > MAX_QUEUE_SIZE) {
      queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
    }
    if (queue.length >= MAX_BATCH_SIZE) {
      void flush();
    }
  };

  const flush = async () => {
    if (stopped || inflight || queue.length === 0) {
      return;
    }

    inflight = true;
    const batch = queue.splice(0, MAX_BATCH_SIZE);

    try {
      const response = await fetch(relayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(`relay failed: ${response.status}`);
      }
    } catch (error) {
      console.warn("[act-relay] flush failed", error);
      queue = batch.concat(queue).slice(0, MAX_QUEUE_SIZE);
      setStatus("ERROR");
    } finally {
      inflight = false;
      if (!stopped && queue.length > 0) {
        void flush();
      }
    }
  };

  const scheduleReconnect = () => {
    if (stopped) {
      return;
    }
    const delay = Math.min(5000, 250 * Math.pow(2, retry++));
    reconnectTimer = window.setTimeout(connect, delay);
  };

  const handleCombatData = (root: any) => {
    if (!root?.isActive || typeof root.Combatant !== "object" || root.Combatant == null) {
      return;
    }

    const ts = new Date().toISOString();
    let memberCount = 0;
    for (const [name, combatant] of Object.entries<any>(root.Combatant)) {
      const actorId = parseActorId(combatant?.ID);
      if (actorId === 0) {
        continue;
      }
      memberCount += 1;
      enqueue({
        type: "combatantAdded",
        ts,
        actorId,
        name,
        jobId: Number(combatant?.Job ?? 0),
        currentHp: parseDecimalLong(combatant?.CurrentHP),
        maxHp: parseDecimalLong(combatant?.MaxHP),
      });
    }

    enqueue({
      type: "combatDataReady",
      memberCount,
    });
  };

  const connect = () => {
    if (stopped) {
      return;
    }

    setStatus("CONNECTING");
    ws = new WebSocket(ACT_WS_URL);

    ws.onopen = () => {
      retry = 0;
      setStatus("CONNECTED");
      ws?.send(
        JSON.stringify({
          call: "subscribe",
          events: ["CombatData", "ChangePrimaryPlayer", "LogLine", "ChangeZone"],
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload?.type;

        if (type === "LogLine" && typeof payload?.rawLine === "string" && payload.rawLine.length > 0) {
          enqueue({ type: "rawLine", rawLine: payload.rawLine });
          return;
        }

        if (type === "ChangePrimaryPlayer") {
          const playerId = Number(payload?.charID ?? 0);
          const playerName = String(payload?.charName ?? "");
          if (playerId !== 0 && playerName.length > 0) {
            enqueue({
              type: "changePrimaryPlayer",
              ts: new Date().toISOString(),
              playerId,
              playerName,
            });
          }
          return;
        }

        if (type === "ChangeZone") {
          const zoneId = Number(payload?.zoneID ?? 0);
          const zoneName = String(payload?.zoneName ?? "");
          if (zoneId > 0) {
            enqueue({
              type: "changeZone",
              ts: new Date().toISOString(),
              zoneId,
              zoneName,
            });
          }
          return;
        }

        if (type === "CombatData") {
          handleCombatData(payload);
        }
      } catch (error) {
        console.warn("[act-relay] invalid payload", error);
      }
    };

    ws.onerror = () => {
      setStatus("ERROR");
    };

    ws.onclose = () => {
      setStatus("DISCONNECTED");
      scheduleReconnect();
    };
  };

  flushTimer = window.setInterval(() => {
    void flush();
  }, batchMs);

  connect();

  return {
    stop() {
      stopped = true;
      setStatus("DISCONNECTED");
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
      }
      if (flushTimer != null) {
        window.clearInterval(flushTimer);
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    },
  };
}

function parseActorId(value: unknown): number {
  if (typeof value !== "string" || value.length === 0) {
    return 0;
  }

  const normalized = value.replace(/^0x/i, "");
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDecimalLong(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
