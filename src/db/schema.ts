import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: text('id').primaryKey(), // Using Solana wallet address as the primary key string
    username: text('username'),
    avatarUrl: text('avatar_url'),
    wins: integer('wins').default(0),
    losses: integer('losses').default(0),
    totalEarnings: real('total_earnings').default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
