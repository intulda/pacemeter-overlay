import { z } from "zod";

// ============================================================================
// Backend 타입 정의 (Java OverlaySnapshot 구조와 일치)
// ============================================================================

export const ActorIdSchema = z.object({
  value: z.number(),
});

export const ConfidenceSchema = z.object({
  score: z.number(), // 0.0 ~ 1.0
  reasons: z.array(z.string()),
});

export const ActorSnapshotSchema = z.object({
  actorId: ActorIdSchema,
  name: z.string(),
  totalDamage: z.number(),
  dps: z.number(),
  onlineRdps: z.number(),
  rdpsConfidence: ConfidenceSchema,
  damagePercent: z.number(), // 0.0 ~ 1.0
  hitCount: z.number(),
  recentDps: z.number(),
});

export const PaceComparisonSchema = z.object({
  profileLabel: z.string(),
  expectedCumulativeDamage: z.number(),
  actualCumulativeDamage: z.number(),
  deltaDamage: z.number(),
  deltaPercent: z.number(),
  projectedKillTimeMs: z.number(),
  referenceKillTimeMs: z.number(),
});

export const OverlaySnapshotSchema = z.object({
  fightName: z.string(),
  phase: z.enum(["IDLE", "ACTIVE", "ENDED"]),
  elapsedMs: z.number(),
  elapsedFormatted: z.string(),
  totalPartyDamage: z.number(),
  partyDps: z.number(),
  actors: z.array(ActorSnapshotSchema),
  paceComparison: PaceComparisonSchema.nullable(),
  isFinal: z.boolean(),
});

export const OverlayMessageSchema = z.object({
  type: z.literal("snapshot"),
  snapshot: OverlaySnapshotSchema,
});

// ============================================================================
// UI 타입 정의 (화면 렌더링용)
// ============================================================================

export type ActorUi = {
  id: number;
  name: string;
  job: string; // TODO: 직업 감지 로직 추가 필요
  dps: number;
  rdps: number;
  confidence: number;
  damagePercent: number;
  recentDps: number;
};

export type OverlayUi = {
  fightName: string;
  phase: "IDLE" | "ACTIVE" | "ENDED";
  elapsed: string;

  // 파티 전체
  partyDps: number;
  totalDamage: number;

  // 본인 (YOU)
  you: {
    dps: number;
    rdps: number;
    confidence: number;
  } | null;

  // 페이스 비교
  pace: {
    label: string;
    expectedDps: number;
    delta: number;
    deltaPercent: number;
  } | null;

  // 파티원 목록
  actors: ActorUi[];
};

// ============================================================================
// Zod 타입 추론
// ============================================================================

export type OverlaySnapshot = z.infer<typeof OverlaySnapshotSchema>;
export type ActorSnapshot = z.infer<typeof ActorSnapshotSchema>;
export type PaceComparison = z.infer<typeof PaceComparisonSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type OverlayMessage = z.infer<typeof OverlayMessageSchema>;
