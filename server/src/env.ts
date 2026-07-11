function list(key: string, fallback: string[]): string[] {
  const raw = process.env[key];
  return raw ? raw.split(',').map((s) => s.trim()) : fallback;
}

export const env = {
  // Server binding
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),

  // Route paths
  apiPrefix: process.env.API_PREFIX ?? '/api',
  wsPath: process.env.WS_PATH ?? '/ws',
  healthPath: process.env.HEALTH_PATH ?? '/healthz',

  // Database
  dbPath: process.env.DB_PATH ?? './data/game.db',

  // Auth
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-change-me',
  trustedOrigins: list('TRUSTED_ORIGINS', []),

  // Social login (optional)
  discordClientId: process.env.DISCORD_CLIENT_ID,
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET,

  // LiveKit voice
  livekitApiKey: process.env.LIVEKIT_API_KEY,
  livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  livekitWsUrl: process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880',
};
