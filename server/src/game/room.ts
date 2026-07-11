import { nanoid } from 'nanoid';
import type { ServerWebSocket } from 'bun';
import { DEFAULT_CONFIG, roomConfigPatchSchema, type RoomConfig } from 'shared/config';
import type { Phase, PublicPlayer, Role, RoomSnapshot, Topic } from 'shared/protocol';
import { advance, forceVotingIfConsensus, startGame } from './fsm';

export interface WsData {
  roomId: string;
  userId: string;
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  lobbyRole: Role;
  alive: boolean;
  connected: boolean;
  ready: boolean;
  earlyEndAgree: boolean;
  joinedRound: number;
  ws: ServerWebSocket<WsData> | null;
  joinedAt: number;
}

export interface RoundState {
  n: number;
  kind: 'normal' | 'tiebreak' | 'replay';
  topic: Topic | null;
  votableIds: string[];
  votes: Map<string, string>;
  tally: Record<string, number> | null;
}

export interface Room {
  id: string;
  hostId: string;
  phase: Phase;
  phaseEndsAt: number | null;
  config: RoomConfig;
  players: Map<string, Player>;
  round: RoundState | null;
  roundNo: number;
  replayCount: number;
  usedTopicIds: Set<number>;
  timer: ReturnType<typeof setTimeout> | undefined;
  winnerId: string | null;
  createdAt: number;
  updatedAt: number;
}

const rooms = new Map<string, Room>();

function makeRoom(host: { id: string; name?: string | null }) {
  const id = nanoid(10);
  const room: Room = {
    id,
    hostId: host.id,
    phase: 'lobby',
    phaseEndsAt: null,
    config: { ...DEFAULT_CONFIG },
    players: new Map(),
    round: null,
    roundNo: 0,
    replayCount: 0,
    usedTopicIds: new Set(),
    timer: undefined,
    winnerId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  room.players.set(host.id, makePlayer(host, 'candidate', 0));
  rooms.set(id, room);
  return room;
}

function makePlayer(
  user: { id: string; name?: string | null },
  role: Role,
  joinedRound: number,
): Player {
  return {
    id: user.id,
    name: user.name?.trim() || 'Guest',
    role,
    lobbyRole: role,
    alive: true,
    connected: false,
    ready: false,
    earlyEndAgree: false,
    joinedRound,
    ws: null,
    joinedAt: Date.now(),
  };
}

export function createRoom(user: { id: string; name?: string | null }) {
  return makeRoom(user);
}

export function getRoom(roomId: string) {
  return rooms.get(roomId) ?? null;
}

export function closeRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  clearTimeout(room.timer);
  const payload = JSON.stringify({ t: 'closed', msg: '房間已關閉' });
  for (const player of room.players.values()) {
    player.ws?.send(payload);
    player.ws?.close(4000, 'room closed');
    player.ws = null;
    player.connected = false;
  }
  rooms.delete(roomId);
}

export function joinRoom(roomId: string, user: { id: string; name?: string | null }, name?: string) {
  const room = getRoom(roomId);
  if (!room) return null;

  const existing = room.players.get(user.id);
  if (existing) {
    if (name?.trim()) existing.name = name.trim().slice(0, 40);
    room.updatedAt = Date.now();
    return { room, player: existing };
  }

  const candidates = [...room.players.values()].filter((p) => p.role === 'candidate').length;
  const role: Role = candidates < room.config.maxCandidates ? 'candidate' : 'voter';
  const player = makePlayer({ ...user, name: name ?? user.name }, role, room.roundNo);
  room.players.set(user.id, player);
  room.updatedAt = Date.now();
  return { room, player };
}

export function attachSocket(room: Room, userId: string, ws: ServerWebSocket<WsData>) {
  const player = room.players.get(userId);
  if (!player) return false;
  player.ws?.close(4001, 'superseded');
  player.ws = ws;
  player.connected = true;
  room.updatedAt = Date.now();
  return true;
}

export function detachSocket(room: Room, userId: string, ws: ServerWebSocket<WsData>) {
  const player = room.players.get(userId);
  if (!player || player.ws !== ws) return;
  player.ws = null;
  player.connected = false;
  player.earlyEndAgree = false;
  room.updatedAt = Date.now();
  transferHostIfNeeded(room);
}

export function setRole(room: Room, userId: string, role: Role) {
  if (room.phase !== 'lobby') return { ok: false as const, code: 'BAD_PHASE' as const };
  const player = room.players.get(userId);
  if (!player) return { ok: false as const, code: 'FORBIDDEN' as const };
  if (role === 'candidate') {
    const candidates = [...room.players.values()].filter((p) => p.role === 'candidate' && p.id !== userId);
    if (candidates.length >= room.config.maxCandidates) {
      return { ok: false as const, code: 'ROOM_FULL' as const };
    }
  }
  player.role = role;
  player.lobbyRole = role;
  player.alive = true;
  player.ready = false;
  room.updatedAt = Date.now();
  return { ok: true as const };
}

