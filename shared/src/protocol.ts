import { z } from 'zod';
import { roomConfigPatchSchema, roomConfigSchema } from './config';

export const roleSchema = z.enum(['candidate', 'voter']);
export const phaseSchema = z.enum([
  'lobby',
  'topic_reveal',
  'debate',
  'voting',
  'round_result',
  'game_over',
]);

export type Role = z.infer<typeof roleSchema>;
export type Phase = z.infer<typeof phaseSchema>;

export const topicSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  scenario: z.string(),
  tags: z.array(z.string()),
});

export type Topic = z.infer<typeof topicSchema>;

export const c2sSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('set_role'), role: roleSchema }),
  z.object({ t: z.literal('ready'), ready: z.boolean() }),
  z.object({ t: z.literal('start') }),
  z.object({ t: z.literal('restart') }),
  z.object({ t: z.literal('early_end'), agree: z.boolean() }),
  z.object({ t: z.literal('vote'), candidateId: z.string().min(1) }),
  z.object({ t: z.literal('config'), patch: roomConfigPatchSchema }),
  z.object({ t: z.literal('ping') }),
]);

export type C2S = z.infer<typeof c2sSchema>;

export interface PublicPlayer {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
  connected: boolean;
  ready: boolean;
}

export interface RoomSnapshot {
  you: string;
  serverNow: number;
  phase: Phase;
  phaseEndsAt: number | null;
  hostId: string;
  config: z.infer<typeof roomConfigSchema>;
  players: PublicPlayer[];
  round: {
    n: number;
    kind: 'normal' | 'tiebreak' | 'replay';
    topic: Topic | null;
    votableIds: string[];
    earlyEndAgreed: string[];
    votedCount: number;
    eligibleVoters: number;
    myVote: string | null;
    tally: Record<string, number> | null;
  } | null;
  winnerId: string | null;
}

export type S2C =
  | { t: 'state'; state: RoomSnapshot }
  | { t: 'error'; code: 'BAD_PHASE' | 'FORBIDDEN' | 'ROOM_FULL' | 'INVALID'; msg: string }
  | { t: 'closed'; msg: string }
  | { t: 'pong' };
