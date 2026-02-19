import { db } from '../../db';
import { users, type User, type NewUser } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class UserService {
    static async getOrCreateUser(walletAddress: string): Promise<User> {
        const existingUser = await db.select().from(users).where(eq(users.id, walletAddress)).get();

        if (existingUser) {
            return existingUser;
        }

        const newUser: NewUser = {
            id: walletAddress,
            username: `User_${walletAddress.slice(0, 6)}`,
        };

        const result = await db.insert(users).values(newUser).returning().get();
        return result;
    }

    static async updateUserStats(walletAddress: string, stats: Partial<Pick<User, 'wins' | 'losses' | 'totalEarnings'>>) {
        const existingUser = await this.getOrCreateUser(walletAddress);

        await db.update(users)
            .set({
                wins: (existingUser.wins || 0) + (stats.wins || 0),
                losses: (existingUser.losses || 0) + (stats.losses || 0),
                totalEarnings: (Number(existingUser.totalEarnings) || 0) + (stats.totalEarnings || 0),
                updatedAt: new Date(),
            })
            .where(eq(users.id, walletAddress))
            .run();
    }

    static async getUserProfile(walletAddress: string): Promise<User | undefined> {
        return await db.select().from(users).where(eq(users.id, walletAddress)).get();
    }
}
