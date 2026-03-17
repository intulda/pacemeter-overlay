import { toRelayUrl } from "../config/runtime";
import type { RelayConnectionState } from "@/renderer/features/hud/store/overlayStore";

const ACT_WS_URL = "ws://127.0.0.1:10501/ws";
const MAX_BATCH_SIZE = 200;
const MAX_QUEUE_SIZE = 5000;

type RelayEnvelope =
  | { type: "rawLine"; rawLine: string }
  | {
      type: "changePrimaryPlayer";
      ts: string;
      playerId: number;
      playerName: string;
    }
  | { type: "changeZone"; ts: string; zoneId: number; zoneName: string }
  | {
      type: "combatantAdded";
      ts: string;
      actorId: number;
      name: string;
      jobId: number;
      currentHp: number;
      maxHp: number;
    }
  | { type: "combatDataReady"; memberCount: number };

type Options = {
  serverBaseUrl: string;
  sessionId: string;
  batchMs?: number;
  onStatusChange?: (status: RelayConnectionState) => void;
};

type RelayBootstrapCache = {
  primaryPlayer: Extract<RelayEnvelope, { type: "changePrimaryPlayer" }> | null;
  zone: Extract<RelayEnvelope, { type: "changeZone" }> | null;
  combatants: Extract<RelayEnvelope, { type: "combatantAdded" }>[];
  memberCount: number;
};

const bootstrapStorageKey = (sessionId: string) =>
  `pacemeter.relay.bootstrap.${sessionId}`;

function loadBootstrapCache(sessionId: string): RelayBootstrapCache {
  try {
    const raw = window.localStorage.getItem(bootstrapStorageKey(sessionId));
    if (!raw) {
      return {
        primaryPlayer: null,
        zone: null,
        combatants: [],
        memberCount: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<RelayBootstrapCache>;
    return {
      primaryPlayer: parsed.primaryPlayer ?? null,
      zone: parsed.zone ?? null,
      combatants: parsed.combatants ?? [],
      memberCount: parsed.memberCount ?? 0,
    };
  } catch {
    return { primaryPlayer: null, zone: null, combatants: [], memberCount: 0 };
  }
}

function saveBootstrapCache(sessionId: string, cache: RelayBootstrapCache) {
  try {
    window.localStorage.setItem(
      bootstrapStorageKey(sessionId),
      JSON.stringify(cache),
    );
  } catch {
    // ignore storage failures
  }
}

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
  let needsBootstrap = true;
  const persisted = loadBootstrapCache(sessionId);
  let lastPrimaryPlayer: Extract<
    RelayEnvelope,
    { type: "changePrimaryPlayer" }
  > | null = persisted.primaryPlayer;
  let lastZone: Extract<RelayEnvelope, { type: "changeZone" }> | null =
    persisted.zone;
  let lastCombatants: Extract<RelayEnvelope, { type: "combatantAdded" }>[] =
    persisted.combatants;
  let lastMemberCount = persisted.memberCount;

  const relayUrl = toRelayUrl(serverBaseUrl, sessionId);

  const setStatus = (status: RelayConnectionState) => {
    onStatusChange?.(status);
  };

  const persistBootstrap = () => {
    saveBootstrapCache(sessionId, {
      primaryPlayer: lastPrimaryPlayer,
      zone: lastZone,
      combatants: lastCombatants,
      memberCount: lastMemberCount,
    });
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

  const bootstrapEvents = (): RelayEnvelope[] => {
    const events: RelayEnvelope[] = [];
    if (lastPrimaryPlayer) {
      events.push(lastPrimaryPlayer);
    }
    if (lastZone) {
      events.push(lastZone);
    }
    if (lastCombatants.length > 0) {
      events.push(...lastCombatants);
      events.push({
        type: "combatDataReady",
        memberCount: lastMemberCount,
      });
      if (lastPrimaryPlayer) {
        // Re-assert the authoritative current player after combatants are restored
        // so the backend can refresh individual profile state with a known jobId.
        events.push(lastPrimaryPlayer);
      }
    }
    return events;
  };

  const flush = async () => {
    if (stopped || inflight || queue.length === 0) {
      return;
    }

    inflight = true;
    const batch = queue.splice(0, MAX_BATCH_SIZE);
    const payload = needsBootstrap
      ? bootstrapEvents().concat(batch).slice(0, MAX_QUEUE_SIZE)
      : batch;

    try {
      const response = await fetch(relayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`relay failed: ${response.status}`);
      }
      needsBootstrap = false;
      setStatus("CONNECTED");
    } catch (error) {
      console.warn("[act-relay] flush failed", error);
      queue = batch.concat(queue).slice(0, MAX_QUEUE_SIZE);
      needsBootstrap = true;
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
    if (
      !root?.isActive ||
      typeof root.Combatant !== "object" ||
      root.Combatant == null
    ) {
      lastCombatants = [];
      lastMemberCount = 0;
      persistBootstrap();
      return;
    }

    const ts = new Date().toISOString();
    let memberCount = 0;
    const combatants: Extract<RelayEnvelope, { type: "combatantAdded" }>[] = [];
    for (const [name, combatant] of Object.entries<any>(root.Combatant)) {
      const actorId = parseActorId(combatant?.ID);
      if (actorId === 0) {
        continue;
      }
      memberCount += 1;
      const event = {
        type: "combatantAdded",
        ts,
        actorId,
        name,
        jobId: Number(combatant?.Job ?? 0),
        currentHp: parseDecimalLong(combatant?.CurrentHP),
        maxHp: parseDecimalLong(combatant?.MaxHP),
      } satisfies Extract<RelayEnvelope, { type: "combatantAdded" }>;
      combatants.push(event);
      enqueue(event);
    }
    lastCombatants = combatants;
    lastMemberCount = memberCount;
    persistBootstrap();

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
          events: [
            "CombatData",
            "ChangePrimaryPlayer",
            "LogLine",
            "ChangeZone",
          ],
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload?.type;

        if (
          type === "LogLine" &&
          typeof payload?.rawLine === "string" &&
          payload.rawLine.length > 0
        ) {
          enqueue({ type: "rawLine", rawLine: payload.rawLine });
          return;
        }

        if (type === "ChangePrimaryPlayer") {
          const playerId = Number(payload?.charID ?? 0);
          const playerName = String(payload?.charName ?? "");
          if (playerId !== 0 && playerName.length > 0) {
            lastPrimaryPlayer = {
              type: "changePrimaryPlayer",
              ts: new Date().toISOString(),
              playerId,
              playerName,
            };
            persistBootstrap();
            enqueue(lastPrimaryPlayer);
          }
          return;
        }

        if (type === "ChangeZone") {
          const zoneId = Number(payload?.zoneID ?? 0);
          const zoneName = String(payload?.zoneName ?? "");
          if (zoneId > 0) {
            lastZone = {
              type: "changeZone",
              ts: new Date().toISOString(),
              zoneId,
              zoneName,
            };
            persistBootstrap();
            enqueue(lastZone);
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
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
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
