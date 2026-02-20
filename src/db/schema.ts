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

export const authNonces = sqliteTable('auth_nonces', {
    nonce: text('nonce').primaryKey(),
    walletAddress: text('wallet_address').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthNonce = typeof authNonces.$inferSelect;
