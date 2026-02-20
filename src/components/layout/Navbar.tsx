"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/store";
import { getGuestSessionStats, clearGuestSessionStats } from "@/lib/guest-session";
import { trackEvent } from "@/lib/analytics";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export const Navbar = () => {
    const [mounted, setMounted] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [guestStats, setGuestStats] = useState({ wins: 0, losses: 0, totalEarnings: 0 });
    const state = useAppState();

    useEffect(() => {
        setMounted(true);
        setGuestStats(getGuestSessionStats());
    }, []);

    const hasClaimableSession = guestStats.wins > 0 || guestStats.losses > 0 || guestStats.totalEarnings > 0;

    return (
        <nav className="fixed top-0 left-0 w-full z-50 glass-panel border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-neon-blue blur-lg opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative text-2xl font-black italic tracking-tighter text-white font-heading neon-text">
                            DOTHAUS
                        </span>
                    </div>
                </Link>

                {/* Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {["Play", "Rooms", "Leaderboard"].map((item) => (
                        <Link
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="text-sm font-bold uppercase tracking-widest text-starlight/70 hover:text-neon-blue transition-colors duration-300"
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                {/* Wallet Connection */}
                <div className="flex items-center gap-4">
                    {mounted && state.user && hasClaimableSession && (
                        <button
                            disabled={claiming}
                            onClick={async () => {
                                if (!state.user) return;
                                setClaiming(true);
                                try {
                                    const response = await fetch("/api/user/claim-session", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            walletAddress: state.user.id,
                                            wins: guestStats.wins,
                                            losses: guestStats.losses,
                                            totalEarnings: guestStats.totalEarnings,
                                        }),
                                    });
                                    if (!response.ok) throw new Error("Claim failed");
                                    clearGuestSessionStats();
                                    setGuestStats({ wins: 0, losses: 0, totalEarnings: 0 });
                                    trackEvent("session_claimed", { walletAddress: state.user.id });
                                } catch (error) {
                                    console.error("Failed to claim guest session stats", error);
                                } finally {
                                    setClaiming(false);
                                }
                            }}
                            className="hidden md:inline-flex items-center justify-center px-3 py-2 rounded-lg bg-neon-blue text-deep-space text-xs font-black uppercase tracking-wider disabled:opacity-60"
                        >
                            {claiming ? "Claiming..." : `Claim ${guestStats.wins}W/${guestStats.losses}L`}
                        </button>
                    )}
                    <InstallPrompt />
                    {mounted && state.user && (
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-xs font-bold text-neon-blue uppercase tracking-tighter">
                                {state.user.username}
                            </span>
                            <span className="text-[10px] text-starlight/50">
                                {state.user.totalEarnings} USDC
                            </span>
                        </div>
                    )}
                    <div className="relative">
                        {mounted && <WalletMultiButton style={{ backgroundColor: '#bc13fe', fontFamily: 'var(--font-inter)', fontWeight: 'bold' }} />}
                    </div>
                </div>
            </div>
        </nav>
    );
};
