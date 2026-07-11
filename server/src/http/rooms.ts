import { Hono } from 'hono';
import { z } from 'zod';
import { createRoom, getRoom, joinRoom as joinGameRoom, snapshotFor } from '../game/room';
import { issueVoiceToken } from '../voice/livekit';
import { requireSession, sessionUser } from './session';
import { env } from '../env';

const joinSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
});

export const roomsRoute = new Hono();

roomsRoute.use('*', requireSession);

roomsRoute.post('/', (c) => {
  const user = sessionUser(c);
  const room = createRoom(user);
  return c.json({ roomId: room.id, state: snapshotFor(room, user.id) });
});

roomsRoute.get('/:id', (c) => {
  const user = sessionUser(c);
  const room = getRoom(c.req.param('id'));
  if (!room) return c.json({ error: 'not_found' }, 404);
  return c.json({ state: snapshotFor(room, user.id) });
});

roomsRoute.post('/:id/join', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid' }, 400);

  const joined = joinGameRoom(c.req.param('id'), sessionUser(c), parsed.data.name);
  if (!joined) return c.json({ error: 'not_found' }, 404);

  const voiceToken = await issueVoiceToken(joined.room.id, joined.player);
  return c.json({
    roomId: joined.room.id,
    state: snapshotFor(joined.room, joined.player.id),
    lkUrl: env.livekitWsUrl,
    voiceToken,
  });
});
