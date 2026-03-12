import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { resetSessionId, setInputMode as persistInputMode, setServerBaseUrl as persistServerBaseUrl, toDebugUrl } from '../config/runtime';
import { useOverlayStore } from '../store/overlayStore';

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const formatInt = (n: number) => Math.round(n).toLocaleString();
const formatCompactInt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};
const formatDelta = (n: number) => {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString();
  return rounded >= 0 ? `+${abs}` : `-${abs}`;
};

const formatPercentLabel = (p: number) => `${Math.round(p)}%`;
const formatTimeShort = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remain = totalSeconds % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
};
const formatSignedTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '--';
  const sign = seconds >= 0 ? '+' : '-';
  return `${sign}${formatTimeShort(Math.abs(seconds))}`;
};
const formatJobId = (jobId: number) => `0x${jobId.toString(16).toUpperCase()}`;

type DebugBuff = {
  buffId: number;
  buffName: string;
  sourceId: { value: number };
  appliedAtMs: number;
  durationMs: number;
};

type DebugActor = {
  actorId: { value: number };
  name: string;
  jobId: number;
  currentPlayer: boolean;
  totalDamage: number;
  recentDamage: number;
  receivedBuffContribution: number;
  grantedBuffContribution: number;
  onlineRdps: number;
  hitCount: number;
  observedHitSampleCount: number;
  observedCritHitCount: number;
  observedDirectHitCount: number;
  activeBuffs: DebugBuff[];
};

type CombatDebugSnapshot = {
  fightName: string;
  phase: "IDLE" | "ACTIVE" | "ENDED";
  elapsedMs: number;
  currentPlayerId: { value: number } | null;
  currentPlayer: DebugActor | null;
  actors: DebugActor[];
};

const getJobColor = (job: string): string => {
  const colors: Record<string, string> = {
    // Tank
    PLD: "#A7BAE2", WAR: "#CF5151", DRK: "#D126CC", GNB: "#998D50",
    // Healer
    WHM: "#FFF5EE", SCH: "#8657FF", AST: "#FFE74A", SGE: "#80D1BA",
    // DPS
    MNK: "#D69C52", DRG: "#4164CD", BRD: "#91BA5E", BLM: "#A579D6",
    SMN: "#2D9B78", NIN: "#AF1964", MCH: "#6EE1D6", RDM: "#E87B7B",
    SAM: "#E46D2D", DNC: "#E2B0AF", RPR: "#965A90", VPR: "#52A35C", PCT: "#D15D98"
  };
  return colors[job?.toUpperCase()] || "#CBD5E1"; // 기본값 gray-300
};

