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

export const Hud = () => {
    const { tick, connection, locked, toggleLocked } = useOverlayStore();

    if (!tick) return null;

    const pct = clamp(tick.percentage, 0, 100);
    const isActive = connection === 'CONNECTED_ACTIVE';
    const isDisconnected = connection === 'DISCONNECTED';

    return (
        <div
            className={clsx(
                "w-full h-full bg-black/80 text-white p-2 font-mono select-none border border-white/10 rounded-lg shadow-2xl overflow-hidden",
                locked ? "" : "drag-region"
            )}
        >
            <div className="flex justify-end mb-1">
                <button
                    onClick={toggleLocked}
                    className="no-drag text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20"
                    title="Ctrl+Shift+O"
                >
                    {locked ? "LOCK" : "MOVE"}
                </button>
            </div>
            {/* 상단: YOU vs TOP */}
            <div className="flex justify-between items-end mb-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-cyan-400 leading-none">YOU</span>
                    <span className="text-xl font-bold leading-none">{formatInt(tick.you.dps)}</span>
                </div>

                <div className="flex flex-col items-end">
                    {/* TOP 숫자를 같이 보여주되, 라벨은 TOP로 고정 */}
                    <span className="text-[10px] text-gray-400 leading-none">
            TOP {formatInt(tick.top.dps)}
          </span>

                    <span
                        className={clsx(
                            "text-sm font-semibold leading-none tabular-nums",
                            tick.delta >= 0 ? "text-green-400" : "text-red-400"
                        )}
                    >
            {formatDelta(tick.delta)}
          </span>
                </div>
            </div>

            {/* 중단: % / 타이틀 / 시간 */}
            <div className="flex justify-between items-center text-[11px] text-gray-300 mb-1.5 px-0.5">
                <div className="flex items-center gap-2">
          <span className="bg-white/10 px-1 rounded text-white font-bold tabular-nums">
            {formatPercentLabel(pct)}
          </span>
                    <span className="opacity-60 text-[10px] tracking-wide">PACE METER</span>
                </div>

                {/* elapsed는 엔진이 주지만, UI는 그대로 표시 */}
                <span className="font-bold tracking-widest tabular-nums">{tick.elapsed}</span>
            </div>

            {/* 하단: 프로그레스 바 */}
            <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
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
        </div>
    );
};
