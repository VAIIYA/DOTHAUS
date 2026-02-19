"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef } from "react";

export const UserProfileSync = () => {
    const { publicKey, connected } = useWallet();
    const isSyncing = useRef(false);

    useEffect(() => {
        if (connected && publicKey && !isSyncing.current) {
            const syncUser = async () => {
                isSyncing.current = true;
                try {
                    const response = await fetch('/api/user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            walletAddress: publicKey.toBase58(),
                        }),
                    });

                    if (!response.ok) {
                        console.error('Failed to sync user profile');
                    } else {
                        const userData = await response.json();
                        console.log('User profile synced:', userData);
                    }
                } catch (error) {
                    console.error('Error syncing user profile:', error);
                } finally {
                    isSyncing.current = false;
                }
            };

            syncUser();
        }
    }, [connected, publicKey]);

    return null;
};
