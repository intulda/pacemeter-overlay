import { z } from "zod";

export type OverlayTickUi = {
  you: { dps: number };
  top: { dps: number };
  delta: number;
  percentage: number;
  elapsed: string;
};

export const OverlayTickSchema = z.object({
  type: z.literal("overlay_tick"),
  ts: z.number(),
  combat: z.object({
    inCombat: z.boolean(),
    elapsedMs: z.number(),
    encounterKey: z.string().optional(),
  }),
  you: z.object({
    ndps: z.object({
      total: z.number(),
      roll10s: z.number(),
    }),
    rdpsOnline: z.object({
      total: z.number(),
      roll10s: z.number(),
      confidence: z.number(), // 0~1
    }),
  }),
  pace: z.object({
    profileId: z.string(),
    expectedAtElapsed: z.number(),
    delta: z.number(),
    ratio: z.number(),
  }),
});

export const OverlaySnapshotSchema = z.object({
  fightName: z.string(),
  phase: z.union([z.literal("ACTIVE"), z.literal("ENDED")]).or(z.string()),
  elapsedMs: z.number(),
  elapsedFormatted: z.string(),
  totalPartyDamage: z.number(),
  partyDps: z.number(),
  actors: z.array(z.any()), // MVP: 일단 any, 나중에 ActorSnapshot 스키마로 강화
  paceComparison: z.any().nullable(), // MVP
  isFinal: z.boolean(),
});

export const OverlayTickEnvelopeSchema = z.object({
  type: z.literal("overlay_tick"),
  snapshot: OverlaySnapshotSchema,
});

export type OverlayTickEnvelope = z.infer<typeof OverlayTickEnvelopeSchema>;
export type OverlaySnapshot = z.infer<typeof OverlaySnapshotSchema>;
export type OverlayTick = z.infer<typeof OverlayTickSchema>;
