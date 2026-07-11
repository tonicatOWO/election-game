import { z } from 'zod';

export const DEFAULT_CONFIG = {
  maxCandidates: 6,
  minCandidates: 2,
  debateMs: 300_000,
  tiebreakDebateMs: 120_000,
  votingMs: 45_000,
  topicRevealMs: 10_000,
  resultMs: 10_000,
  eliminatedCanVote: true,
  midJoinVotesNextRound: true,
  maxReplays: 3,
  finalTiebreak: 'random' as 'random' | 'host',
  lobbyChat: false,
} as const;

export const roomConfigSchema = z.object({
  maxCandidates: z.number().int().min(2).max(12),
  minCandidates: z.number().int().min(2).max(12),
  debateMs: z.number().int().min(10_000).max(30 * 60_000),
  tiebreakDebateMs: z.number().int().min(10_000).max(30 * 60_000),
  votingMs: z.number().int().min(5_000).max(10 * 60_000),
  topicRevealMs: z.number().int().min(0).max(60_000),
  resultMs: z.number().int().min(0).max(60_000),
  eliminatedCanVote: z.boolean(),
  midJoinVotesNextRound: z.boolean(),
  maxReplays: z.number().int().min(0).max(10),
  finalTiebreak: z.enum(['random', 'host']),
  lobbyChat: z.boolean(),
});

export const roomConfigPatchSchema = roomConfigSchema.partial();

export type RoomConfig = z.infer<typeof roomConfigSchema>;
