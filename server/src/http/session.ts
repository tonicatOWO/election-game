import type { Context, Next } from 'hono';
import { auth } from '../auth';

export async function getSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

export async function requireSession(c: Context, next: Next) {
  const session = await getSession(c.req.raw.headers);
  if (!session) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  c.set('session', session);
  await next();
}

export function sessionUser(c: Context) {
  const session = c.get('session') as NonNullable<Awaited<ReturnType<typeof getSession>>>;
  return session.user;
}
