import type { OverlaySnapshot, OverlayUi, ActorUi } from "./schemas";

/**
 * 직업 추론 (임시)
 * TODO: 백엔드에서 jobId 전송하도록 수정 필요
 */
function inferJob(name: string): string {
  // 임시: 이름으로 추론 불가능하므로 기본값
  // 추후 ActorSnapshot에 jobId 필드 추가 필요
  return name ?? "DPS";
}

/**
 * 백엔드 OverlaySnapshot → UI용 OverlayUi 변환
 */
export function snapshotToUi(snapshot: OverlaySnapshot): OverlayUi {
  // 파티원 목록 변환
  const actors: ActorUi[] = snapshot.actors.map((actor) => ({
    id: actor.actorId.value,
    name: actor.name,
    job: inferJob(actor.name), // TODO: 백엔드에서 jobId 받도록 수정
    dps: actor.dps,
    rdps: actor.onlineRdps,
    confidence: actor.rdpsConfidence.score,
    damagePercent: actor.damagePercent,
    recentDps: actor.recentDps,
  }));

  // 본인(YOU) 찾기 - 첫 번째 캐릭터를 본인으로 가정
  // TODO: 백엔드에서 isYou 플래그 전송하도록 수정 필요
  const you = actors.length > 0 ? {
    dps: actors[0].dps,
    rdps: actors[0].rdps,
    confidence: actors[0].confidence,
  } : null;

  // 페이스 비교
  const pace = snapshot.paceComparison ? {
    label: snapshot.paceComparison.profileLabel,
    expectedDps: snapshot.paceComparison.expectedCumulativeDamage / (snapshot.elapsedMs / 1000),
    delta: snapshot.paceComparison.deltaDamage,
    deltaPercent: snapshot.paceComparison.deltaPercent,
  } : null;

  return {
    fightName: snapshot.fightName,
    phase: snapshot.phase,
    elapsed: snapshot.elapsedFormatted,
    partyDps: snapshot.partyDps,
    totalDamage: snapshot.totalPartyDamage,
    you,
    pace,
    actors,
  };
}