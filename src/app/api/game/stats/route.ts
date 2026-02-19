import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';

export async function POST(req: NextRequest) {
    try {
        const { walletAddress, wins, losses, totalEarnings, secret } = await req.json();

        if (secret !== process.env.INTERNAL_API_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        await UserService.updateUserStats(walletAddress, {
            wins: wins || 0,
            losses: losses || 0,
            totalEarnings: totalEarnings || 0,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
