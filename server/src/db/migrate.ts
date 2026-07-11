import { join } from 'node:path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db, sqlite } from './index';

const migrationsFolder = join(import.meta.dir, '..', '..', 'drizzle');
migrate(db, { migrationsFolder });
sqlite.close();
console.log('Migrations applied');
