import { Hono } from 'hono';
import { auth } from './auth';
import { env } from './env';
import { getSession } from './http/session';
import { roomsRoute } from './http/rooms';
import { broadcast, onClose, onMessage, onOpen, setPublisher } from './ws/handler';
import { closeRoom, type WsData } from './game/room';
import { setFsmFinalizer, setFsmNotifier } from './game/fsm';

const app = new Hono();

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
app.route('/api/rooms', roomsRoute);
app.get('/healthz', (c) => c.json({ ok: true }));

const server = Bun.serve<WsData>({
  port: env.port,
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const session = await getSession(req.headers);
      if (!session) return new Response('unauthorized', { status: 401 });

      const roomId = url.searchParams.get('room');
      if (!roomId) return new Response('room required', { status: 400 });

      const ok = server.upgrade(req, {
        data: { roomId, userId: session.user.id },
      });
      return ok ? undefined : new Response('upgrade failed', { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open: onOpen,
    message: onMessage,
    close: onClose,
  },
});

setPublisher(server);
setFsmNotifier(broadcast);
setFsmFinalizer(closeRoom);
console.log(`Campaign Sim server listening on http://localhost:${server.port}`);
