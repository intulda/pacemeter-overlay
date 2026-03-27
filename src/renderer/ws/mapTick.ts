import type { OverlaySnapshot, OverlayUi, ActorUi } from "./schemas";

/**
 * jobId → 직업명 변환 (FFXIV Job ID 매핑)
 */
function jobIdToName(jobId: number): string {
  const jobMap: Record<number, string> = {
    // Tanks
    0x01: "GLA", // Gladiator
    0x03: "MRD", // Marauder
    0x13: "PLD", // Paladin
    0x15: "WAR", // Warrior
    0x20: "DRK", // Dark Knight
    0x25: "GNB", // Gunbreaker
    // Healers
    0x06: "CNJ", // Conjurer
    0x18: "WHM", // White Mage
    0x1c: "SCH", // Scholar
    0x21: "AST", // Astrologian
    0x28: "SGE", // Sage
    // Melee DPS
    0x02: "PGL", // Pugilist
    0x04: "LNC", // Lancer
    0x14: "MNK", // Monk
    0x16: "DRG", // Dragoon
    0x1e: "NIN", // Ninja
    0x22: "SAM", // Samurai
    0x27: "RPR", // Reaper
    0x29: "VPR", // Viper
    // Physical Ranged
    0x05: "ARC", // Archer
    0x17: "BRD", // Bard
    0x1f: "MCH", // Machinist
    0x26: "DNC", // Dancer
    // Magical Ranged
    0x07: "THM", // Thaumaturge
    0x1a: "ACN", // Arcanist
    0x19: "BLM", // Black Mage
    0x1b: "SMN", // Summoner
    0x23: "RDM", // Red Mage
    0x2a: "PCT", // Pictomancer
  };
  return jobMap[jobId] || "???";
}

/**
 * 백엔드 OverlaySnapshot → UI용 OverlayUi 변환
 */
export function snapshotToUi(snapshot: OverlaySnapshot): OverlayUi {
  // elapsedSec: 0으로 나누기 방지
  const elapsedSec = snapshot.elapsedMs > 0 ? snapshot.elapsedMs / 1000 : 1;

  // 파티원 목록 변환
  const actors: ActorUi[] = snapshot.actors.map((actor) => ({
    id: actor.actorId.value,
    name: actor.name,
    job: jobIdToName(actor.jobId),
    dps: actor.dps,
    rdps: actor.onlineRdps,
    confidence: actor.rdpsConfidence.score,
    damagePercent: actor.damagePercent,
    hitCount: actor.hitCount,
    recentDps: actor.recentDps,
    isCurrentPlayer: actor.isCurrentPlayer,
    isDead: actor.isDead,
    deathCount: actor.deathCount,
    maxHitDamage: actor.maxHitDamage,
    maxHitSkillName: actor.maxHitSkillName,
    critRate: actor.critRate,
    directHitRate: actor.directHitRate,
    critDirectHitRate: actor.critDirectHitRate,
  }));

  // 본인(YOU) 찾기 - 백엔드가 명시적으로 표시
  const youActor = snapshot.actors.find((a) => a.isCurrentPlayer);
  const you = youActor
    ? {
        dps: youActor.dps,
        rdps: youActor.onlineRdps,
        confidence: youActor.rdpsConfidence.score,
        individualPace: youActor.individualPace
          ? (() => {
              const topRdps =
                youActor.individualPace!.expectedCumulativeDamage / elapsedSec;
              return {
                label: youActor.individualPace!.profileLabel,
                expectedDps: topRdps,
                // delta = 내 rDPS - TOP rDPS (양수=앞서고 있음, 음수=뒤처짐)
                delta: youActor.onlineRdps - topRdps,
                deltaPercent: youActor.individualPace!.deltaPercent,
              };
            })()
          : null,
      }
    : null;

  // 파티 페이스 비교
  const pace = snapshot.partyPace
    ? (() => {
        const topPartyDps =
          snapshot.partyPace!.expectedCumulativeDamage / elapsedSec;
        return {
          label: snapshot.partyPace!.profileLabel,
          expectedDps: topPartyDps,
          // delta = 우리 파티 DPS - TOP 파티 DPS (양수=앞서고 있음, 음수=뒤처짐)
          delta: snapshot.partyDps - topPartyDps,
          deltaPercent: snapshot.partyPace!.deltaPercent,
        };
      })()
    : null;

  return {
    fightName: snapshot.fightName,
    phase: snapshot.phase,
    elapsed: snapshot.elapsedFormatted,
    partyDps: snapshot.partyDps,
    partyRdps: snapshot.partyRdps ?? snapshot.partyDps,
    totalDamage: snapshot.totalPartyDamage,
    clearability: snapshot.clearability
      ? {
          canClear: snapshot.clearability.canClear,
          estimatedKillTimeSeconds:
            snapshot.clearability.estimatedKillTimeSeconds,
          enrageTimeSeconds: snapshot.clearability.enrageTimeSeconds,
          marginSeconds: snapshot.clearability.marginSeconds,
          confidence: snapshot.clearability.confidence,
        }
      : null,
    you,
    pace,
    actors,
  };
}
