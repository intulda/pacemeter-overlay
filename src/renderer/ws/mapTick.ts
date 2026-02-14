import type {OverlayTick, OverlayTickEnvelope, OverlayTickUi} from "./schemas";

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${pad2(s)}`;
}

export function toOverlayTickUi(t: OverlayTick): OverlayTickUi {
  const youDps = t.you.rdpsOnline.roll10s;     // 또는 total
  const topDps = t.pace.expectedAtElapsed;     // "현재 시점 목표 dps"로 사용
  const ratio = t.pace.ratio || (topDps > 0 ? youDps / topDps : 0);

  return {
    you: { dps: youDps },
    top: { dps: topDps },
    delta: t.pace.delta,
    percentage: ratio * 100,
    elapsed: formatElapsed(t.combat.elapsedMs),
  };
}

export function envelopeToUi(msg: OverlayTickEnvelope): OverlayTickUi {
  const you = msg.snapshot.partyDps ?? 0;
  const top = 0;

  const delta = you - top;
  const percentage = top > 0 ? (you / top) * 100 : 0;

  return {
    you: { dps: you },
    top: { dps: top },
    delta,
    percentage,
    elapsed: msg.snapshot.elapsedFormatted,
  };
}
