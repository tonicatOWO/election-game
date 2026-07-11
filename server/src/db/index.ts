import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { env } from '../env';
import * as authSchema from './auth-schema';
import * as gameSchema from './schema';

mkdirSync(dirname(env.dbPath), { recursive: true });

export const sqlite = new Database(env.dbPath);

export const db = drizzle(sqlite, {
  schema: { ...authSchema, ...gameSchema },
});
