"use client";

import { useEffect, useState } from "react";
import { type User } from "@/db/schema";

export const Leaderboard = () => {
    const [players, setPlayers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch('/api/leaderboard');
                if (response.ok) {
                    const data = await response.json();
                    setPlayers(data);
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) return <div className="text-starlight/50 animate-pulse">Loading rankings...</div>;

    return (
        <div id="leaderboard" className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl">
            <h2 className="text-xl font-black italic tracking-tighter text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-neon-blue rounded-full shadow-[0_0_15px_#00f3ff]" />
                TOP EARNERS
            </h2>

            <div className="space-y-3">
                {players.map((player, index) => (
                    <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${index === 0 ? 'bg-neon-blue/10 border border-neon-blue/20' : 'hover:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <span className={`text-lg font-black w-6 ${index === 0 ? 'text-neon-blue' :
                                index === 1 ? 'text-neon-purple' :
                                    index === 2 ? 'text-neon-pink' : 'text-starlight/30'
                                }`}>
                                #{index + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className="font-bold text-white tracking-tight">
                                    {player.username}
                                </span>
                                <span className="text-[10px] text-starlight/40 font-mono">
                                    {player.id.slice(0, 4)}...{player.id.slice(-4)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="font-black text-neon-blue tracking-tighter">
                                {player.totalEarnings} <span className="text-[8px]">USDC</span>
                            </span>
                            <span className="text-[10px] text-starlight/30 uppercase font-bold">
                                {player.wins} WINS
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
