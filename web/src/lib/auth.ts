import { createAuthClient } from 'better-auth/svelte';
import { anonymousClient } from 'better-auth/client/plugins';

const apiPrefix = import.meta.env.VITE_API_PREFIX ?? '/api';

export const authClient = createAuthClient({
  baseURL: `${globalThis.location?.origin ?? ''}${apiPrefix}/auth`,
  plugins: [anonymousClient()],
});

export async function ensureAnonymousSession() {
  const current = await fetch(`${apiPrefix}/auth/get-session`, {
    credentials: 'same-origin',
  });
  if (current.ok && (await current.json())) return;

  const res = await fetch(`${apiPrefix}/auth/sign-in/anonymous`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}
