import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { normalizeStatDelta } from '@/lib/stats/normalization';

export async function POST(req: NextRequest) {
    try {
        const internalHeader = req.headers.get('x-internal-api-key');
        if (!internalHeader || internalHeader !== process.env.INTERNAL_API_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { walletAddress, wins, losses, totalEarnings } = await req.json();

        if (!walletAddress || typeof walletAddress !== 'string') {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const normalizedWins = normalizeStatDelta(wins);
        const normalizedLosses = normalizeStatDelta(losses);
        const normalizedEarnings = normalizeStatDelta(totalEarnings);

        await UserService.updateUserStats(walletAddress, {
            wins: normalizedWins,
            losses: normalizedLosses,
            totalEarnings: normalizedEarnings,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
