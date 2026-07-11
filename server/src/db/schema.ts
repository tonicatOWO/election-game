import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { RoomConfig } from 'shared/config';
import { user } from './auth-schema';

export const topics = sqliteTable('topics', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  scenario: text('scenario').notNull(),
  tags: text('tags', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
});

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  config: text('config', { mode: 'json' }).$type<RoomConfig>().notNull(),
  winnerUserId: text('winner_user_id').references(() => user.id),
});

export const matchRounds = sqliteTable(
  'match_rounds',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id),
    n: integer('n').notNull(),
    kind: text('kind', { enum: ['normal', 'tiebreak', 'replay'] }).notNull(),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id),
    tally: text('tally', { mode: 'json' }).$type<Record<string, number>>().notNull(),
    eliminatedUserId: text('eliminated_user_id'),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.n] })],
);
