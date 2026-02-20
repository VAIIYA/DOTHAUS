"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef } from "react";
import { setUser, setAuthenticating } from "@/lib/store";
import bs58 from "bs58";

export const UserProfileSync = () => {
    const { publicKey, connected, signMessage } = useWallet();
    const isSyncing = useRef(false);

    useEffect(() => {
        if (connected && publicKey && signMessage && !isSyncing.current) {
            const syncUser = async () => {
                isSyncing.current = true;
                setAuthenticating(true);
                try {
                    const nonceResponse = await fetch('/api/user/nonce', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            walletAddress: publicKey.toBase58(),
                        }),
                    });

                    if (!nonceResponse.ok) {
                        throw new Error('Failed to fetch authentication nonce');
                    }

                    const noncePayload = await nonceResponse.json();
                    const message = noncePayload.message as string;
                    const encodedMessage = new TextEncoder().encode(message);
                    const signature = await signMessage(encodedMessage);
                    const signatureBase58 = bs58.encode(signature);

                    const response = await fetch('/api/user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            walletAddress: publicKey.toBase58(),
                            signature: signatureBase58,
                            message: message,
                            nonce: noncePayload.nonce,
                        }),
                    });

                    if (!response.ok) {
                        console.error('Failed to sync user profile');
                    } else {
                        const userData = await response.json();
                        console.log('User profile synced:', userData);
                        setUser(userData);
                    }
                } catch (error) {
                    console.error('Error syncing user profile:', error);
                } finally {
                    isSyncing.current = false;
                    setAuthenticating(false);
                }
            };

            syncUser();
        }
    }, [connected, publicKey, signMessage]);

    return null;
};
