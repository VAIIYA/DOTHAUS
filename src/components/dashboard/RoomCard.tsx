"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { isRoomJoinable } from "@/lib/game/room-status";

interface RoomCardProps {
    id: string;
    name?: string;
    price: number;
    players: number;
    maxPlayers: number;
    status: "WAITING" | "STARTING" | "ACTIVE" | "ENDED";
    isLobby?: boolean;
    region?: string;
    updatedAt?: string;
    onJoin: (roomId: string, price: number, spectate?: boolean) => void;
}

export const RoomCard = ({ id, name, price, players, maxPlayers, status, isLobby, region, updatedAt, onJoin }: RoomCardProps) => {
    const { connected } = useWallet();

    const handleJoin = useCallback(() => {
        onJoin(id, price);
    }, [onJoin, id, price]);
    const handleSpectate = useCallback(() => {
        onJoin(id, price, true);
    }, [onJoin, id, price]);

    const isOpen = isRoomJoinable({ status, isLobby: !!isLobby, players, maxPlayers });
    const statusLabel = isLobby ? "ACTIVE" : status;

    const cardStyles = isLobby
        ? "bg-gradient-to-br from-plasma-purple/20 to-neon-blue/20 border-plasma-purple/30 hover:border-neon-blue/50"
        : "glass-panel hover:bg-white/5";

    const glowStyles = isLobby
        ? "group-hover:from-plasma-purple/30 group-hover:to-neon-blue/30"
        : "group-hover:from-neon-blue/10 group-hover:to-plasma-purple/10";

    return (
        <div className={`relative group p-8 rounded-3xl transition-all duration-500 hover:scale-[1.02] flex flex-col md:flex-row items-center justify-between gap-8 border ${cardStyles}`}>
            {/* Glow Effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent rounded-3xl transition-all duration-500 ${glowStyles}`} />

            <div className="relative z-10 flex flex-col md:flex-row flex-1 items-center gap-8 w-full">
                {/* Visual Icon/Badge */}
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${isLobby ? "bg-plasma-purple/20 text-plasma-purple" : "bg-neon-blue/20 text-neon-blue"}`}>
                    <span className="text-4xl font-black italic tracking-tighter">
                        {isLobby ? "P" : price}
                    </span>
                </div>

                {/* Info Section */}
                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                        <h3 className="text-3xl md:text-4xl font-black italic font-heading text-white tracking-tight uppercase">
                            {isLobby ? name : `${price} USDC`}
                        </h3>
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest self-center md:self-auto ${isOpen ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                            {statusLabel}
                        </div>
                    </div>
                    <p className="text-starlight/40 text-sm uppercase tracking-[0.2em] font-bold">
                        {isLobby ? "Join anytime • Play freely • No Stakes" : "Competitive Arena • Winner takes all"}
                    </p>
                    <p className="text-starlight/30 text-[10px] uppercase tracking-[0.2em] mt-2">
                        {region || "Auto"} · {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "Live"}
                    </p>
                </div>

                {/* Progress Section */}
                <div className="w-full md:w-48 space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-starlight/60">
                        <span>Players</span>
                        <span className={players >= maxPlayers ? "text-red-400" : "text-neon-blue"}>
                            {players} / {maxPlayers}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-void-black/50 rounded-full overflow-hidden border border-white/5 p-[2px]">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isLobby ? "bg-plasma-purple shadow-[0_0_15px_rgba(188,19,254,0.5)]" : "bg-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.5)]"}`}
                            style={{ width: `${(players / maxPlayers) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Action Section */}
            <div className="relative z-10 shrink-0 w-full md:w-auto">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button
                        onClick={handleJoin}
                        disabled={!isOpen}
                        className={`w-full md:px-10 py-4 rounded-xl font-black uppercase tracking-[0.15em] transition-all duration-300 transform active:scale-95 ${isOpen
                            ? isLobby
                                ? "bg-plasma-purple text-white hover:bg-white hover:text-plasma-purple hover:shadow-[0_0_30px_rgba(188,19,254,0.4)]"
                                : "bg-neon-blue text-deep-space hover:bg-white hover:shadow-[0_0_30px_rgba(0,243,255,0.4)]"
                            : "bg-white/5 text-starlight/20 cursor-not-allowed grayscale"
                            }`}
                    >
                        {isOpen ? (isLobby ? "Enter Practice" : connected ? "Join Arena" : "Play as Guest") : "Unavailable"}
                    </button>
                    {!isOpen && (
                        <button
                            onClick={handleSpectate}
                            className="w-full md:px-10 py-3 rounded-xl border border-neon-blue/40 text-neon-blue font-black uppercase tracking-[0.15em]"
                        >
                            Spectate
                        </button>
                    )}
                    {!connected && (
                        <div className="opacity-90 hover:opacity-100 transition-opacity transform hover:scale-[1.02]">
                        <WalletMultiButton style={{
                            width: '100%',
                            height: '48px',
                            justifyContent: 'center',
                            backgroundColor: '#bc13fe',
                            borderRadius: '12px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em'
                        }} />
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
};
