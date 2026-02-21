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
        ? "bg-white shadow-sm border border-gray-200"
        : "bg-white shadow-sm border border-gray-100 hover:border-vaiiya-orange/50 hover:shadow-md";

    const glowStyles = "hidden"; // Removed glow layer

    return (
        <div className={`relative group p-8 rounded-3xl transition-all duration-500 hover:scale-[1.02] flex flex-col ${isLobby ? "md:flex-row" : ""} items-center justify-between gap-8 ${cardStyles}`}>
            {/* Glow Effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent rounded-3xl transition-all duration-500 ${glowStyles}`} />

            <div className={`relative z-10 flex flex-col ${isLobby ? "md:flex-row" : ""} flex-1 items-center gap-8 w-full`}>
                {/* Visual Icon/Badge */}
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${isLobby ? "bg-vaiiya-orange/10 text-vaiiya-orange" : "bg-gray-100 text-vaiiya-indigo"}`}>
                    <span className="text-4xl font-black tracking-tight">
                        {isLobby ? "P" : price}
                    </span>
                </div>

                {/* Info Section */}
                <div className={`flex-1 text-center ${isLobby ? "md:text-left" : ""}`}>
                    <div className={`flex flex-col ${isLobby ? "md:flex-row md:items-center" : "items-center"} gap-3 mb-2`}>
                        <h3 className="text-3xl md:text-4xl font-bold font-serif text-vaiiya-indigo tracking-tight">
                            {isLobby ? name : `${price} USDC`}
                        </h3>
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-center md:self-auto ${isOpen ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                            }`}>
                            {statusLabel}
                        </div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">
                        {isLobby ? "Join anytime • Play freely • No Stakes" : "Competitive Arena • Winner takes all"}
                    </p>
                    <p className="text-gray-400 text-xs mt-2 uppercase tracking-wide">
                        {region || "Auto"} · {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "Live"}
                    </p>
                </div>

                {/* Progress Section */}
                <div className="w-full md:w-48 space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                        <span>Players</span>
                        <span className={players >= maxPlayers ? "text-red-500" : "text-vaiiya-indigo"}>
                            {players} / {maxPlayers}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out bg-vaiiya-orange`}
                            style={{ width: `${(players / maxPlayers) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Action Section */}
            <div className={`relative z-10 shrink-0 w-full ${isLobby ? "md:w-auto" : ""}`}>
                <div className={`flex flex-col gap-2 w-full ${isLobby ? "md:w-auto" : ""}`}>
                    <button
                        onClick={handleJoin}
                        disabled={!isOpen}
                        className={`w-full md:px-10 py-4 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${isOpen
                            ? isLobby
                                ? "bg-vaiiya-orange text-white hover:bg-orange-600 hover:shadow-md"
                                : "bg-vaiiya-indigo text-white hover:bg-purple-900 hover:shadow-md"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        {isOpen ? (isLobby ? "Enter Practice" : connected ? "Join Arena" : "Play as Guest") : "Unavailable"}
                    </button>
                    {!isOpen && (
                        <button
                            onClick={handleSpectate}
                            className="w-full md:px-10 py-3 rounded-full border-2 border-vaiiya-indigo text-vaiiya-indigo font-bold uppercase tracking-wider hover:bg-gray-50"
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
                                backgroundColor: '#FF5C16', // Vaiiya Orange
                                borderRadius: '9999px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