export const Hud = () => {
  const {
    data,
    connection,
    actRelayConnection,
    serverBaseUrl,
    sessionId,
    inputMode,
    locked,
    toggleLocked,
    showParty,
    toggleShowParty,
    showDebug,
    toggleShowDebug,
    setInputMode,
    setServerBaseUrl,
    setSessionId,
  } = useOverlayStore();
  const [debugData, setDebugData] = useState<CombatDebugSnapshot | null>(null);

  useEffect(() => {
    if (!showDebug) {
      setDebugData(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(toDebugUrl(serverBaseUrl, inputMode === 'LIVE' ? sessionId : undefined));
        if (!response.ok) return;
        const next = (await response.json()) as CombatDebugSnapshot;
        if (!cancelled) {
          setDebugData(next);
        }
      } catch {
        if (!cancelled) {
          setDebugData(null);
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [inputMode, serverBaseUrl, sessionId, showDebug]);

  const handleChangeServer = () => {
    const next = window.prompt('paceMeter server URL', serverBaseUrl)?.trim();
    if (!next) {
      return;
    }

    const normalized = next.replace(/\/+$/, '');
    try {
      new URL(normalized);
    } catch {
      window.alert('Invalid server URL');
      return;
    }

    persistServerBaseUrl(normalized);
    setServerBaseUrl(normalized);
  };

  const handleNewSession = () => {
    const next = resetSessionId();
    setSessionId(next);
    setDebugData(null);
  };

  const handleToggleInputMode = () => {
    const next = inputMode === 'LIVE' ? 'REPLAY' : 'LIVE';
    persistInputMode(next);
    setInputMode(next);
    setDebugData(null);
  };

  // 데이터가 없으면 빈 화면
  if (!data) {
    return (
      <div className="drag-region w-full h-auto bg-black/80 text-white p-2 font-mono select-none border border-white/10 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Waiting for connection...</span>
          <div className="w-2 h-2 rounded-full bg-gray-500" />
        </div>
      </div>
    );
  }

  const youRdps = data.you?.rdps ?? 0;
  const topIndividualDps = data.you?.individualPace?.expectedDps ?? 0;
  const percentage = topIndividualDps > 0 ? (youRdps / topIndividualDps) * 100 : 0;
  const pct = clamp(percentage, 0, 100);

  const isActive = connection === 'CONNECTED_ACTIVE';
  const isDisconnected = connection === 'DISCONNECTED';
  const clearability = data.clearability;
  const isLowConfidenceClear = clearability?.confidence === 'LOW';
  const clearabilityTone = !clearability
    ? 'border-white/10 bg-white/5'
    : isLowConfidenceClear
      ? 'border-amber-400/35 bg-amber-500/10'
      : clearability.canClear
      ? 'border-emerald-400/35 bg-emerald-500/10'
      : 'border-rose-400/35 bg-rose-500/10';
  const confidenceTone = clearability?.confidence === 'LOW'
    ? 'text-amber-300'
    : clearability?.confidence === 'MEDIUM'
      ? 'text-sky-300'
      : 'text-emerald-300';
  const relayTone = inputMode === 'REPLAY'
    ? 'bg-violet-400'
    : actRelayConnection === 'CONNECTED'
    ? 'bg-emerald-400'
    : actRelayConnection === 'CONNECTING'
      ? 'bg-amber-400'
      : actRelayConnection === 'ERROR'
        ? 'bg-rose-400'
        : 'bg-slate-500';
  const relayLabel = inputMode === 'REPLAY'
    ? 'REPLAY'
    : actRelayConnection === 'CONNECTED'
    ? 'ACT LIVE'
    : actRelayConnection === 'CONNECTING'
      ? 'ACT WAIT'
      : actRelayConnection === 'ERROR'
        ? 'ACT ERROR'
        : 'ACT OFF';
  const serverLabel = (() => {
    try {
      return new URL(serverBaseUrl).host;
    } catch {
      return serverBaseUrl;
    }
  })();

  return (
    <div
      className={clsx(
        "w-full h-auto bg-black/80 text-white p-2 font-mono select-none border border-white/10 rounded-lg shadow-2xl overflow-hidden",
        locked ? "" : "drag-region"
      )}
    >
      <div className="flex justify-end mb-1">
        <div className="mr-auto flex items-center gap-1.5 text-[10px] text-white/60">
          <span className={`inline-block h-2 w-2 rounded-full ${relayTone}`} />
          <span>{relayLabel}</span>
          <button
            onClick={handleToggleInputMode}
            className="no-drag rounded bg-white/8 px-1.5 py-0.5 text-white/75 hover:bg-white/15"
            title="Toggle LIVE / REPLAY mode"
          >
            {inputMode}
          </button>
          <button
            onClick={handleChangeServer}
            className="no-drag rounded bg-white/8 px-1.5 py-0.5 text-white/75 hover:bg-white/15"
            title={serverBaseUrl}
          >
            {serverLabel}
          </button>
          {inputMode === 'LIVE' && (
            <button
              onClick={handleNewSession}
              className="no-drag rounded bg-white/8 px-1.5 py-0.5 text-white/75 hover:bg-white/15"
              title={sessionId}
            >
              {sessionId.slice(0, 8)}
            </button>
          )}
        </div>
        <button
          onClick={toggleShowDebug}
          className="no-drag text-[10px] px-1.5 py-0.5 mr-1 rounded bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
          title="Ctrl+Shift+D"
        >
          {showDebug ? "DEBUG ON" : "DEBUG"}
        </button>
        <button
          onClick={toggleLocked}
          className="no-drag text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20"
          title="Ctrl+Shift+O"
      >
          {locked ? "LOCK" : "MOVE"}
        </button>
      </div>

      {clearability && (
        <div className={clsx("mb-2 rounded-lg border px-2.5 py-2 no-drag", clearabilityTone)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">Clear Check</div>
              <div className={clsx(
                "mt-1 text-sm font-bold tracking-wide",
                isLowConfidenceClear
                  ? "text-amber-300"
                  : clearability.canClear
                    ? "text-emerald-300"
                    : "text-rose-300"
              )}>
                {isLowConfidenceClear
                  ? "초기 추정치"
                  : clearability.canClear
                    ? "클리어 가능"
                    : "클리어 어려움"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/45">신뢰도</div>
              <div className={clsx("text-xs font-semibold", confidenceTone)}>
                {clearability.confidence}
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] tabular-nums">
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/55">예상 킬</span>
              <span className="font-semibold text-white">{formatTimeShort(clearability.estimatedKillTimeSeconds)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/55">엔레이지</span>
              <span className="font-semibold text-white">{formatTimeShort(clearability.enrageTimeSeconds)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/55">{clearability.marginSeconds >= 0 ? '여유' : '부족'}</span>
              <span className={clsx(
                "font-semibold",
                clearability.marginSeconds >= 0 ? "text-emerald-300" : "text-rose-300"
              )}>
                {formatSignedTime(clearability.marginSeconds)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/55">필요 DPS</span>
              <span className="font-semibold text-white">{formatCompactInt(clearability.requiredDps)}</span>
            </div>
          </div>

          {clearability.confidence === 'LOW' && (
            <div className="mt-2 rounded-md bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">
              전투 시작 1분 미만이라 참고용 수치입니다.
            </div>
          )}

          {clearability.confidence === 'MEDIUM' && (
            <div className="mt-2 rounded-md bg-sky-400/10 px-2 py-1 text-[10px] text-sky-200">
              전투 3분 미만 구간이라 추정 오차가 남아 있을 수 있습니다.
            </div>
          )}
        </div>
      )}

      {showDebug && (
        <div className="mb-2 rounded-lg border border-cyan-400/20 bg-cyan-500/8 px-2.5 py-2 no-drag">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">Debug</div>
              <div className="mt-1 text-sm font-bold text-cyan-100">rDPS Attribution</div>
            </div>
            <div className="text-right text-[10px] text-cyan-100/65">
              <div>{debugData?.phase ?? "--"}</div>
              <div>{debugData ? `${Math.round(debugData.elapsedMs / 1000)}s` : "--"}</div>
            </div>
          </div>

          {debugData?.currentPlayer ? (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] tabular-nums">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">YOU</span>
                <span className="font-semibold text-white">{debugData.currentPlayer.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">JOB</span>
                <span className="font-semibold text-white">{formatJobId(debugData.currentPlayer.jobId)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">RAW</span>
                <span className="font-semibold text-white">{formatInt(debugData.currentPlayer.totalDamage)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">RECENT</span>
                <span className="font-semibold text-white">{formatInt(debugData.currentPlayer.recentDamage)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">RECV</span>
                <span className="font-semibold text-rose-300">{formatInt(debugData.currentPlayer.receivedBuffContribution)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">GRANT</span>
                <span className="font-semibold text-emerald-300">{formatInt(debugData.currentPlayer.grantedBuffContribution)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">rDPS</span>
                <span className="font-semibold text-cyan-200">{formatInt(debugData.currentPlayer.onlineRdps)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/55">SAMPLES</span>
                <span className="font-semibold text-white">
                  {debugData.currentPlayer.observedHitSampleCount}
                  {" / "}
                  {debugData.currentPlayer.observedCritHitCount}C
                  {" / "}
                  {debugData.currentPlayer.observedDirectHitCount}D
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-white/55">현재 플레이어 디버그 데이터가 아직 없습니다.</div>
          )}

          {debugData?.currentPlayer?.activeBuffs?.length ? (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Active Buffs</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {debugData.currentPlayer.activeBuffs.slice(0, 8).map((buff) => (
                  <div
                    key={`${buff.buffId}-${buff.sourceId.value}-${buff.appliedAtMs}`}
                    className="rounded-md border border-white/10 bg-white/6 px-1.5 py-1 text-[10px] text-white/80"
                  >
                    {buff.buffName || `0x${buff.buffId.toString(16).toUpperCase()}`}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 개인 rDPS 비교: 왼쪽=내 rDPS / 오른쪽=TOP rDPS (차이) */}
      {data.you && (
        <div className="flex justify-between items-baseline mb-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-400 leading-none">rDPS</span>
            <span className="text-xl font-bold leading-none tabular-nums">
              {formatInt(data.you.rdps)}
            </span>
          </div>
          {data.you.individualPace && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 leading-none">TOP</span>
              <span className="text-base font-semibold leading-none tabular-nums">
                {formatInt(data.you.individualPace.expectedDps)}
                {' '}
                <span className={clsx(
                  data.you.individualPace.delta >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  ({formatDelta(data.you.individualPace.delta)})
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 파티 DPS: 현재값은 항상 표시, 비교군이 있으면 TOP도 함께 표시 */}
      <div className="flex justify-between items-baseline mb-1">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 leading-none">PARTY</span>
          <span className="text-base font-bold leading-none tabular-nums">
            {formatInt(data.partyDps)}
          </span>
        </div>
        {data.pace && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 leading-none">TOP</span>
            <span className="text-sm font-semibold leading-none tabular-nums">
              {formatInt(data.pace.expectedDps)}
              {' '}
              <span className={clsx(
                data.pace.delta >= 0 ? "text-green-400" : "text-red-400"
              )}>
                ({formatDelta(data.pace.delta)})
              </span>
            </span>
          </div>
        )}
      </div>

      {/* 중단: % / 타이틀 / 시간 */}
      <div className="flex justify-between items-center text-[11px] text-gray-300 mb-1.5 px-0.5 no-drag">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleShowParty}
            className="bg-white/10 px-1 rounded text-white font-bold hover:bg-white/20 transition-colors"
          >
            {showParty ? "▲" : "▼"} {formatPercentLabel(pct)}
          </button>
          <span className="opacity-60 text-[10px] tracking-wide">{data.fightName || "PACE METER"}</span>
        </div>
        <span className="font-bold tracking-widest tabular-nums">{data.elapsed}</span>
      </div>

      {/* 하단: 프로그레스 바 */}
      <div className="relative w-full h-2 bg-gray-800 rounded-full">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />

        {/* 연결 상태 점 */}
        <div
          className={clsx(
            "absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full",
            isDisconnected ? "bg-gray-500" : isActive ? "bg-green-400 animate-pulse" : "bg-yellow-400"
          )}
          title={connection}
        />
      </div>

      {/* 파티원 목록 (확장 가능) */}
      <div className={clsx(
        "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
        showParty
          ? "grid-rows-[1fr] opacity-100 mt-2 pointer-events-auto"
          : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
      )}>
        <div className="overflow-hidden space-y-0.5">
          {data.actors.map((actor, idx) => {
            const jobColor = getJobColor(actor.job);
            const maxRdps = Math.max(...data.actors.map(a => a.rdps), 1);
            const barWidth = (actor.rdps / maxRdps) * 100;

            return (
              <div
                key={actor.id}
                className={clsx(
                  "relative flex items-center justify-between h-6 px-2 rounded overflow-hidden transition-opacity",
                  actor.isDead && "opacity-40"
                )}
              >
                <div
                  className="absolute left-0 top-0 h-full opacity-15"
                  style={{ width: `${barWidth}%`, backgroundColor: jobColor }}
                />
                <div className="flex items-center gap-2 z-10">
                  <span className="text-[9px] text-gray-500 w-3">{idx + 1}</span>
                  {actor.isDead && <span className="text-[10px]">💀</span>}
                  <img
                    src={`/icons/jobs/${actor.job}.png`}
                    className="w-3.5 h-3.5 object-contain"
                    alt={actor.job}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span
                    className={clsx(
                      "text-[11px] font-medium truncate w-24",
                      actor.isDead && "line-through"
                    )}
                    style={{ color: actor.isDead ? "#6B7280" : jobColor }}
                  >
                    {actor.name}
                  </span>
                </div>
                <div
                  className="z-10 text-[11px] font-bold tabular-nums"
                  style={{ color: actor.isDead ? "#6B7280" : jobColor }}
                >
                  {formatInt(actor.rdps)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
