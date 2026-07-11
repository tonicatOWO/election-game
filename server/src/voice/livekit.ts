import { AccessToken } from 'livekit-server-sdk';
import type { Player } from '../game/room';
import { env } from '../env';

export async function issueVoiceToken(roomId: string, player: Player) {
  if (!env.livekitApiKey || !env.livekitApiSecret) return null;

  const token = new AccessToken(env.livekitApiKey, env.livekitApiSecret, {
    identity: player.id,
    name: player.name,
    ttl: '2h',
  });
  token.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: player.role === 'candidate' && player.alive,
    canSubscribe: true,
  });
  return await token.toJwt();
}
