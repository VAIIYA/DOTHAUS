import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export async function POST(req: NextRequest) {
    try {
        const { walletAddress, signature, message } = await req.json();

        if (!walletAddress || !signature || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify signature
        try {
            const isVerified = nacl.sign.detached.verify(
                new TextEncoder().encode(message),
                bs58.decode(signature),
                bs58.decode(walletAddress)
            );

            if (!isVerified) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
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
