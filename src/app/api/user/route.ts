import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';

export async function POST(req: NextRequest) {
    try {
        const { walletAddress } = await req.json();

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const user = await UserService.getOrCreateUser(walletAddress);
        return NextResponse.json(user);
    } catch (error) {
        console.error('Error in user API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const walletAddress = searchParams.get('walletAddress');

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const user = await UserService.getUserProfile(walletAddress);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error in user API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
