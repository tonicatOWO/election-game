import type { Server, ServerWebSocket } from 'bun';
import { c2sSchema, type S2C } from 'shared/protocol';
import {
  attachSocket,
  detachSocket,
  getRoom,
  patchConfig,
  restartRoom,
  setReady,
  setEarlyEnd,
  setRole,
  snapshotFor,
  startRoom,
  vote,
  type WsData,
} from '../game/room';

let publisher: Pick<Server<WsData>, 'publish'> | null = null;

export function setPublisher(server: Pick<Server<WsData>, 'publish'>) {
  publisher = server;
}

export function onOpen(ws: ServerWebSocket<WsData>) {
  const room = getRoom(ws.data.roomId);
  if (!room || !attachSocket(room, ws.data.userId, ws)) {
    ws.close(4000, 'room not joined');
    return;
  }
  ws.subscribe(room.id);
  broadcast(room.id);
}

export function onMessage(ws: ServerWebSocket<WsData>, raw: string | Buffer) {
  const room = getRoom(ws.data.roomId);
  if (!room) {
    send(ws, { t: 'error', code: 'INVALID', msg: 'Room not found' });
    return;
  }

  const parsed = c2sSchema.safeParse(safeJson(raw));
  if (!parsed.success) {
    send(ws, { t: 'error', code: 'INVALID', msg: 'Invalid message' });
    return;
  }

  const userId = ws.data.userId;
  const msg = parsed.data;
  let result: { ok: true } | { ok: false; code: S2C extends infer _ ? 'BAD_PHASE' | 'FORBIDDEN' | 'ROOM_FULL' | 'INVALID' : never };

  switch (msg.t) {
    case 'set_role':
      result = setRole(room, userId, msg.role);
      break;
    case 'ready':
      result = setReady(room, userId, msg.ready);
      break;
    case 'start':
      result = startRoom(room, userId);
      break;
    case 'restart':
      result = restartRoom(room, userId);
      break;
    case 'early_end':
      result = setEarlyEnd(room, userId, msg.agree);
      break;
    case 'vote':
      result = vote(room, userId, msg.candidateId);
      break;
    case 'config':
      result = patchConfig(room, userId, msg.patch);
      break;
    case 'ping':
      send(ws, { t: 'pong' });
      return;
    default:
      result = { ok: false, code: room.phase === 'lobby' ? 'BAD_PHASE' : 'INVALID' };
      break;
  }

  if (!result.ok) {
    send(ws, { t: 'error', code: result.code, msg: result.code });
    return;
  }
  broadcast(room.id);
}

export function onClose(ws: ServerWebSocket<WsData>) {
  const room = getRoom(ws.data.roomId);
  if (!room) return;
  detachSocket(room, ws.data.userId, ws);
  broadcast(room.id);
}

export function broadcast(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return;

  for (const player of room.players.values()) {
    const msg: S2C = { t: 'state', state: snapshotFor(room, player.id) };
    const payload = JSON.stringify(msg);
    if (player.ws) {
      player.ws.send(payload);
    } else {
      publisher?.publish(room.id, payload);
    }
  }
}

function send(ws: ServerWebSocket<WsData>, msg: S2C) {
  ws.send(JSON.stringify(msg));
}

function safeJson(raw: string | Buffer) {
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}
