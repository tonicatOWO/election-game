import { createAuthClient } from 'better-auth/svelte';
import { anonymousClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: `${globalThis.location?.origin ?? ''}/api/auth`,
  plugins: [anonymousClient()],
});

export async function ensureAnonymousSession() {
  const current = await fetch('/api/auth/get-session', {
    credentials: 'same-origin',
  });
  if (current.ok && (await current.json())) return;

  const res = await fetch('/api/auth/sign-in/anonymous', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}
