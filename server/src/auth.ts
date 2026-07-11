import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { anonymous } from 'better-auth/plugins';
import { db } from './db';
import { env } from './env';

const socialProviders =
  env.discordClientId && env.discordClientSecret
    ? {
        discord: {
          clientId: env.discordClientId,
          clientSecret: env.discordClientSecret,
        },
      }
    : {};

export const auth = betterAuth({
  baseURL: env.baseUrl,
  secret: env.betterAuthSecret,
  trustedOrigins: [
    env.baseUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  socialProviders,
  plugins: [anonymous()],
});

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
