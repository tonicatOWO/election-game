import type { RoomSnapshot } from 'shared/protocol';

const apiPrefix = import.meta.env.VITE_API_PREFIX ?? '/api';

export async function createRoom() {
  const res = await fetch(`${apiPrefix}/rooms`, { method: 'POST', credentials: 'same-origin' });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { roomId: string; state: RoomSnapshot };
}

export async function joinRoom(roomId: string, name?: string) {
  const res = await fetch(`${apiPrefix}/rooms/${roomId}/join`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: name || undefined }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    roomId: string;
    state: RoomSnapshot;
    lkUrl: string;
    voiceToken: string | null;
  };
}
