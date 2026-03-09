import clsx from 'clsx';
import { useOverlayStore } from '../store/overlayStore';

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const formatInt = (n: number) => Math.round(n).toLocaleString();
const formatDelta = (n: number) => {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString();
  return rounded >= 0 ? `+${abs}` : `-${abs}`;
};

const formatPercentLabel = (p: number) => `${Math.round(p)}%`;

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
  const { data, connection, locked, toggleLocked, showParty, toggleShowParty } = useOverlayStore();

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

  const youDps = data.you?.dps ?? 0;
  const topDps = data.pace?.expectedDps ?? data.partyDps;
  const delta = data.pace?.delta ?? 0;
  const percentage = topDps > 0 ? (youDps / topDps) * 100 : 0;
  const pct = clamp(percentage, 0, 100);

  const isActive = connection === 'CONNECTED_ACTIVE';
  const isDisconnected = connection === 'DISCONNECTED';

  return (
    <div
      className={clsx(
        "w-full h-auto bg-black/80 text-white p-2 font-mono select-none border border-white/10 rounded-lg shadow-2xl overflow-hidden",
        locked ? "" : "drag-region"
      )}
    >
      <div className="flex justify-end mb-1">
        <button
          onClick={toggleLocked}
          className="no-drag text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20"
          title="Ctrl+Shift+O"
        >
          {locked ? "🔒 LOCK" : "✋ MOVE"}
        </button>
      </div>

      {/* 상단: YOU vs TOP */}
      <div className="flex justify-between items-end mb-1">
        <div className="flex flex-col">
          <span className="text-[10px] text-cyan-400 leading-none">YOU</span>
          <span className="text-xl font-bold leading-none">{formatInt(youDps)}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-400 leading-none">
            {data.pace ? data.pace.label : "PARTY"} {formatInt(topDps)}
          </span>
          <span
            className={clsx(
              "text-sm font-semibold leading-none tabular-nums",
              delta >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {formatDelta(delta)}
          </span>
        </div>
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
        showParty ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
      )}>
        <div className="overflow-hidden space-y-0.5">
          {data.actors.map((actor, idx) => {
            const jobColor = getJobColor(actor.job);
            const maxDps = Math.max(...data.actors.map(a => a.dps), 1);
            const barWidth = (actor.dps / maxDps) * 100;

            return (
              <div key={actor.id} className="relative flex items-center justify-between h-6 px-2 rounded overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full opacity-15"
                  style={{ width: `${barWidth}%`, backgroundColor: jobColor }}
                />
                <div className="flex items-center gap-2 z-10">
                  <span className="text-[9px] text-gray-500 w-3">{idx + 1}</span>
                  <img
                    src={`/icons/jobs/${actor.job}.png`}
                    className="w-3.5 h-3.5 object-contain"
                    alt={actor.job}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span className="text-[11px] font-medium truncate w-24" style={{ color: jobColor }}>
                    {actor.name}
                  </span>
                </div>
                <div className="z-10 text-[11px] font-bold tabular-nums" style={{ color: jobColor }}>
                  {formatInt(actor.dps)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};