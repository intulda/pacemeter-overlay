import {
  formatSignedTime,
  formatTimeShort,
} from "@/renderer/features/shared/utils/format";
import { ClearabilityType } from "@/renderer/ws/schemas";
import clsx from "clsx";

export default function ClearAbility({
  clearability,
}: {
  clearability: ClearabilityType;
}) {
  const isLowConfidenceClear = clearability?.confidence === "LOW";
  const clearabilityTone = !clearability
    ? "border-white/10 bg-white/5"
    : isLowConfidenceClear
      ? "border-amber-400/35 bg-amber-500/10"
      : clearability.canClear
        ? "border-emerald-400/35 bg-emerald-500/10"
        : "border-rose-400/35 bg-rose-500/10";
  const confidenceTone =
    clearability?.confidence === "LOW"
      ? "text-amber-300"
      : clearability?.confidence === "MEDIUM"
        ? "text-sky-300"
        : "text-emerald-300";

  return (
    <div
      className={clsx(
        "mb-2 rounded-lg border px-2.5 py-2 no-drag",
        clearabilityTone,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">
            Clear Check
          </div>
          <div
            className={clsx(
              "mt-1 text-sm font-bold tracking-wide",
              isLowConfidenceClear
                ? "text-amber-300"
                : clearability.canClear
                  ? "text-emerald-300"
                  : "text-rose-300",
            )}
          >
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
          <span className="font-semibold text-white">
            {formatTimeShort(clearability.estimatedKillTimeSeconds)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/55">엔레이지</span>
          <span className="font-semibold text-white">
            {formatTimeShort(clearability.enrageTimeSeconds)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/55">
            {clearability.marginSeconds >= 0 ? "여유" : "부족"}
          </span>
          <span
            className={clsx(
              "font-semibold",
              clearability.marginSeconds >= 0
                ? "text-emerald-300"
                : "text-rose-300",
            )}
          >
            {formatSignedTime(clearability.marginSeconds)}
          </span>
        </div>
      </div>

      {clearability.confidence === "LOW" && (
        <div className="mt-2 rounded-md bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">
          전투 시작 1분 미만이라 참고용 수치입니다.
        </div>
      )}

      {clearability.confidence === "MEDIUM" && (
        <div className="mt-2 rounded-md bg-sky-400/10 px-2 py-1 text-[10px] text-sky-200">
          전투 3분 미만 구간이라 추정 오차가 남아 있을 수 있습니다.
        </div>
      )}
    </div>
  );
}