export function setReady(room: Room, userId: string, ready: boolean) {
  if (room.phase !== 'lobby') return { ok: false as const, code: 'BAD_PHASE' as const };
  const player = room.players.get(userId);
  if (!player) return { ok: false as const, code: 'FORBIDDEN' as const };
  player.ready = ready;
  room.updatedAt = Date.now();
  return { ok: true as const };
}

export function patchConfig(room: Room, userId: string, patch: unknown) {
  if (room.phase !== 'lobby') return { ok: false as const, code: 'BAD_PHASE' as const };
  if (room.hostId !== userId) return { ok: false as const, code: 'FORBIDDEN' as const };
  const parsed = roomConfigPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false as const, code: 'INVALID' as const };
  const next = { ...room.config, ...parsed.data };
  if (next.minCandidates > next.maxCandidates) {
    return { ok: false as const, code: 'INVALID' as const };
  }
  room.config = next;
  room.updatedAt = Date.now();
  return { ok: true as const };
}

export function startRoom(room: Room, userId: string) {
  if (room.hostId !== userId) return { ok: false as const, code: 'FORBIDDEN' as const };
  if (room.phase !== 'lobby') return { ok: false as const, code: 'BAD_PHASE' as const };

  const players = [...room.players.values()];
  const candidates = players.filter((p) => p.role === 'candidate');
  const voters = players.filter((p) => p.role === 'voter');
  const allReady = players.every((p) => p.id === room.hostId || p.ready);
  if (
    candidates.length < room.config.minCandidates ||
    voters.length < 1 ||
    !allReady
  ) {
    return { ok: false as const, code: 'INVALID' as const };
  }

  startGame(room);
  room.updatedAt = Date.now();
  return { ok: true as const };
}

export function restartRoom(room: Room, userId: string) {
  if (room.hostId !== userId) return { ok: false as const, code: 'FORBIDDEN' as const };
  if (room.phase !== 'game_over') return { ok: false as const, code: 'BAD_PHASE' as const };
  clearTimeout(room.timer);

  for (const player of room.players.values()) {
    player.role = player.lobbyRole;
    player.alive = true;
    player.ready = player.id === room.hostId;
    player.earlyEndAgree = false;
    player.joinedRound = 0;
  }

  room.phase = 'lobby';
  room.phaseEndsAt = null;
  room.round = null;
  room.roundNo = 0;
  room.replayCount = 0;
  room.usedTopicIds.clear();
  room.winnerId = null;
  room.updatedAt = Date.now();
  return { ok: true as const };
}

export function setEarlyEnd(room: Room, userId: string, agree: boolean) {
  if (room.phase !== 'debate') return { ok: false as const, code: 'BAD_PHASE' as const };
  const player = room.players.get(userId);
  if (!player || player.role !== 'candidate' || !player.alive) {
    return { ok: false as const, code: 'FORBIDDEN' as const };
  }
  player.earlyEndAgree = agree;
  room.updatedAt = Date.now();
  forceVotingIfConsensus(room);
  return { ok: true as const };
}

export function vote(room: Room, userId: string, candidateId: string) {
  if (room.phase !== 'voting' || !room.round) {
    return { ok: false as const, code: 'BAD_PHASE' as const };
  }
  if (!room.round.votableIds.includes(candidateId)) {
    return { ok: false as const, code: 'INVALID' as const };
  }
  if (!eligibleVoters(room).some((p) => p.id === userId)) {
    return { ok: false as const, code: 'FORBIDDEN' as const };
  }

  room.round.votes.set(userId, candidateId);
  room.updatedAt = Date.now();
  if (room.round.votes.size >= eligibleVoters(room).length) {
    advance(room);
  }
  return { ok: true as const };
}

export function snapshotFor(room: Room, viewerId: string): RoomSnapshot {
  const round = room.round
    ? {
        n: room.round.n,
        kind: room.round.kind,
        topic: room.round.topic,
        votableIds: room.round.votableIds,
        earlyEndAgreed: [...room.players.values()]
          .filter((p) => p.earlyEndAgree)
          .map((p) => p.id),
        votedCount: room.round.votes.size,
        eligibleVoters: eligibleVoters(room).length,
        myVote: room.round.votes.get(viewerId) ?? null,
        tally: room.round.tally,
      }
    : null;

  return {
    you: viewerId,
    serverNow: Date.now(),
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    hostId: room.hostId,
    config: room.config,
    players: publicPlayers(room),
    round,
    winnerId: room.winnerId,
  };
}

export function publicPlayers(room: Room): PublicPlayer[] {
  return [...room.players.values()]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      alive: p.alive,
      connected: p.connected,
      ready: p.ready,
    }));
}

export function eligibleVoters(room: Room) {
  if (!room.round) return [];
  return [...room.players.values()].filter((p) => {
    if (p.role === 'candidate' && p.alive) return false;
    if (!room.config.eliminatedCanVote && p.role === 'candidate') return false;
    if (room.config.midJoinVotesNextRound && p.joinedRound >= room.round!.n) return false;
    return true;
  });
}

function transferHostIfNeeded(room: Room) {
  const host = room.players.get(room.hostId);
  if (host?.connected) return;
  const next = [...room.players.values()]
    .filter((p) => p.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  if (next) room.hostId = next.id;
}
