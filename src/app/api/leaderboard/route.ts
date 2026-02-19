import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const topUsers = await db.select()
            .from(users)
            .orderBy(desc(users.totalEarnings))
            .limit(10)
            .all();

        return NextResponse.json(topUsers);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
