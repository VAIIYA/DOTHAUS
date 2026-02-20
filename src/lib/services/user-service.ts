import { db } from '../../db';
import { users, type User, type NewUser } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

export class UserService {
    static async getOrCreateUser(walletAddress: string): Promise<User> {
        const newUser: NewUser = {
            id: walletAddress,
            username: `User_${walletAddress.slice(0, 6)}`,
        };

        await db.insert(users).values(newUser).onConflictDoNothing().run();

        const user = await db.select().from(users).where(eq(users.id, walletAddress)).get();
        if (!user) {
            throw new Error('Failed to load user after create');
        }
        return user;
    }

    static async updateUserStats(walletAddress: string, stats: Partial<Pick<User, 'wins' | 'losses' | 'totalEarnings'>>) {
        await this.getOrCreateUser(walletAddress);

        const winsDelta = stats.wins || 0;
        const lossesDelta = stats.losses || 0;
        const earningsDelta = stats.totalEarnings || 0;

        await db.update(users)
            .set({
                wins: sql`coalesce(${users.wins}, 0) + ${winsDelta}`,
                losses: sql`coalesce(${users.losses}, 0) + ${lossesDelta}`,
                totalEarnings: sql`coalesce(${users.totalEarnings}, 0) + ${earningsDelta}`,
                updatedAt: new Date(),
            })
            .where(eq(users.id, walletAddress))
            .run();
    }

    static async getUserProfile(walletAddress: string): Promise<User | undefined> {
        return await db.select().from(users).where(eq(users.id, walletAddress)).get();
    }
}
