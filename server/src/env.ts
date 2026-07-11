export const env = {
  port: Number(process.env.PORT ?? 3000),
  dbPath: process.env.DB_PATH ?? './data/game.db',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-change-me',
  discordClientId: process.env.DISCORD_CLIENT_ID,
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
  livekitApiKey: process.env.LIVEKIT_API_KEY,
  livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  livekitWsUrl: process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880',
};
