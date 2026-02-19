"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface RoomCardProps {
    id: string;
    price: number;
    players: number;
    maxPlayers: number;
    status: "OPEN" | "FULL" | "PLAYING";
    onJoin: (roomId: string, price: number) => void;
}

export const RoomCard = ({ id, price, players, maxPlayers, status, onJoin }: RoomCardProps) => {
    const { connected } = useWallet();

    const handleJoin = useCallback(() => {
        if (!connected) return;
        onJoin(id, price);
    }, [connected, onJoin, id, price]);

    const isFull = players >= maxPlayers;
    const isOpen = status === "OPEN" && !isFull;

    return (
        <div className="relative group p-6 rounded-2xl glass-panel hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between min-h-[200px]">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/0 to-plasma-purple/0 group-hover:from-neon-blue/10 group-hover:to-plasma-purple/10 rounded-2xl transition-all duration-300" />

            {/* Header */}
            <div className="relative z-10 flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-3xl font-black italic font-heading text-white">
                        {price} <span className="text-base font-bold text-neon-blue">USDC</span>
                    </h3>
                    <p className="text-starlight/60 text-xs uppercase tracking-widest mt-1">Entry Fee</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isOpen ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                    {status}
                </div>
            </div>

            {/* Body */}
            <div className="relative z-10 space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-sm font-bold text-starlight/80">
                        <span>Players</span>
                        <span>{players} / {maxPlayers}</span>
                    </div>
                    <div className="w-full h-2 bg-deep-space rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.5)] transition-all duration-500"
                            style={{ width: `${(players / maxPlayers) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Action */}
                <div className="pt-2">
                    {connected ? (
                        <button
                            onClick={handleJoin}
                            disabled={!isOpen}
                            className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all duration-200 ${isOpen
                                    ? "bg-neon-blue text-deep-space hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                                    : "bg-white/5 text-starlight/30 cursor-not-allowed"
                                }`}
                        >
                            {isOpen ? "Join Room" : "Spectate"}
                        </button>
                    ) : (
                        <div className="opacity-80 hover:opacity-100 transition-opacity">
                            <WalletMultiButton style={{ width: '100%', justifyContent: 'center', backgroundColor: '#bc13fe' }} />
                        </div>

                    )}
                </div>
            </div>
        </div>
    );
};
